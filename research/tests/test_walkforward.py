"""Quality checks for the five-year walk-forward milestone; fixtures are SYNTHETIC."""
from __future__ import annotations

import csv
import json
import math
import random
import tempfile
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from research.five_year_source import parse_yahoo_daily
from research.market_snapshot import parse_daily_payload, save_snapshot
from research.walkforward import (
    bootstrap_mean_interval, generate_folds, run,
)


def artificial_daily_prices() -> list[tuple[str, float]]:
    rng = random.Random(992)
    first = date(2021, 10, 30)
    price = 500.0
    out = []
    for index in range(1832):
        if index > 0:
            mean = 0.15 if index < 720 else (-0.12 if index < 1320 else 0.26)
            price *= math.exp(rng.gauss(mean, .65) / 100)
        out.append(((first + timedelta(days=index)).isoformat(), price))
    return out


def make_5y_snapshot(path: Path, *, tail_multiplier: float = 1.0) -> Path:
    daily = artificial_daily_prices()
    if tail_multiplier != 1.0:
        last_date, last_close = daily[-1]
        daily[-1] = (last_date, last_close * tail_multiplier)
    payload = {
        "asset": "us", "name": "Synthetic Index", "range": "5y",
        "interval": "1d", "source": "Synthetic local test fixture only",
        "provider_accessed_at": "2026-11-08T00:30:00+00:00",
        "first_day": daily[0][0], "last_day": daily[-1][0],
        "observations": daily,
    }
    prices, _ = save_snapshot(payload, path)
    return prices


class WalkforwardTests(unittest.TestCase):
    def test_nonoverlapping_holdouts_with_rolling_fit_and_calibration(self):
        folds = generate_folds(260)
        self.assertEqual(len(folds), 5)
        self.assertEqual((folds[0].fit_end, folds[0].calibration_end, folds[0].test_end),
                         (104, 130, 156))
        self.assertEqual((folds[-1].fit_end, folds[-1].calibration_end, folds[-1].test_end),
                         (208, 234, 260))
        self.assertTrue(all(a.test_end == b.calibration_end for a, b in zip(folds, folds[1:])))
        self.assertEqual(len({i for fold in folds for i in
                              range(fold.calibration_end, fold.test_end)}), 130)
        with self.assertRaisesRegex(ValueError, "Not enough"):
            generate_folds(90)
        with self.assertRaisesRegex(ValueError, ">=52 fit"):
            generate_folds(260, min_fit_weeks=10)

    def test_seeded_fold_bootstrap_is_reproducible_but_not_accuracy(self):
        data = [0.0, 8.0, 4.0, 12.0, 2.0]
        first = bootstrap_mean_interval(data, draws=400, seed=77)
        self.assertEqual(first, bootstrap_mean_interval(data, draws=400, seed=77))
        self.assertTrue(first["lower"] <= first["mean"] <= first["upper"])
        self.assertIn("descriptive", first["interpretation"])
        with self.assertRaisesRegex(ValueError, "three"):
            bootstrap_mean_interval([1, 2])

    def test_daily_five_year_chart_parser_prefers_adjusted_and_rejects_weekly(self):
        base = datetime(2021, 10, 30, tzinfo=timezone.utc)
        timestamps = [int((base + timedelta(days=i)).timestamp())
                      for i in range(1832)]
        original = {
            "chart": {"result": [{
                "timestamp": timestamps,
                "indicators": {"quote": [{"close": [100.0 + i for i in range(1832)]}],
                               "adjclose": [{"adjclose": [99.0 + i for i in range(1832)]}]}
            }], "error": None}
        }
        normalized = parse_yahoo_daily(original, "us", "2026-11-08T00:00:00Z")
        self.assertEqual(normalized["interval"], "1d")
        self.assertEqual(normalized["points"][0]["close"], 99.0)
        self.assertEqual(len(normalized["points"]), 1832)
        parsed = parse_daily_payload(normalized, "us", "5y")
        self.assertEqual(len(parsed["observations"]), 1832)
        with self.assertRaisesRegex(ValueError, "plausible five-year"):
            parse_yahoo_daily({
                "chart": {"result": [{
                    "timestamp": timestamps[::7],
                    "indicators": {"quote": [{"close": [100.0] * len(timestamps[::7])}]}
                }], "error": None}
            }, "us", "2026-11-08T00:00:00Z")
        with self.assertRaises(ValueError):
            parse_yahoo_daily(original, "unknown", "2026-11-08T00:00:00Z")

    def test_full_synthetic_five_year_walkforward_produces_unlabeled_report(self):
        with tempfile.TemporaryDirectory() as td:
            prices = make_5y_snapshot(Path(td))
            report = run(prices)
            self.assertFalse(report["model_accuracy_verified"])
            self.assertGreaterEqual(report["fold_count"], 4)
            self.assertEqual(report["price_provenance"]["daily_rows"], 1832)
            self.assertEqual(set(report["descriptive_fold_bootstrap_intervals"]),
                             {"bcpd", "rolling_variance", "two_sided_cusum"})
            seen = set()
            for fold in report["folds"]:
                start, stop = fold["test_index_range"]
                self.assertTrue(seen.isdisjoint(range(start, stop)))
                seen.update(range(start, stop))
                for model in fold["models"].values():
                    self.assertFalse(model["event_accuracy_verified"])
                    self.assertLessEqual(model["calibration_alerts"],
                                         model["allowed_calibration_alerts"])
                    self.assertNotIn("exploratory_label_metrics", model)

    def test_five_year_snapshot_hash_changes_fail_instead_of_repairing(self):
        with tempfile.TemporaryDirectory() as td:
            p = make_5y_snapshot(Path(td))
            with p.open("a", encoding="utf-8") as output:
                output.write("\n")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                run(p)

    def test_late_price_revision_cannot_change_earlier_folds(self):
        with tempfile.TemporaryDirectory() as td:
            first = make_5y_snapshot(Path(td) / "first")
            revised = make_5y_snapshot(Path(td) / "revised", tail_multiplier=1.45)
            a, b = run(first), run(revised)
            self.assertEqual(a["folds"][:-1], b["folds"][:-1])

    def test_separate_unverified_mean_and_variance_labels(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td)
            path = make_5y_snapshot(folder)
            unlabeled = run(path)
            events = folder / "means.csv"
            index_week = unlabeled["folds"][0]["test_start_week"]
            with events.open("w", newline="", encoding="utf-8") as output:
                writer = csv.writer(output)
                writer.writerow(("date", "source"))
                writer.writerow((index_week, "synthetic://annotation-fixture-only"))
            report = run(path, mean_events=events)
            self.assertFalse(report["model_accuracy_verified"])
            self.assertIn("exploratory_label_metrics",
                          report["folds"][0]["models"]["bcpd"])
            self.assertIn("exploratory_label_metrics",
                          report["folds"][0]["models"]["two_sided_cusum"])
            self.assertNotIn("exploratory_label_metrics",
                             report["folds"][0]["models"]["rolling_variance"])
            self.assertEqual(report["protocol"]["reference_event_hashes"]["mean"].__len__(), 64)


if __name__ == "__main__":
    unittest.main()
