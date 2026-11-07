"""Deterministic UTC-week completeness and snapshot provenance gate.

Only **closed** Saturday-ending UTC calendar weeks may enter a weekly
comparison. A captured dataset must be evaluated using the snapshot's
capture date, not the wall clock on a later rerun.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Sequence


def parse_asof_utc(value: str) -> date:
    """Require a timezone-aware ISO timestamp for reproducible source snapshots."""
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError, AttributeError) as exc:
        raise ValueError("Snapshot capture timestamp must be ISO-8601 UTC with offset") from exc
    if stamp.tzinfo is None or stamp.utcoffset() is None:
        raise ValueError("Snapshot capture timestamp must include a timezone offset")
    return stamp.astimezone(timezone.utc).date()


def last_completed_utc_saturday(asof: date) -> date:
    """The most recent Saturday strictly *before* as-of UTC day.

    On a Saturday, that day's market week is not complete until Sunday
    00:00 UTC; the previous Saturday is therefore the latest admissible.
    """
    days = (asof.weekday() - 5) % 7
    return asof - timedelta(days=days or 7)


def finalized_prices(
    points: Sequence[tuple[str, float]],
    asof: date,
) -> tuple[list[tuple[str, float]], dict]:
    """Exclude the current partial week; reject future-dated observations."""
    boundary = last_completed_utc_saturday(asof)
    kept = []
    provisional = 0
    for iso_day, close in points:
        day = date.fromisoformat(iso_day)
        if day > asof:
            raise ValueError("Provider contains prices dated after the snapshot capture date")
        if day <= boundary:
            kept.append((iso_day, close))
        else:
            provisional += 1
    if len(kept) < 45:
        raise ValueError("Insufficient complete-week observations after as-of cutoff")
    return kept, {
        "asof_utc_date": asof.isoformat(),
        "latest_complete_utc_saturday": boundary.isoformat(),
        "excluded_provisional_observations": provisional,
        "complete_week_only": True,
    }
