"""Synthetic-only checks for the multi-market five-year coordinator."""
import tempfile
import unittest
from pathlib import Path

from research.tests.test_walkforward import make_5y_snapshot
from research.walkforward_cohort import evaluate_cohort, snapshots


class CohortQualityTests(unittest.TestCase):
    def test_single_market_cohort_is_descriptive_and_provenanced(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            sample = make_5y_snapshot(root)
            # The coordinator should preserve a snapshot's computed identity.
            report = evaluate_cohort({"us": sample})
            self.assertEqual(len(report["markets"]), 1)
            self.assertFalse(report["model_accuracy_verified"])
            self.assertIsNone(report["f1"])
            self.assertGreaterEqual(report["markets"][0]["fold_count"], 3)
            self.assertEqual(len(report["markets"][0]["price_source"]["daily_price_csv_sha256"]), 64)

    def test_no_network_mode_and_invalid_assets_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            with snapshots(("us", "btc", "in"), Path(td), False) as files:
                self.assertEqual(set(files), {"us", "btc", "in"})
                self.assertTrue(all(not path.exists() for path in files.values()))
            with self.assertRaisesRegex(ValueError, "distinct"):
                with snapshots(("us", "us"), Path(td), False):
                    pass
            with self.assertRaisesRegex(ValueError, "allowlisted"):
                evaluate_cohort({"xxx": Path(td) / "xxx-5y.csv"})
            with self.assertRaisesRegex(ValueError, "must end"):
                evaluate_cohort({"us": Path(td) / "us-2y.csv"})


if __name__ == "__main__":
    unittest.main()
