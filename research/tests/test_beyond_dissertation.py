"""Software-level checks for alternative baselines and synthetic experiments.

No generated observations are treated as historical facts or thesis evidence.
"""
import unittest

from research.baselines import cusum_alerts
from research.stress_test import SCENARIOS, generate_series, evaluate_scenario, run_suite


class BeyondDissertationTests(unittest.TestCase):
    def test_cusum_uses_training_scale_and_alerts_on_large_shift(self):
        training = [0.2 if i % 2 else -0.2 for i in range(40)]
        values = training + [4.0] * 20
        alerts = cusum_alerts(values, training, 40, threshold=5.0)
        self.assertTrue(alerts)
        self.assertGreaterEqual(alerts[0], 40)
        self.assertLessEqual(alerts[0], 43)

    def test_cusum_is_causal_under_future_changes(self):
        train = [0.1 if i % 2 else -0.1 for i in range(24)]
        prefix = train + [1.0] * 20
        later = prefix + [-100.0] * 10
        a = cusum_alerts(prefix, train, 24)
        b = cusum_alerts(later, train, 24)
        self.assertEqual(a, [index for index in b if index < len(prefix)])

    def test_invalid_cusum_parameters_rejected(self):
        train = [float(i % 3) for i in range(30)]
        with self.assertRaises(ValueError):
            cusum_alerts(train, train, 30, threshold=0)
        with self.assertRaises(ValueError):
            cusum_alerts(train, train, 30, reference_k=-0.2)
        with self.assertRaises(ValueError):
            cusum_alerts(train, train, -1)

    def test_seeded_generator_reproducible_and_explicitly_synthetic(self):
        a = generate_series("combined", 42)
        b = generate_series("combined", 42)
        c = generate_series("combined", 43)
        self.assertEqual(a, b)
        self.assertNotEqual(a[0], c[0])
        self.assertEqual(len(a[0]), 261)
        self.assertEqual(len(a[1]), 2)
        self.assertTrue(all(a[0][0][0] < day for day in a[1]))

    def test_negative_controls_have_no_ground_truth_events(self):
        for scenario in ("stationary", "outliers", "gradual_drift"):
            prices, truth = generate_series(scenario, 5)
            self.assertEqual(len(prices), 261)
            self.assertEqual(truth, [])

    def test_synthetic_evaluation_no_verification_or_artificial_market_claim(self):
        result = evaluate_scenario("abrupt_mean", 1)
        self.assertEqual(result["status"], "SYNTHETIC EXPERIMENT ONLY; NOT REAL-MARKET VALIDATION")
        self.assertEqual(len(result["synthetic_truth"]), 2)
        self.assertIn("bcpd", result["models"])
        self.assertIn("two_sided_cusum", result["models"])
        self.assertGreater(result["test_weeks"], 25)

    def test_stress_suite_reports_false_alarms_on_null_scenarios(self):
        results = run_suite(1)
        self.assertFalse(results["verified_dissertation_improvement"])
        self.assertEqual(len(results["experiments"]), len(SCENARIOS))
        self.assertIsNone(results["aggregates"]["stationary"]["bcpd"]["average_event_f1"])
        self.assertIsNotNone(results["aggregates"]["stationary"]["bcpd"]["average_false_alarms_per_52_test_weeks"])

    def test_invalid_stress_inputs(self):
        with self.assertRaises(ValueError):
            generate_series("unlisted", 1)
        with self.assertRaises(ValueError):
            generate_series("stationary", -1)
        with self.assertRaises(ValueError):
            run_suite(0)


if __name__ == "__main__":
    unittest.main()
