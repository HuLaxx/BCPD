"""Regression tests: no synthetic metric is presented as real accuracy."""
import unittest
from research.signal_quality_probe import CHANGED, MODELS, evaluate, run_suite


class SyntheticSignalQualityTests(unittest.TestCase):
    def test_known_synthetic_changes_have_metrics_but_never_real_market_claim(self):
        result = evaluate("abrupt_mean", 1)
        self.assertEqual(result["planted_events"], 2)
        for model in MODELS:
            observed = result["models"][model]
            self.assertLessEqual(observed["calibration_alerts"], 6)
            self.assertGreaterEqual(observed["test_alerts"], 0)
            self.assertGreaterEqual(observed["event_f1"], 0)
            self.assertLessEqual(observed["event_f1"], 1)

    def test_stationary_control_has_no_event_labels(self):
        result = evaluate("stationary", 1)
        self.assertEqual(result["planted_events"], 0)
        for model in MODELS:
            self.assertIsNone(result["models"][model]["event_f1"])
            self.assertEqual(result["models"][model]["test_alerts"],
                             result["models"][model]["alerts_not_matching_events"])

    def test_suite_is_deterministic_and_cannot_claim_accuracy(self):
        a = run_suite(1)
        b = run_suite(1)
        self.assertEqual(a, b)
        self.assertFalse(a["verified_real_market_accuracy"])
        self.assertTrue(a["not_a_scientific_superiority_claim"])
        self.assertEqual(set(a["aggregates"]), {
            "abrupt_mean", "volatility", "combined",
            "stationary", "outliers", "gradual_drift"
        })
        for case in CHANGED:
            self.assertIsNotNone(a["aggregates"][case]["bcpd"]["mean_planted_event_f1"])

    def test_bad_arguments_fail(self):
        for bad in (0, 101, 1.5, "2", True):
            with self.assertRaises(ValueError):
                run_suite(bad)
        with self.assertRaises(ValueError):
            evaluate("real-market", 1)


if __name__ == "__main__":
    unittest.main()
