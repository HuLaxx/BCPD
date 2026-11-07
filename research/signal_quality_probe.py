"""Predeclared SYNTHETIC signal-quality audit, not market accuracy.

Calibrate each of three detectors on a 52-week negative-control prefix.
Evaluate on 78 unseen weeks. Two planted events occur in the final 78 weeks
of the abrupt mean, volatility and combined scenarios. The other three
scenarios deliberately contain NO abrupt change-point ground truth.

Use:
    python -m research.signal_quality_probe --seeds 20 --out artifacts/signal-quality.json

This is an independent stress diagnostic; a high score does not establish
accuracy, commercial value, or a statistically significant superiority claim.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import fmean

from .baselines import cusum_alerts
from .bcpd import fit_settings, online_probabilities
from .benchmark import event_metrics, threshold_alerts, variance_shift_scores, weekly_log_returns
from .calibration import select_threshold
from .stress_test import SCENARIOS, generate_series

MODELS = ("bcpd", "rolling_variance", "two_sided_cusum")
CHANGED = frozenset(("abrupt_mean", "volatility", "combined"))
FIT_END = 130
CALIBRATION_END = 182
TOTAL_WEEKS = 260
CALIBRATION_BUDGET = 6.0


def evaluate(scenario: str, seed: int) -> dict:
    if scenario not in SCENARIOS:
        raise ValueError("Unknown synthetic stress scenario")
    observed, event_dates = generate_series(scenario, seed, TOTAL_WEEKS)
    weekly = weekly_log_returns(observed)
    if len(weekly) != TOTAL_WEEKS:
        raise ValueError("Synthetic calendar did not create the expected weekly returns")
    returns = [value for _, value in weekly]
    index = {week: i for i, (week, _) in enumerate(weekly)}
    events = [index[day] for day in event_dates]
    if any(e < CALIBRATION_END for e in events):
        raise ValueError("Known synthetic change point leaked into calibration")
    if scenario in CHANGED and len(events) != 2:
        raise ValueError("Positive-control scenario must have two planted changes")
    if scenario not in CHANGED and events:
        raise ValueError("Negative-control scenario may not have fabricated ground-truth events")

    settings = fit_settings(returns[:FIT_END])
    bcpd = online_probabilities(returns, settings)
    variance = variance_shift_scores(returns, 12)
    candidate = {
        "bcpd": lambda t, end: threshold_alerts(bcpd[:end], t, FIT_END),
        "rolling_variance": lambda t, end: threshold_alerts(variance[:end], t, FIT_END),
        "two_sided_cusum": lambda t, end: cusum_alerts(
            returns[:end], returns[:FIT_END], FIT_END, threshold=t
        ),
    }
    models = {}
    for model in MODELS:
        calibrated = select_threshold(
            model, lambda t: candidate[model](t, CALIBRATION_END),
            FIT_END, CALIBRATION_END, CALIBRATION_BUDGET,
        )
        if not calibrated.budget_met:
            raise ValueError("Unable to meet the shared synthetic calibration budget")
        test_alerts = [i for i in candidate[model](calibrated.threshold, TOTAL_WEEKS)
                       if i >= CALIBRATION_END]
        metrics = event_metrics(test_alerts, events, tolerance_weeks=2) if events else None
        models[model] = {
            "threshold": calibrated.threshold,
            "disabled_threshold": bool(model == "bcpd" and calibrated.threshold > 1),
            "calibration_alerts": calibrated.calibration_alerts,
            "test_alerts": len(test_alerts),
            "event_recall": metrics["recall"] if metrics else None,
            "event_f1": metrics["f1"] if metrics else None,
            "matched_events": metrics["matched"] if metrics else None,
            "alerts_not_matching_events": (
                metrics["false_alarms"] if metrics else len(test_alerts)
            ),
        }
    return {
        "scenario": scenario,
        "seed": seed,
        "planted_events": len(events),
        "synthetic_test_weeks": TOTAL_WEEKS - CALIBRATION_END,
        "models": models,
    }


def run_suite(seeds: int = 20) -> dict:
    if type(seeds) is not int or not 1 <= seeds <= 100:
        raise ValueError("Seed count must be 1–100")
    trials = [evaluate(case, seed) for case in SCENARIOS
              for seed in range(1, seeds + 1)]
    aggregates = {}
    for case in SCENARIOS:
        cases = [row for row in trials if row["scenario"] == case]
        per_model = {}
        for model in MODELS:
            model_rows = [row["models"][model] for row in cases]
            per_model[model] = {
                "mean_test_alerts": fmean(row["test_alerts"] for row in model_rows),
                "mean_unmatched_alerts": fmean(row["alerts_not_matching_events"]
                                                for row in model_rows),
                "mean_planted_event_recall": (
                    fmean(row["event_recall"] for row in model_rows)
                    if case in CHANGED else None
                ),
                "mean_planted_event_f1": (
                    fmean(row["event_f1"] for row in model_rows)
                    if case in CHANGED else None
                ),
                "disabled_calibrations": sum(
                    row["disabled_threshold"] for row in model_rows
                ),
            }
        aggregates[case] = per_model
    return {
        "schema": "bcpd.synthetic-signal-quality.v1",
        "status": "ARTIFICIAL synthetic quality probe, NOT historical event accuracy",
        "seeds": seeds,
        "fit_weeks": FIT_END,
        "calibration_weeks": CALIBRATION_END - FIT_END,
        "holdout_weeks": TOTAL_WEEKS - CALIBRATION_END,
        "calibration_max_alarms_per_52_weeks": CALIBRATION_BUDGET,
        "tolerance_weeks": 2,
        "test_label_source": "only artificial generator's known planted changes",
        "models": list(MODELS),
        "aggregates": aggregates,
        "verified_real_market_accuracy": False,
        "not_a_scientific_superiority_claim": True,
        "limitations": [
            "Scenario distributions are artificial and can favor one detector.",
            "Known no-change scenarios treat all abrupt-change alarms as false in simulation only.",
            "Same synthetic seeds are not statistically independent markets.",
            "F1 is conditional on the synthetic event definition and two-week match window.",
            "No confidence intervals or historical event-label validation are included.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seeds", type=int, default=20)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    report = run_suite(args.seeds)
    print("SYNTHETIC ONLY: no verified real-world detection performance.")
    for case, per_model in report["aggregates"].items():
        print("SCENARIO", case)
        for model, values in per_model.items():
            f1 = values["mean_planted_event_f1"]
            print(
                f"  {model} mean alarms={values['mean_test_alerts']:.2f}, "
                f"unmatched={values['mean_unmatched_alerts']:.2f}, "
                f"synthetic-F1={f1 if f1 is not None else 'n/a'}"
            )
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n",
                            encoding="utf-8")
        print(f"Wrote synthetic metrics to {args.out}")


if __name__ == "__main__":
    main()
