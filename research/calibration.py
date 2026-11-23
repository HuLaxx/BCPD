"""Training-only alert-budget calibration for three independent detectors.

No event labels and no held-out observations enter threshold selection. The
calibration budget counts *all* observed alerts, not known false positives:
without externally verified events, calling them false positives is invalid.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import floor, isfinite
from typing import Callable, Sequence


DEFAULT_GRIDS: dict[str, tuple[float, ...]] = {
    "bcpd": (0.01, 0.02, 0.04, 0.07, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 0.9, 0.97, 0.995, 1.01),
    "rolling_variance": (0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 0.8, 1.0, 1.3, 1.7, 2.2, 3.0, 4.5, 6.0, 10.0, 25.0),
    "two_sided_cusum": (0.5, 1.0, 1.5, 2.0, 2.8, 3.5, 4.5, 5.5, 7.0, 9.0, 12.0, 16.0, 24.0, 40.0, 80.0, 200.0),
}


@dataclass(frozen=True)
class Calibration:
    model: str
    threshold: float
    calibration_alerts: int
    calibration_weeks: int
    allowed_alerts: int
    alert_rate_per_52_weeks: float
    budget_met: bool
    grid_size: int


def select_threshold(
    model: str,
    alarms_for_threshold: Callable[[float], Sequence[int]],
    start: int,
    end: int,
    max_alerts_per_52_weeks: float = 6.0,
) -> Calibration:
    """Choose the most sensitive grid value satisfying a fixed alert budget.

    The callback MUST be restricted to observations ending before the held-out
    test boundary. Lower thresholds are interpreted as more sensitive for all
    three supported detectors.
    """
    if model not in DEFAULT_GRIDS:
        raise ValueError("Unknown calibration model")
    if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end <= start:
        raise ValueError("Invalid calibration boundaries")
    if end - start < 12:
        raise ValueError("At least 12 calibration weeks required")
    if not isfinite(max_alerts_per_52_weeks) or not 0 <= max_alerts_per_52_weeks <= 52:
        raise ValueError("Annual alert budget must be between 0 and 52")
    allowed = floor((end - start) * max_alerts_per_52_weeks / 52)
    options = []
    for threshold in DEFAULT_GRIDS[model]:
        indices = list(alarms_for_threshold(threshold))
        if indices != sorted(set(indices)) or any(not isinstance(i, int) or not start <= i < end for i in indices):
            raise ValueError("Calibration callback returned invalid or out-of-bounds alert indices")
        options.append((threshold, len(indices)))
    candidate = next(((value, count) for value, count in options if count <= allowed), None)
    if candidate is None:
        candidate = options[-1]
    threshold, count = candidate
    return Calibration(
        model=model, threshold=threshold, calibration_alerts=count,
        calibration_weeks=end - start, allowed_alerts=allowed,
        alert_rate_per_52_weeks=52 * count / (end - start),
        budget_met=count <= allowed, grid_size=len(options),
    )
