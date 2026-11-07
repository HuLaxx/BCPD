"""Deterministic checks for non-publishing, provenance-aware cohort evaluation."""
import csv
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from research.market_snapshot import save_snapshot
from research.observed_cohort import summarize, data_files


class CohortTests(unittest.TestCase):
    def test_unlabeled_cohort_emits_counts_not_accuracy(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            first = date(2024, 1, 1)
            rows = []
            for i in range(760):
                day = first + timedelta(days=i)
                rows.append((day.isoformat(), 100.0 + i * 0.12 + (i % 17) * 0.02))
            parsed = {
                "asset": "us", "name": "Test Index", "range": "2y", "source": "Synthetic fixture only",
                "interval": "1d", "provider_accessed_at": "2026-11-07T18:00:00Z",
                "first_day": rows[0][0], "last_day": rows[-1][0], "observations": rows,
            }
            price, _ = save_snapshot(parsed, root)
            result = summarize({"us": price})
            self.assertFalse(result["accuracy_verified"])
            self.assertIsNone(result["f1"])
            self.assertEqual(len(result["markets"]), 1)
            for name in ("bcpd", "rolling_variance", "two_sided_cusum"):
                self.assertIn(name, result["markets"][0]["models"])
                self.assertGreaterEqual(result["total_test_alerts"][name], 0)

    def test_requires_archived_provenance_and_consistent_market_name(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            path = root / "us-2y.csv"
            path.write_text("date,close\n2024-01-01,100\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "provenance"):
                summarize({"us": path})
            with self.assertRaisesRegex(ValueError, "snapshot named"):
                summarize({"btc": path})

    def test_local_only_mode_never_downloads_and_refuses_bad_assets(self):
        with tempfile.TemporaryDirectory() as td:
            with data_files(("us", "btc"), Path(td), False) as files:
                self.assertEqual(set(files), {"us", "btc"})
                self.assertFalse(any(path.exists() for path in files.values()))
            with self.assertRaisesRegex(ValueError, "distinct recognized"):
                with data_files(("us", "us"), Path(td), False):
                    pass
            with self.assertRaisesRegex(ValueError, "distinct recognized"):
                with data_files(("fake",), Path(td), False):
                    pass


if __name__ == "__main__":
    unittest.main()
