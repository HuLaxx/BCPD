"""Regression cases for quality-critical event matching."""
import itertools
import unittest
from research.benchmark import event_metrics


class EventMatchingQualityTests(unittest.TestCase):
    def test_adjacent_events_maximize_cardinality_not_greedily_delay(self):
        result = event_metrics([11, 12], [10, 11], 1)
        self.assertEqual(result["matched"], 2)
        self.assertEqual(result["signed_detection_delay_weeks"], [1, 1])
        self.assertEqual(result["f1"], 1.0)

    def test_early_detection_does_not_count_as_post_event_detection(self):
        result = event_metrics([19], [20], 2)
        self.assertEqual(result["matched"], 0)
        self.assertEqual(result["f1"], 0.0)

    def test_missing_events_do_not_become_undefined_f1(self):
        self.assertEqual(event_metrics([], [20], 2)["f1"], 0.0)
        self.assertIsNone(event_metrics([], [], 2)["f1"])

    def test_invalid_unordered_and_duplicate_indices_rejected(self):
        for alerts, events in [([2, 1], [3]), ([1, 1], [1]), ([-1], [1])]:
            with self.assertRaises(ValueError):
                event_metrics(alerts, events, 2)

    def test_maximum_possible_matches_on_small_cases(self):
        def brute(alerts, events, tol):
            best = (0, 0)
            def walk(i, used, matches, delay):
                nonlocal best
                if i == len(alerts):
                    if (matches, -delay) > (best[0], -best[1]):
                        best = (matches, delay)
                    return
                walk(i + 1, used, matches, delay)
                for j, e in enumerate(events):
                    d = alerts[i] - e
                    if j not in used and 0 <= d <= tol:
                        walk(i + 1, used | {j}, matches + 1, delay + d)
            walk(0, set(), 0, 0)
            return best
        universe = range(5)
        for n in range(4):
            for a in itertools.combinations(universe, n):
                for m in range(4):
                    for e in itertools.combinations(universe, m):
                        for tol in range(3):
                            output = event_metrics(list(a), list(e), tol)
                            matched, cost = brute(a, e, tol)
                            self.assertEqual(output["matched"], matched)
                            self.assertEqual(sum(output["signed_detection_delay_weeks"]), cost)


if __name__ == "__main__":
    unittest.main()
