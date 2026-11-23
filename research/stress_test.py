"""Deterministic SYNTHETIC stress tests for independent BCPD research.

These fixtures are invented by a known, seeded statistical generator solely
to measure software behavior against ground truth. They are NEVER passed off
as real market observations, original thesis experiments, or live signals.

Run: python -m research.stress_test --seeds 3 --out stress-results.json
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import random
import tempfile
from datetime import date, timedelta
from pathlib import Path

from .benchmark import run

SCENARIOS = ("abrupt_mean", "volatility", "combined", "stationary", "outliers", "gradual_drift")
MODELS = ("bcpd", "rolling_variance", "two_sided_cusum")
EVENT_INDICES = (205, 235)


def generate_series(scenario: str, seed: int, weeks: int = 260) -> tuple[list[tuple[str, float]], list[str]]:
    """Generate a five-year-sized weekly toy series with recorded truth.

    Change points refer to the observed RETURN at the indicated zero-based
    index, not a synthetic equity-market calendar or actual financial event.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown synthetic scenario: {scenario}")
    if not isinstance(seed, int) or seed < 0 or seed > 1_000_000:
        raise ValueError("Seed must be an integer between 0 and 1,000,000")
    if weeks < 255 or weeks > 1000:
        raise ValueError("Synthetic time horizon must be between 255 and 1,000 weeks")
    rng = random.Random(seed)
    first_day = date(2021, 1, 2)  # Saturday, for unambiguous UTC-week alignment
    price = 1000.0
    rows = [(first_day.isoformat(), price)]
    for t in range(weeks):
        mean_pct = 0.15
        sigma_pct = 1.0
        if scenario in ("abrupt_mean", "combined"):
            if t >= EVENT_INDICES[1]:
                mean_pct = -2.4
            elif t >= EVENT_INDICES[0]:
                mean_pct = 2.4
        if scenario in ("volatility", "combined"):
            if EVENT_INDICES[0] <= t < EVENT_INDICES[1]:
                sigma_pct = 3.5
            elif t >= EVENT_INDICES[1]:
                sigma_pct = 0.5
        if scenario == "gradual_drift":
            mean_pct += 1.2 * t / (weeks - 1)
        return_pct = rng.gauss(mean_pct, sigma_pct)
        if scenario == "outliers" and t in (206, 218, 241):
            return_pct += (-1 if t % 2 else 1) * 9.0
        price *= math.exp(return_pct / 100.0)
        rows.append(((first_day + timedelta(days=7 * (t + 1))).isoformat(), price))
    truth = [
        rows[index + 1][0] for index in EVENT_INDICES
    ] if scenario in ("abrupt_mean", "volatility", "combined") else []
    return rows, truth


def evaluate_scenario(scenario: str, seed: int) -> dict:
    prices, truth = generate_series(scenario, seed)
    with tempfile.TemporaryDirectory() as directory:
        folder = Path(directory)
        price_csv = folder / "synthetic_prices.csv"
        with price_csv.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(("date", "close"))
            writer.writerows(prices)
        labels_csv = None
        if truth:
            labels_csv = folder / "independent_synthetic_truth.csv"
            with labels_csv.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow(("date", "source"))
                writer.writerows((week, f"synthetic://generator/{scenario}/seed-{seed}") for week in truth)
        report = run(price_csv, labels_csv)
        test_weeks = report["data"]["test_returns"]
        metrics = {}
        for model in MODELS:
            alerts = report["test_alerts"][model]
            if truth:
                measured = report["evaluation"][model]
                metrics[model] = {
                    "alert_count": len(alerts),
                    "matched_events": measured["matched"],
                    "precision": measured["precision"],
                    "recall": measured["recall"],
                    "f1": measured["f1"],
                    "mean_abs_delay_weeks": measured["mean_absolute_delay_weeks"],
                    "false_alarms_per_52_test_weeks": 52 * measured["false_alarms"] / test_weeks,
                }
            else:
                metrics[model] = {
                    "alert_count": len(alerts),
                    "matched_events": None,
                    "precision": None,
                    "recall": None,
                    "f1": None,
                    "mean_abs_delay_weeks": None,
                    "false_alarms_per_52_test_weeks": 52 * len(alerts) / test_weeks,
                }
        return {"scenario": scenario, "seed": seed, "synthetic_truth": truth,
                "input_sha256": report["data"]["prices_sha256"],
                "training_weeks": report["data"]["training_returns"],
                "test_weeks": test_weeks,
                "models": metrics,
                "status": "SYNTHETIC EXPERIMENT ONLY; NOT REAL-MARKET VALIDATION"}


def run_suite(seeds: int = 3) -> dict:
    if not isinstance(seeds, int) or not 1 <= seeds <= 50:
        raise ValueError("Number of seeds must be between 1 and 50")
    experiments = [evaluate_scenario(case, seed)
                   for case in SCENARIOS for seed in range(1, seeds + 1)]
    aggregates = {}
    for case in SCENARIOS:
        subset = [e for e in experiments if e["scenario"] == case]
        aggregates[case] = {}
        for model in MODELS:
            observations = [e["models"][model] for e in subset]
            def avg(key: str):
                numeric = [row[key] for row in observations if row[key] is not None]
                return sum(numeric) / len(numeric) if numeric else None
            aggregates[case][model] = {
                "average_event_f1": avg("f1"),
                "average_detection_delay_weeks": avg("mean_abs_delay_weeks"),
                "average_false_alarms_per_52_test_weeks": avg("false_alarms_per_52_test_weeks"),
            }
    return {
        "schema": "bcpd.synthetic-stress.v1",
        "verified_dissertation_improvement": False,
        "data_kind": "deterministically generated artificial price sequences",
        "scenarios": list(SCENARIOS),
        "seeds_per_scenario": seeds,
        "prespecified_protocol": {
            "weekly_returns": 260, "nominal_years": 5,
            "known_change_indices": list(EVENT_INDICES),
            "chronological_training_fraction": 0.7,
            "comparators": list(MODELS),
            "default_thresholds": {"bcpd": 0.35, "rolling_variance": 1.0, "two_sided_cusum": 5.0},
        },
        "aggregates": aggregates,
        "experiments": experiments,
        "limitations": [
            "Not historical data, not original PyMC3 dissertation experiments.",
            "Fixed thresholds are illustrative; model performance depends on calibration.",
            "Synthetic scenario definitions can favor certain model classes.",
            "Do not compare synthetic F1 to any historical 35 percent dissertation claim.",
            "Full online production latency, drift monitoring and provider health remain unverified.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seeds", type=int, default=3)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    report = run_suite(args.seeds)
    text = json.dumps(report, indent=2, allow_nan=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
        print(f"Wrote SYNTHETIC stress-test results to {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
