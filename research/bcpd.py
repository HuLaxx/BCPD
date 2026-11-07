"""Independent Python BOCPD prototype, not a reconstruction of a missing thesis model.

The model assumes Gaussian observations with unknown piecewise-constant means,
fixed observation variance, a conjugate Normal prior and a constant hazard.
Hyperparameters are estimated from the training partition ONLY.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import exp, isfinite, log, pi
from statistics import fmean, variance
from typing import Sequence


@dataclass(frozen=True)
class ModelSettings:
    hazard_weeks: int = 32
    prior_mean: float = 0.0
    prior_variance: float = 1.0
    noise_variance: float = 1.0
    max_run_length: int = 512

    def __post_init__(self) -> None:
        if not 3 <= self.hazard_weeks <= 2000:
            raise ValueError("hazard_weeks must be between 3 and 2000")
        if self.max_run_length < 16 or self.max_run_length > 10000:
            raise ValueError("max_run_length must be between 16 and 10000")
        if any(not isfinite(x) for x in (self.prior_mean, self.prior_variance, self.noise_variance)):
            raise ValueError("model parameters must be finite")
        if self.noise_variance <= 0 or self.prior_variance <= 0:
            raise ValueError("prior_variance and noise_variance must be positive")


def fit_settings(training: Sequence[float], hazard_weeks: int = 32) -> ModelSettings:
    """Fix the prior and observation variance using TRAINING observations only."""
    if len(training) < 16 or any(not isfinite(x) for x in training):
        raise ValueError("at least 16 finite training returns required")
    sample_var = variance(training)
    return ModelSettings(
        hazard_weeks=hazard_weeks,
        prior_mean=fmean(training[: min(12, len(training))]),
        noise_variance=max(1e-4, sample_var),
        prior_variance=max(0.01, sample_var * 7),
    )


@dataclass(frozen=True)
class RunState:
    run_length: int
    log_weight: float
    mean: float
    precision: float


def _logpdf(x: float, mean: float, var: float) -> float:
    return -0.5 * (log(2 * pi * var) + (x - mean) ** 2 / var)


def _logsumexp(values: Sequence[float]) -> float:
    maximum = max(values)
    return maximum + log(sum(exp(v - maximum) for v in values))


class OnlineBOCPD:
    """Streaming posterior recursion; no future returns enter an update."""

    def __init__(self, settings: ModelSettings):
        self.settings = settings
        self.states = [RunState(0, 0.0, settings.prior_mean, 1 / settings.prior_variance)]
        self.observations_seen = 0

    def update(self, value: float) -> float:
        if not isfinite(value):
            raise ValueError("observation must be finite")
        s = self.settings
        h = 1 / s.hazard_weeks
        obs_precision = 1 / s.noise_variance
        prior_precision = 1 / s.prior_variance
        reset_precision = prior_precision + obs_precision
        reset_log_weight = (
            _logsumexp([state.log_weight for state in self.states])
            + log(h)
            + _logpdf(value, s.prior_mean, s.noise_variance + s.prior_variance)
        )
        next_states = [RunState(
            0, reset_log_weight,
            (s.prior_mean * prior_precision + value * obs_precision) / reset_precision,
            reset_precision,
        )]
        for state in self.states:
            if state.run_length + 1 >= s.max_run_length:
                continue
            next_precision = state.precision + obs_precision
            next_states.append(RunState(
                state.run_length + 1,
                state.log_weight + log(1 - h)
                + _logpdf(value, state.mean, s.noise_variance + 1 / state.precision),
                (state.mean * state.precision + value * obs_precision) / next_precision,
                next_precision,
            ))
        log_normalizer = _logsumexp([state.log_weight for state in next_states])
        self.states = [RunState(state.run_length, state.log_weight - log_normalizer,
                                state.mean, state.precision) for state in next_states]
        self.observations_seen += 1
        return exp(self.states[0].log_weight)


def online_probabilities(observations: Sequence[float], settings: ModelSettings) -> list[float]:
    model = OnlineBOCPD(settings)
    return [model.update(value) for value in observations]
