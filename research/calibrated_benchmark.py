"""Leakage-aware model comparison using real observed historical returns.

Usage:
  python -m research.calibrated_benchmark --prices local-data/us-2y.csv
  python -m research.calibrated_benchmark --prices local-data/us-2y.csv --events independent-events.csv

Calibration uses 50% model fit, 20% alert-budget tuning, and 30% untouched
evaluation by default. No test labels enter threshold selection. Without
independent event annotations the report includes alert burdens, NOT F1.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from .baselines import cusum_alerts
from .bcpd import fit_settings, online_probabilities
from .benchmark import (
    event_metrics, read_event_labels, read_prices, sha256,
    threshold_alerts, variance_shift_scores, weekly_log_returns,
)
from .calibration import select_threshold

MODELS = ("bcpd", "rolling_variance", "two_sided_cusum")


def run(
    prices: Path,
    events: Path | None = None,
    *,
    fit_fraction: float = 0.5,
    test_fraction: float = 0.7,
    annual_alert_budget: float = 6.0,
    hazard_weeks: int = 32,
    variance_window_weeks: int = 12,
    tolerance_weeks: int = 2,
) -> dict:
    if not (0.35 <= fit_fraction < test_fraction <= 0.8):
        raise ValueError("Require fit fraction >=0.35 and test fraction <=0.8")
    if tolerance_weeks < 0 or tolerance_weeks > 12:
        raise ValueError("Event tolerance must be 0 to 12 weeks")
    observations = weekly_log_returns(read_prices(prices))
    n = len(observations)
    fit_end = int(n * fit_fraction)
    test_start = int(n * test_fraction)
    if fit_end < max(30, 2 * variance_window_weeks) or test_start - fit_end < 12 or n - test_start < 20:
        raise ValueError("Need >=30 fit, >=12 calibration, >=20 test weeks and enough trailing variance data")
    values = [point[1] for point in observations]
    settings = fit_settings(values[:fit_end], hazard_weeks)
    bcpd_probabilities = online_probabilities(values, settings)
    variance_scores = variance_shift_scores(values, variance_window_weeks)
    # Threshold selection sees the training/calibration prefix, never test.
    callback = {
        "bcpd": lambda threshold: threshold_alerts(
            bcpd_probabilities[:test_start], threshold, fit_end),
        "rolling_variance": lambda threshold: threshold_alerts(
            variance_scores[:test_start], threshold, fit_end),
        "two_sided_cusum": lambda threshold: cusum_alerts(
            values[:test_start], values[:fit_end], fit_end, threshold=threshold),
    }
    thresholds = {model: select_threshold(
        model, callback[model], fit_end, test_start, annual_alert_budget
    ) for model in MODELS}
    alerts = {
        "bcpd": threshold_alerts(
            bcpd_probabilities, thresholds["bcpd"].threshold, test_start),
        "rolling_variance": threshold_alerts(
            variance_scores, thresholds["rolling_variance"].threshold, test_start),
        "two_sided_cusum": cusum_alerts(
            values, values[:fit_end], test_start,
            threshold=thresholds["two_sided_cusum"].threshold),
    }
    manifest_path = prices.with_suffix(".provenance.json")
    manifest = None
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("csv_sha256") != sha256(prices):
            raise ValueError("Price CSV hash does not match its provenance manifest")
    report = {
        "schema": "bcpd.calibrated-market-audit.v1",
        "status": "unvalidated comparative research; no original thesis parity",
        "source": {
            "file": prices.name, "sha256": sha256(prices),
            "manifest": manifest,
            "note": "Original provider data are not redistributed by this report.",
        },
        "protocol": {
            "fit_fraction": fit_fraction, "test_fraction": test_fraction,
            "fit_end_exclusive": fit_end, "test_start": test_start,
            "fit_weeks": fit_end, "calibration_weeks": test_start - fit_end,
            "test_weeks": n - test_start,
            "last_fit_week": observations[fit_end - 1][0],
            "first_calibration_week": observations[fit_end][0],
            "first_test_week": observations[test_start][0],
            "last_test_week": observations[-1][0],
            "prior_and_noise": "fixed on fit weeks only",
            "alert_thresholds": "selected on calibration weeks only, no event labels",
            "calibration_annual_alert_budget": annual_alert_budget,
            "variance_window_weeks": variance_window_weeks,
            "hazard_weeks": hazard_weeks, "event_tolerance_weeks": tolerance_weeks,
            "known_limit": "Unlabeled calibration alarm counts are not false-positive rates.",
        },
        "model_settings": asdict(settings),
        "calibration": {model: asdict(cal) for model, cal in thresholds.items()},
        "test_alerts": {
            model: [observations[i][0] for i in indices]
            for model, indices in alerts.items()
        },
        "test_alert_counts": {model: len(indices) for model, indices in alerts.items()},
        "evaluation": {
            "independent_event_labels_supplied": False,
            "verified": False,
            "message": "Without independent labels, event accuracy, precision, recall and F1 are not measurable.",
        },
    }
    if events is not None:
        labels = read_event_labels(events)
        week_to_index = {week: i for i, (week, _) in enumerate(observations)}
        unknown = [day for day, _ in labels if day not in week_to_index]
        if unknown:
            raise ValueError("An event week is absent from observed weekly returns")
        test_events = [week_to_index[day] for day, _ in labels if week_to_index[day] >= test_start]
        if not test_events:
            raise ValueError("There must be at least one independently sourced held-out test event")
        report["evaluation"] = {
            "independent_event_labels_supplied": True,
            "verified": False,
            "message": "Event annotations, source independence and scientific protocol still require review.",
            "labels_sha256": sha256(events),
            "sources": [{"week": day, "source": source} for day, source in labels
                        if week_to_index[day] >= test_start],
            "models": {model: event_metrics(indices, test_events, tolerance_weeks)
                       for model, indices in alerts.items()},
        }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prices", required=True, type=Path)
    parser.add_argument("--events", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--annual-alert-budget", type=float, default=6.0)
    parser.add_argument("--fit-fraction", type=float, default=0.5)
    parser.add_argument("--test-fraction", type=float, default=0.7)
    parser.add_argument("--hazard", type=int, default=32)
    parser.add_argument("--variance-window", type=int, default=12)
    parser.add_argument("--tolerance-weeks", type=int, default=2)
    args = parser.parse_args()
    result = run(
        args.prices, args.events,
        fit_fraction=args.fit_fraction,
        test_fraction=args.test_fraction,
        annual_alert_budget=args.annual_alert_budget,
        hazard_weeks=args.hazard, variance_window_weeks=args.variance_window,
        tolerance_weeks=args.tolerance_weeks,
    )
    serialized = json.dumps(result, indent=2, allow_nan=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(serialized, encoding="utf-8")
        print(f"Wrote unvalidated comparative market audit to {args.out}")
    else:
        print(serialized)


if __name__ == "__main__":
    main()
