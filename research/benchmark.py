"""Reproducible, strictly labeled research baseline; NO original thesis claim is presumed.

Run: python -m research.benchmark --prices path/to/prices.csv --events path/to/events.csv
Inputs stay local. External event labels must be collected independently of models.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from dataclasses import asdict
from datetime import date, timedelta
from pathlib import Path
from statistics import variance

from .bcpd import fit_settings, online_probabilities
from .baselines import cusum_alerts


def read_prices(path: Path) -> list[tuple[str, float]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = csv.DictReader(handle)
        if not rows.fieldnames or not {"date", "close"}.issubset(set(rows.fieldnames)):
            raise ValueError("price CSV requires date,close columns")
        points = {}
        for row in rows:
            day = date.fromisoformat(row["date"])
            price = float(row["close"])
            if not math.isfinite(price) or price <= 0:
                raise ValueError("prices must be finite and positive")
            if day.isoformat() in points:
                raise ValueError(f"duplicate date: {day}")
            points[day.isoformat()] = price
    if len(points) < 45:
        raise ValueError("at least 45 observed closing prices required")
    return sorted(points.items())


def weekly_log_returns(points: list[tuple[str, float]]) -> list[tuple[str, float]]:
    """UTC week ends on Saturday; use last real close, never forward-fill."""
    latest = {}
    for d, price in points:
        day = date.fromisoformat(d)
        saturday = (day + timedelta(days=(5 - day.weekday()) % 7)).isoformat()
        if saturday not in latest or d > latest[saturday][0]:
            latest[saturday] = (d, price)
    ordered = sorted(latest.items())
    return [(week, 100 * math.log(ordered[i][1][1] / ordered[i - 1][1][1]))
            for i, (week, _) in enumerate(ordered) if i > 0]


def variance_shift_scores(values: list[float], window: int = 12) -> list[float | None]:
    """Past vs current rolling window; current return is available at detection time."""
    if not 4 <= window <= 52:
        raise ValueError("window must be between 4 and 52")
    scores = [None] * len(values)
    for i in range(2 * window - 1, len(values)):
        before = values[i - 2 * window + 1:i - window + 1]
        recent = values[i - window + 1:i + 1]
        scores[i] = abs(math.log((variance(recent) + 1e-4) / (variance(before) + 1e-4)))
    return scores


def threshold_alerts(scores: list[float | None], threshold: float,
                     first_test_index: int, cooldown: int = 3) -> list[int]:
    if not math.isfinite(threshold) or threshold <= 0:
        raise ValueError("threshold must be positive and finite")
    alerts = []
    last_alert = -cooldown - 1
    for i in range(first_test_index, len(scores)):
        score = scores[i]
        if score is not None and score >= threshold and i - last_alert > cooldown:
            alerts.append(i)
            last_alert = i
    return alerts


def read_event_labels(path: Path) -> list[tuple[str, str]]:
    """Event labels must contain source references, not model-generated annotations."""
    events = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = csv.DictReader(handle)
        if not rows.fieldnames or not {"date", "source"}.issubset(set(rows.fieldnames)):
            raise ValueError("event labels CSV requires date,source columns")
        for item in rows:
            day = date.fromisoformat(item["date"])
            source = item["source"].strip()
            if len(source) < 5:
                raise ValueError("each label needs a documented independent source")
            saturday = (day + timedelta(days=(5 - day.weekday()) % 7)).isoformat()
            events.append((saturday, source))
    if len({d for d, _ in events}) != len(events):
        raise ValueError("duplicate event labels within a UTC week")
    return sorted(events)


def event_metrics(alerts: list[int], events: list[int], tolerance_weeks: int = 2) -> dict:
    """Causal maximum-cardinality, minimum-delay, one-to-one event matching.

    An alert is eligible only at or AFTER the event, within the declared
    detection window. The dynamic program maximizes matched events first and
    minimizes total detection delay second. This avoids greedy pairing errors
    that incorrectly undercount true positives for adjacent events.
    """
    if not isinstance(tolerance_weeks, int) or not 0 <= tolerance_weeks <= 12:
        raise ValueError("tolerance must be an integer between 0 and 12")
    if any(not isinstance(i, int) or isinstance(i, bool) or i < 0 for i in alerts + events):
        raise ValueError("alert/event indices must be nonnegative integers")
    if alerts != sorted(set(alerts)) or events != sorted(set(events)):
        raise ValueError("alerts and events must be unique and sorted")

    na, ne = len(alerts), len(events)
    # (matched events, aggregate delay): prefer more matches, then less delay.
    scores = [[(0, 0) for _ in range(ne + 1)] for _ in range(na + 1)]
    decisions = [["" for _ in range(ne + 1)] for _ in range(na + 1)]

    def better(candidate: tuple[int, int], current: tuple[int, int]) -> bool:
        return (candidate[0], -candidate[1]) > (current[0], -current[1])

    for i in range(na - 1, -1, -1):
        for j in range(ne - 1, -1, -1):
            best = scores[i + 1][j]
            choice = "skip_alert"
            if better(scores[i][j + 1], best):
                best = scores[i][j + 1]
                choice = "skip_event"
            delay = alerts[i] - events[j]
            if 0 <= delay <= tolerance_weeks:
                matches, cost = scores[i + 1][j + 1]
                candidate = (matches + 1, cost + delay)
                if better(candidate, best):
                    best, choice = candidate, "match"
            scores[i][j] = best
            decisions[i][j] = choice

    delays = []
    i = j = 0
    while i < na and j < ne:
        choice = decisions[i][j]
        if choice == "match":
            delays.append(alerts[i] - events[j])
            i += 1
            j += 1
        elif choice == "skip_event":
            j += 1
        else:
            i += 1
    tp = len(delays)
    precision = tp / na if na else 0.0
    recall = tp / ne if ne else None
    f1 = (None if recall is None else
          2 * precision * recall / (precision + recall) if precision + recall else 0.0)
    return {"alerts": na, "events": ne, "matched": tp,
            "precision": precision, "recall": recall, "f1": f1,
            "false_alarms": na - tp,
            "signed_detection_delay_weeks": delays,
            "mean_absolute_delay_weeks": (sum(delays) / tp if tp else None)}

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(prices: Path, events: Path | None = None, *, split: float = 0.7,
        hazard: int = 32, window: int = 12, bcpd_threshold: float = 0.35,
        variance_threshold: float = 1.0, cusum_threshold: float = 5.0,
        tolerance_weeks: int = 2) -> dict:
    if not 0.5 <= split <= 0.85:
        raise ValueError("split must be between 0.5 and 0.85")
    weekly = weekly_log_returns(read_prices(prices))
    if len(weekly) < max(40, 2 * window + 16):
        raise ValueError("insufficient weekly history for leakage-free evaluation")
    values = [value for _, value in weekly]
    cut = int(len(values) * split)
    if cut < max(24, 2 * window) or len(values) - cut < 10:
        raise ValueError("training/test partitions too short")
    settings = fit_settings(values[:cut], hazard)
    bcpd = online_probabilities(values, settings)
    base = variance_shift_scores(values, window)
    alert_a = threshold_alerts(bcpd, bcpd_threshold, cut)
    alert_b = threshold_alerts(base, variance_threshold, cut)
    alert_c = cusum_alerts(values, values[:cut], cut, threshold=cusum_threshold)
    report = {
        "schema": "bcpd.reproduction.audit.v1",
        "status": "protocol only — original dissertation model not verified",
        "data": {"prices_file": prices.name, "prices_sha256": sha256(prices),
                 "weekly_returns": len(values), "training_returns": cut,
                 "test_returns": len(values) - cut,
                 "first_test_week": weekly[cut][0], "last_test_week": weekly[-1][0]},
        "configuration": {"hazard_weeks": hazard, "variance_window_weeks": window,
                          "bcpd_threshold": bcpd_threshold,
                          "variance_log_ratio_threshold": variance_threshold,
                          "cusum_standardized_threshold": cusum_threshold,
                          "event_tolerance_weeks": tolerance_weeks,
                          "split": split, "thresholds": "preconfigured; not tuned on test"},
        "model": {"name": "Gaussian mean-shift BOCPD, stdlib independent prototype",
                  "assumptions": "fixed noise variance and prior fitted on training only",
                  "settings": asdict(settings)},
        "test_alerts": {"bcpd": [weekly[i][0] for i in alert_a],
                        "rolling_variance": [weekly[i][0] for i in alert_b],
                        "two_sided_cusum": [weekly[i][0] for i in alert_c]},
        "evaluation": {"verified": False, "reason": "independent labels not supplied"},
        "disclaimer": "Not the original PyMC3 dissertation model or a verified 35% improvement."
    }
    if events is not None:
        annotations = read_event_labels(events)
        report["data"]["labels_file"] = events.name
        report["data"]["labels_sha256"] = sha256(events)
        index = {day: i for i, (day, _) in enumerate(weekly)}
        excluded = [day for day, _ in annotations if day not in index]
        if excluded:
            raise ValueError("event labels outside observed weekly return calendar: " + ", ".join(excluded[:5]))
        labels_test = [index[day] for day, _ in annotations if index[day] >= cut]
        if not labels_test:
            raise ValueError("no independently labeled events in the held-out test partition")
        m_a = event_metrics(alert_a, labels_test, tolerance_weeks)
        m_b = event_metrics(alert_b, labels_test, tolerance_weeks)
        m_c = event_metrics(alert_c, labels_test, tolerance_weeks)
        relative_f1 = (100 * (m_a["f1"] / m_b["f1"] - 1)
                       if m_a["f1"] is not None and m_b["f1"] is not None and m_b["f1"] > 0 else None)
        report["evaluation"] = {
            "verified": False,
            "reason": "protocol comparison only; dissertation parity and event-label validity require independent audit",
            "test_reference_events": [{"week": day, "source": source} for day, source in annotations if index[day] >= cut],
            "bcpd": m_a, "rolling_variance": m_b, "two_sided_cusum": m_c,
            "exploratory_f1_change_vs_rolling_variance_pct": relative_f1,
            "improvement_metric": "relative held-out event-matching F1; not assumed to be the thesis metric",
        }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prices", type=Path, required=True)
    parser.add_argument("--events", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--split", type=float, default=0.7)
    parser.add_argument("--hazard", type=int, default=32)
    parser.add_argument("--window", type=int, default=12)
    parser.add_argument("--bcpd-threshold", type=float, default=0.35)
    parser.add_argument("--variance-threshold", type=float, default=1.0)
    parser.add_argument("--cusum-threshold", type=float, default=5.0)
    parser.add_argument("--tolerance-weeks", type=int, default=2)
    args = parser.parse_args()
    report = run(args.prices, args.events, split=args.split, hazard=args.hazard,
                 window=args.window, bcpd_threshold=args.bcpd_threshold,
                 variance_threshold=args.variance_threshold,
                 cusum_threshold=args.cusum_threshold, tolerance_weeks=args.tolerance_weeks)
    result = json.dumps(report, indent=2, allow_nan=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(result + "\n", encoding="utf-8")
        print(f"Wrote audit report: {args.out}")
    else:
        print(result)


if __name__ == "__main__":
    main()
