"""Release-gating checks for train-only calibration and market provenance.

These fixtures are artificial software test inputs, not financial observations.
"""
import csv
import json
import math
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from research.calibration import select_threshold
from research.calibrated_benchmark import run
from research.market_snapshot import parse_daily_payload, save_snapshot
from research.stress_test import generate_series


def fixture_prices(directory: Path) -> Path:
    rows, _ = generate_series("abrupt_mean", 17)
    path = directory / "fixture.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(("date", "close"))
        writer.writerows(rows)
    return path


class CalibrationTests(unittest.TestCase):
    def test_does_not_consult_heldout_alert_indices(self):
        def callback(threshold: float):
            return [i for i in (22, 24, 28) if threshold <= {22: 0.1, 24: 0.4, 28: 0.9}[i]]
        result = select_threshold("bcpd", callback, 20, 32, max_alerts_per_52_weeks=5)
        self.assertEqual(result.allowed_alerts, 1)
        self.assertEqual(result.threshold, 0.5)
        self.assertEqual(result.calibration_alerts, 1)
        self.assertTrue(result.budget_met)

    def test_empty_calibration_returns_most_sensitive_value(self):
        result = select_threshold("rolling_variance", lambda threshold: [], 10, 30)
        self.assertEqual(result.threshold, 0.05)
        self.assertEqual(result.calibration_alerts, 0)

    def test_rejects_threshold_callback_leaking_test_indices(self):
        with self.assertRaisesRegex(ValueError, "out-of-bounds"):
            select_threshold("bcpd", lambda threshold: [40], 10, 30)
        with self.assertRaises(ValueError):
            select_threshold("unlisted", lambda threshold: [], 10, 30)
        with self.assertRaises(ValueError):
            select_threshold("bcpd", lambda threshold: [], 10, 20)

    def test_daily_provider_snapshot_validates_provenance_and_rejects_weekly(self):
        start = date(2024, 1, 1)
        daily = [{"date": (start + timedelta(days=i)).isoformat(),
                  "close": 100 + i * 0.25} for i in range(160)]
        payload = {
            "asset": {"id": "us", "label": "S&P 500"},
            "range": "2y", "interval": "1d", "source": "Synthetic test provider",
            "accessedAt": "2026-11-08T00:00:00Z", "points": daily,
        }
        parsed = parse_daily_payload(payload, "us", "2y")
        self.assertEqual(len(parsed["observations"]), 160)
        with tempfile.TemporaryDirectory() as tmp:
            prices, meta = save_snapshot(parsed, Path(tmp))
            self.assertTrue(prices.is_file())
            data = json.loads(meta.read_text(encoding="utf-8"))
            self.assertEqual(data["rows"], 160)
            self.assertEqual(data["interval"], "1d")
            self.assertEqual(len(data["csv_sha256"]), 64)
            with self.assertRaises(FileExistsError):
                save_snapshot(parsed, Path(tmp))
        with self.assertRaisesRegex(ValueError, "daily timestamped"):
            parse_daily_payload({**payload, "interval": "1wk"}, "us", "2y")
        with self.assertRaisesRegex(ValueError, "duplicated"):
            parse_daily_payload({**payload, "points": daily[:-1] + [daily[-2]]}, "us", "2y")

    def test_calibrated_report_has_nonoverlapping_splits_and_is_unverified(self):
        with tempfile.TemporaryDirectory() as tmp:
            price_path = fixture_prices(Path(tmp))
            result = run(price_path)
            p = result["protocol"]
            self.assertGreater(p["fit_weeks"], 30)
            self.assertGreater(p["calibration_weeks"], 12)
            self.assertGreater(p["test_weeks"], 20)
            self.assertEqual(p["fit_weeks"] + p["calibration_weeks"] + p["test_weeks"], 260)
            self.assertFalse(result["evaluation"]["verified"])
            self.assertFalse(result["evaluation"]["independent_event_labels_supplied"])
            self.assertEqual(set(result["test_alerts"]), {"bcpd", "rolling_variance", "two_sided_cusum"})
            for name, params in result["calibration"].items():
                self.assertIn(name, result["test_alert_counts"])
                self.assertTrue(params["budget_met"])

    def test_holdout_alerts_do_not_include_calibration_alarm_dates(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = run(fixture_prices(Path(tmp)))
            boundary = report["protocol"]["first_test_week"]
            for model, dates in report["test_alerts"].items():
                self.assertTrue(all(day >= boundary for day in dates), model)

    def test_provenance_hash_mismatch_refuses_to_analyze(self):
        with tempfile.TemporaryDirectory() as tmp:
            price_path = fixture_prices(Path(tmp))
            price_path.with_suffix(".provenance.json").write_text('{"csv_sha256":"bad"}')
            with self.assertRaisesRegex(ValueError, "hash"):
                run(price_path)

    def test_reports_independent_event_source_without_claiming_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            prices = fixture_prices(folder)
            _, events = generate_series("abrupt_mean", 17)
            labels = folder / "labels.csv"
            with labels.open("w", newline="") as handle:
                writer = csv.writer(handle)
                writer.writerow(("date", "source"))
                writer.writerows((week, "synthetic://known-ground-truth") for week in events)
            report = run(prices, labels)
            self.assertFalse(report["evaluation"]["verified"])
            self.assertEqual(len(report["evaluation"]["sources"]), 2)
            self.assertEqual(set(report["evaluation"]["models"]),
                             {"bcpd", "rolling_variance", "two_sided_cusum"})


if __name__ == "__main__":
    unittest.main()
