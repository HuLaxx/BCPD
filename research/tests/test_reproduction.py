"""These are software tests, not evidence of dissertation replication."""
import csv
import math
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from research.bcpd import ModelSettings, OnlineBOCPD, fit_settings, online_probabilities
from research.benchmark import (
    read_prices, weekly_log_returns, variance_shift_scores,
    threshold_alerts, event_metrics, run
)


class ReproductionProtocolTests(unittest.TestCase):
    def test_posterior_normalizes_and_detects_clear_shift(self):
        training = [0.1 * math.sin(i) for i in range(40)]
        settings = fit_settings(training, hazard_weeks=40)
        values = training + [5.0] * 30
        result = online_probabilities(values, settings)
        self.assertEqual(len(result), len(values))
        self.assertTrue(all(0 <= x <= 1 and math.isfinite(x) for x in result))
        self.assertGreater(result[40], result[35])
        m = OnlineBOCPD(settings)
        for observation in values:
            m.update(observation)
            self.assertAlmostEqual(sum(math.exp(s.log_weight) for s in m.states), 1.0, places=10)

    def test_training_only_hyperparameters(self):
        a = fit_settings([0.1 * math.sin(i) for i in range(30)])
        b = fit_settings([0.1 * math.sin(i) for i in range(30)])
        self.assertEqual(a, b)
        with self.assertRaises(ValueError):
            fit_settings([0] * 5)
        with self.assertRaises(ValueError):
            ModelSettings(hazard_weeks=1)

    def test_variance_baseline_does_not_look_ahead(self):
        before = [float(i % 2) for i in range(30)]
        after = before + [1000.0]
        a = variance_shift_scores(before, 6)
        b = variance_shift_scores(after, 6)
        self.assertEqual(a, b[:-1])
        self.assertTrue(all(x is None for x in a[:11]))

    def test_event_matching_is_one_to_one(self):
        scores = event_metrics([19, 20, 21, 40], [20, 40], 2)
        self.assertEqual(scores["matched"], 2)
        self.assertEqual(scores["false_alarms"], 2)
        self.assertEqual(scores["recall"], 1.0)
        self.assertAlmostEqual(scores["precision"], 0.5)
        self.assertAlmostEqual(scores["f1"], 2 / 3)
        self.assertEqual(threshold_alerts([None, 0.1, 0.9, 0.8, 0.7, 0.95], 0.5, 1, 3), [2])

    def test_validation_rejects_duplicates_and_non_positive_prices(self):
        with tempfile.TemporaryDirectory() as td:
            file = Path(td) / "market.csv"
            file.write_text("date,close\n2026-01-01,100\n2026-01-01,101\n")
            with self.assertRaisesRegex(ValueError, "duplicate"):
                read_prices(file)
            file.write_text("date,close\n2026-01-01,0\n")
            with self.assertRaisesRegex(ValueError, "positive"):
                read_prices(file)

    def test_week_end_alignment_keeps_only_observed_closes(self):
        rows = [("2026-09-10", 100), ("2026-09-11", 110),
                ("2026-09-12", 120), ("2026-09-14", 130)]
        weekly = weekly_log_returns(rows)
        self.assertEqual([d for d, _ in weekly], ["2026-09-19"])
        self.assertAlmostEqual(weekly[0][1], 100 * math.log(130 / 120))

    def test_audit_report_never_claims_thesis_reproduction(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "price.csv"
            start = date(2024, 1, 1)
            with file.open("w", newline="") as handle:
                w = csv.writer(handle)
                w.writerow(["date", "close"])
                for i in range(210):
                    w.writerow([(start + timedelta(days=i * 7)).isoformat(),
                                100 * math.exp(0.002 * i + 0.01 * math.sin(i * .15))])
            report = run(file)
            self.assertFalse(report["evaluation"]["verified"])
            self.assertEqual(report["data"]["weekly_returns"], 209)
            self.assertTrue(report["data"]["prices_sha256"])
            self.assertIn("not verified", report["status"])
            self.assertEqual(report["evaluation"]["reason"], "independent labels not supplied")

    def test_events_require_independent_provenance_and_test_coverage(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "price.csv"
            labels = Path(tmp) / "events.csv"
            start = date(2024, 1, 1)
            with file.open("w", newline="") as handle:
                w = csv.writer(handle)
                w.writerow(["date", "close"])
                for i in range(210):
                    w.writerow([(start + timedelta(days=i * 7)).isoformat(), 100 + i])
            labels.write_text("date,source\n2024-02-01,https://independent.example/event\n")
            with self.assertRaisesRegex(ValueError, "held-out test"):
                run(file, labels)
            labels.write_text("date,source\n2028-05-01,https://independent.example/event\n")
            with self.assertRaisesRegex(ValueError, "outside observed"):
                run(file, labels)


if __name__ == "__main__":
    unittest.main()
