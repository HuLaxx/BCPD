"""Expanding-origin, non-overlapping, five-year time-series validation protocol.

Uses immutable, locally archived daily price data with a SHA-256 sidecar.
Each fold has chronological FIT -> CALIBRATION -> TEST windows; the test
windows never overlap. Existing observed returns may become fit data for a
later fold, as is standard in expanding-window walk-forward evaluation.

Outputs only descriptive out-of-sample alert burden unless separately sourced,
complete event annotations are supplied. It NEVER declares model superiority.
Run:
 python -m research.walkforward --prices local-data/us-5y.csv --out artifacts/us-walkforward.json
"""
from __future__ import annotations

import argparse
import json
import math
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import fmean

from .baselines import cusum_alerts
from .bcpd import fit_settings, online_probabilities
from .benchmark import (
    event_metrics, read_event_labels, read_prices, sha256,
    threshold_alerts, variance_shift_scores, weekly_log_returns,
)
from .calibration import select_threshold
from .temporal_integrity import finalized_prices, parse_asof_utc

MODELS = ("bcpd", "rolling_variance", "two_sided_cusum")


@dataclass(frozen=True)
class Fold:
    """Half-open absolute index ranges into one immutable weekly-return series."""
    fit_end: int
    calibration_end: int
    test_end: int


def generate_folds(
    length: int, min_fit_weeks: int = 104,
    calibration_weeks: int = 26, test_weeks: int = 26
) -> list[Fold]:
    if not all(isinstance(x, int) and not isinstance(x, bool) for x in
               (length, min_fit_weeks, calibration_weeks, test_weeks)):
        raise ValueError("Fold boundaries must be integers")
    if min_fit_weeks < 52 or calibration_weeks < 12 or test_weeks < 12:
        raise ValueError("Require >=52 fit, >=12 calibration and >=12 test weeks")
    if length < min_fit_weeks + calibration_weeks + test_weeks:
        raise ValueError("Not enough finalized returns for a complete walk-forward fold")
    folds = []
    fit = min_fit_weeks
    while fit + calibration_weeks + test_weeks <= length:
        folds.append(Fold(fit, fit + calibration_weeks,
                          fit + calibration_weeks + test_weeks))
        fit += test_weeks
    if not folds:
        raise ValueError("No full walk-forward folds")
    for before, after in zip(folds, folds[1:]):
        if before.test_end != after.calibration_end:
            # The next fold's calibration range is the previous test range.
            raise ValueError("Walk-forward chronology is inconsistent")
        if before.test_end != after.fit_end + calibration_weeks:
            raise ValueError("Holdout/test windows must not overlap")
    return folds


def bootstrap_mean_interval(
    values: list[float], draws: int = 2000, seed: int = 20261108
) -> dict:
    """Seeded fold-resampling descriptive interval (NOT an independent-fold CI).

    Sequential expanding-origin folds share training histories. This bootstrap
    is a useful sensitivity summary, not a guaranteed 95% coverage procedure.
    """
    if len(values) < 3 or any(not math.isfinite(x) for x in values):
        raise ValueError("Need at least three finite fold measurements")
    if not isinstance(draws, int) or not 100 <= draws <= 10000:
        raise ValueError("Bootstrap draws must be 100–10000")
    rng = random.Random(seed)
    n = len(values)
    samples = sorted(
        fmean(values[rng.randrange(n)] for _ in range(n))
        for _ in range(draws)
    )
    return {
        "mean": fmean(values),
        "lower": samples[int((draws - 1) * .025)],
        "upper": samples[int((draws - 1) * .975)],
        "draws": draws,
        "seed": seed,
        "units": "alarms per 52 held-out weeks",
        "interpretation": "descriptive fold-bootstrap, overlapping training histories; not independent CI",
    }


def _load_verified_daily_snapshot(path: Path) -> tuple[list[tuple[str, float]], dict, dict]:
    sidecar = path.with_suffix(".provenance.json")
    if not sidecar.is_file():
        raise ValueError("Immutable five-year research data require a provenance sidecar")
    manifest = json.loads(sidecar.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or manifest.get("schema") != "bcpd.market-snapshot.v1":
        raise ValueError("Unsupported or missing five-year snapshot provenance schema")
    if manifest.get("csv_sha256") != sha256(path):
        raise ValueError("Dataset SHA-256 mismatch; refuse to refetch or repair automatically")
    if manifest.get("range") != "5y" or manifest.get("interval") != "1d":
        raise ValueError("Walk-forward milestone requires five-year DAILY history")
    if not isinstance(manifest.get("source"), str) or not manifest["source"].strip():
        raise ValueError("Snapshot has no provider attribution")
    captured = manifest.get("snapshot_captured_at")
    if not isinstance(captured, str):
        raise ValueError("Snapshot must include a timezone-aware capture timestamp")
    asof = parse_asof_utc(captured)
    raw = read_prices(path)
    if len(raw) != manifest.get("rows"):
        raise ValueError("Snapshot row count differs from the immutable source manifest")
    from datetime import date
    if (date.fromisoformat(raw[-1][0]) - date.fromisoformat(raw[0][0])).days < 4 * 365:
        raise ValueError("Historical source covers less than four calendar years")
    if len(raw) < 800:
        raise ValueError("Five-year daily history must contain at least 800 actual closes")
    complete, integrity = finalized_prices(raw, asof)
    return weekly_log_returns(complete), manifest, integrity


def _event_indices(labels: Path, observed_weeks: list[str]) -> tuple[list[int], str]:
    weekly = read_event_labels(labels)
    index = {week: pos for pos, week in enumerate(observed_weeks)}
    unknown = [day for day, _ in weekly if day not in index]
    if unknown:
        raise ValueError("Independently labeled event dates must belong to the observed weekly calendar")
    return [index[day] for day, _ in weekly], sha256(labels)


def run(
    prices: Path, *, mean_events: Path | None = None,
    variance_events: Path | None = None,
    min_fit_weeks: int = 104,
    calibration_weeks: int = 26,
    test_weeks: int = 26,
    annual_alert_budget: float = 6.0,
    hazard_weeks: int = 32,
    variance_window_weeks: int = 12,
    tolerance_weeks: int = 2,
) -> dict:
    if not isinstance(tolerance_weeks, int) or not 0 <= tolerance_weeks <= 12:
        raise ValueError("Event tolerance must be an integer from 0 to 12")
    if not isinstance(variance_window_weeks, int) or not 4 <= variance_window_weeks <= 52:
        raise ValueError("Variance window must be 4–52 weeks")
    observed, manifest, integrity = _load_verified_daily_snapshot(prices)
    weeks = [w for w, _ in observed]
    values = [r for _, r in observed]
    folds = generate_folds(len(values), min_fit_weeks, calibration_weeks, test_weeks)
    if len(folds) < 3:
        raise ValueError("At least three disjoint holdout folds are needed for a descriptive interval")

    labels = {}
    for target, path in (("mean", mean_events), ("variance", variance_events)):
        if path is not None:
            indices, digest = _event_indices(path, weeks)
            labels[target] = {"indices": indices, "sha256": digest}

    fold_results = []
    for fold_number, fold in enumerate(folds, start=1):
        fit_end, calibration_end, test_end = (fold.fit_end, fold.calibration_end, fold.test_end)
        fit_data = values[:fit_end]
        test_data = values[:test_end]
        settings = fit_settings(fit_data, hazard_weeks)
        posterior = online_probabilities(test_data, settings)
        variance_scores = variance_shift_scores(test_data, variance_window_weeks)
        calibration = {
            "bcpd": lambda t: threshold_alerts(posterior[:calibration_end], t, fit_end),
            "rolling_variance": lambda t: threshold_alerts(
                variance_scores[:calibration_end], t, fit_end),
            "two_sided_cusum": lambda t: cusum_alerts(
                test_data[:calibration_end], fit_data, fit_end, threshold=t),
        }
        picked = {
            model: select_threshold(
                model, calibration[model], fit_end, calibration_end, annual_alert_budget
            ) for model in MODELS
        }
        failures = [name for name, cal in picked.items()
                    if not cal.budget_met or (name == "bcpd" and cal.threshold > 1)]
        if failures:
            raise ValueError(
                "No admissible active calibration threshold in fold "
                f"{fold_number}: {', '.join(failures)}"
            )
        # Compute the entire causal trajectory through test_end, then score
        # only the held-out period. The same threshold is applied from fit_end.
        full = {
            "bcpd": threshold_alerts(
                posterior, picked["bcpd"].threshold, fit_end),
            "rolling_variance": threshold_alerts(
                variance_scores, picked["rolling_variance"].threshold, fit_end),
            "two_sided_cusum": cusum_alerts(
                test_data, fit_data, fit_end,
                threshold=picked["two_sided_cusum"].threshold),
        }
        model_results = {}
        for model in MODELS:
            alarm_indices = [i for i in full[model]
                             if calibration_end <= i < test_end]
            outcome = {
                "calibrated_threshold": picked[model].threshold,
                "calibration_alerts": picked[model].calibration_alerts,
                "allowed_calibration_alerts": picked[model].allowed_alerts,
                "holdout_alerts": len(alarm_indices),
                "holdout_alerts_per_52_weeks": 52 * len(alarm_indices) / test_weeks,
                "holdout_alarm_week_ends": [weeks[i] for i in alarm_indices],
                "event_accuracy_verified": False,
            }
            category = "variance" if model == "rolling_variance" else "mean"
            if category in labels:
                reference = [i for i in labels[category]["indices"]
                             if calibration_end <= i < test_end]
                # This is an exploratory label comparison, not reviewed ground truth.
                outcome["exploratory_label_metrics"] = event_metrics(
                    alarm_indices, reference, tolerance_weeks
                )
            model_results[model] = outcome
        fold_results.append({
            "fold": fold_number,
            "training_weeks": fit_end,
            "calibration_weeks": calibration_end - fit_end,
            "holdout_weeks": test_weeks,
            "training_last_week": weeks[fit_end - 1],
            "calibration_first_week": weeks[fit_end],
            "calibration_last_week": weeks[calibration_end - 1],
            "test_start_week": weeks[calibration_end],
            "test_end_week": weeks[test_end - 1],
            "test_index_range": [calibration_end, test_end],
            "models": model_results,
        })
    summary = {
        model: bootstrap_mean_interval(
            [f["models"][model]["holdout_alerts_per_52_weeks"]
             for f in fold_results],
        ) for model in MODELS
    }
    return {
        "schema": "bcpd.five-year-walk-forward.v1",
        "model_accuracy_verified": False,
        "status": "Five-year-sized observed-data walk-forward ALARM EVALUATION; scientific accuracy unverified",
        "asset": manifest["asset"],
        "market_name": manifest["market_name"],
        "price_provenance": {
            "daily_price_csv_sha256": sha256(prices),
            "source": manifest["source"],
            "source_url": manifest.get("source_url"),
            "price_basis": manifest.get("price_basis", "unspecified"),
            "capture_time": manifest["snapshot_captured_at"],
            "daily_rows": manifest["rows"],
            "completed_week_cutoff": integrity["latest_complete_utc_saturday"],
            "excluded_provisional_rows": integrity["excluded_provisional_observations"],
        },
        "protocol": {
            "observed_weekly_returns": len(values),
            "fit": "expanding historical prefix, refit before each calibration block",
            "calibration_weeks": calibration_weeks,
            "test_weeks": test_weeks,
            "test_windows_nonoverlapping": True,
            "past_test_returns_reused_for_later_fit": True,
            "max_calibration_alarms_per_52_weeks": annual_alert_budget,
            "hazard_weeks": hazard_weeks,
            "variance_window_weeks": variance_window_weeks,
            "event_tolerance_weeks": tolerance_weeks,
            "reference_event_hashes": {
                target: entry["sha256"] for target, entry in labels.items()
            },
            "event_target_mapping": {
                "mean": ["bcpd", "two_sided_cusum"],
                "variance": ["rolling_variance"],
            },
        },
        "fold_count": len(fold_results),
        "folds": fold_results,
        "descriptive_fold_bootstrap_intervals": summary,
        "limitations": [
            "No claims of accuracy or model superiority without independently audited complete event labels.",
            "Fold bootstrap draws are descriptive; expanding-fold training histories overlap.",
            "The three detectors target different statistical properties and must not be ranked on alarm count.",
            "Provider price-basis, corporate actions, source licensing and dates require independent cross-check.",
            "An event label is not automatically a ground-truth statistically detectable regime shift.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prices", required=True, type=Path)
    parser.add_argument("--mean-events", type=Path,
                        help="date,source independent mean-change labels (exploratory only)")
    parser.add_argument("--variance-events", type=Path,
                        help="date,source independent variance-change labels (exploratory only)")
    parser.add_argument("--out", type=Path, default=Path("artifacts/walkforward.json"))
    parser.add_argument("--min-fit", type=int, default=104)
    parser.add_argument("--calibration-weeks", type=int, default=26)
    parser.add_argument("--test-weeks", type=int, default=26)
    args = parser.parse_args()
    report = run(
        args.prices, mean_events=args.mean_events,
        variance_events=args.variance_events,
        min_fit_weeks=args.min_fit,
        calibration_weeks=args.calibration_weeks,
        test_weeks=args.test_weeks,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(
        "Five-year walk-forward alarm evaluation (NOT VERIFIED ACCURACY): "
        f"{report['asset']}, {report['fold_count']} folds"
    )
    for fold in report["folds"]:
        counts = " ".join(
            f"{model}={fold['models'][model]['holdout_alerts']}" for model in MODELS
        )
        print(f"Fold {fold['fold']} {fold['test_start_week']}–{fold['test_end_week']}: {counts}")
    print(f"Saved source-hashed report: {args.out}")


if __name__ == "__main__":
    main()
