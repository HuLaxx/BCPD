"""Independent mean-shift comparator: two-sided standardized CUSUM.

CUSUM is a more appropriate mean-shift comparator than a variance-only detector.
Reference mean and scale come exclusively from the training prefix. Parameters
must be chosen without inspecting held-out outcomes.
"""
from __future__ import annotations

from math import isfinite, sqrt
from statistics import fmean, variance
from typing import Sequence


def cusum_alerts(
    values: Sequence[float],
    training: Sequence[float],
    first_test_index: int,
    threshold: float = 5.0,
    reference_k: float = 0.5,
    cooldown: int = 3,
) -> list[int]:
    """One-sided positive and negative CUSUM streams, reset after each alarm.

    This method only uses the held-out observation at or before the current
    index. It does not update its reference mean/scale using future test data.
    The threshold is expressed in standardized cumulative units.
    """
    if len(training) < 16 or any(not isfinite(x) for x in training):
        raise ValueError("At least 16 finite training returns are required")
    if any(not isfinite(x) for x in values):
        raise ValueError("All tested observations must be finite")
    if not (0 <= first_test_index <= len(values)):
        raise ValueError("Invalid test boundary")
    if not isfinite(threshold) or threshold <= 0:
        raise ValueError("CUSUM threshold must be finite and positive")
    if not isfinite(reference_k) or reference_k < 0:
        raise ValueError("Reference allowance must be finite and nonnegative")
    if cooldown < 0 or cooldown > 52:
        raise ValueError("Cooldown must be between 0 and 52")

    mean = fmean(training)
    sigma = max(0.01, sqrt(variance(training)))
    upper = lower = 0.0
    last = -cooldown - 1
    alerts = []
    for i in range(first_test_index, len(values)):
        z = (values[i] - mean) / sigma
        upper = max(0.0, upper + z - reference_k)
        lower = max(0.0, lower - z - reference_k)
        if max(upper, lower) >= threshold:
            if i - last > cooldown:
                alerts.append(i)
                last = i
                upper = lower = 0.0
    return alerts
