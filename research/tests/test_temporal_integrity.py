"""Temporal-integrity tests: historical reruns must not add provisional weeks."""
import csv
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from research.calibrated_benchmark import run
from research.market_snapshot import save_snapshot
from research.stress_test import generate_series
from research.temporal_integrity import (
    finalized_prices, last_completed_utc_saturday, parse_asof_utc,
)


class TemporalIntegrityTests(unittest.TestCase):
    def test_saturday_not_complete_until_sunday_utc(self):
        self.assertEqual(last_completed_utc_saturday(date(2026, 11, 7)), date(2026, 10, 31))
        self.assertEqual(last_completed_utc_saturday(date(2026, 11, 8)), date(2026, 11, 7))
        self.assertEqual(last_completed_utc_saturday(date(2026, 11, 10)), date(2026, 11, 7))

    def test_provisional_last_week_excluded_consistently(self):
        start = date(2026, 9, 1)
        rows = [((start + timedelta(days=i)).isoformat(), 100.0 + i)
                for i in range(68)]
        kept, integrity = finalized_prices(rows, date(2026, 11, 7))
        self.assertEqual(kept[-1][0], "2026-10-31")
        self.assertEqual(integrity["latest_complete_utc_saturday"], "2026-10-31")
        self.assertEqual(integrity["excluded_provisional_observations"], 7)

    def test_future_prices_and_bad_timestamp_fail_closed(self):
        points = [((date(2026, 1, 1) + timedelta(days=i)).isoformat(), 100 + i)
                  for i in range(50)]
        with self.assertRaisesRegex(ValueError, "after the snapshot"):
            finalized_prices(points, date(2026, 2, 1))
        with self.assertRaisesRegex(ValueError, "timezone"):
            parse_asof_utc("2026-11-08T01:15:00")
        self.assertEqual(parse_asof_utc("2026-11-08T01:15:00+02:00"), date(2026, 11, 7))
        self.assertEqual(parse_asof_utc("2026-11-08T01:15:00Z"), date(2026, 11, 8))

    def test_benchmark_reproducible_from_hashed_asof_snapshot(self):
        rows, _ = generate_series("abrupt_mean", 17)
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            meta = {
                "asset": "us", "name": "S&P 500",
                "range": "2y", "source": "Synthetic test fixture",
                "interval": "1d", "provider_accessed_at": None,
                "first_day": rows[0][0], "last_day": rows[-1][0],
                "observations": rows,
            }
            prices, sidecar = save_snapshot(meta, folder)
            original = json.loads(sidecar.read_text())
            original["snapshot_captured_at"] = "2026-11-08T00:39:00Z"
            sidecar.write_text(json.dumps(original))
            first = run(prices)
            second = run(prices)
            self.assertEqual(first["test_alerts"], second["test_alerts"])
            self.assertEqual(first["source"]["weekly_temporal_integrity"],
                             second["source"]["weekly_temporal_integrity"])
            self.assertTrue(first["source"]["weekly_temporal_integrity"]["complete_week_only"])
            with self.assertRaisesRegex(ValueError, "Cannot override"):
                run(prices, asof_utc="2026-11-09T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
