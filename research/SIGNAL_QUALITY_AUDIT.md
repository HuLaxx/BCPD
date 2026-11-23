# BCPD One — scientific signal-quality audit (2026-11-08)

**Decision:** Software capability demonstrated; **NOT scientifically validated for financial decision alerts**.

## Reproducibility

- Research implementation: `research/bcpd.py`, `research/baselines.py`, `research/benchmark.py`, `research/calibration.py`, and the new `research/signal_quality_probe.py`.
- Definitive run: [GitHub Actions 42414007494](https://github.com/HuLaxx/BCPD/actions/runs/42414007494), seeded 20 synthetic histories per scenario, all synthetic job steps successful.
- This is a **synthetic stress experiment** with known planted shifts in simulated returns and a 78-week held-out evaluation. It is **not live/historical-market event-label validation**.
- Fit on 130 weeks, calibrate on the next 52, score only the last 78; thresholds are selected from fixed model-specific grids with up to 6 alerts per 52 calibration weeks. The matching rule credits alerts **at or after** a planted event within two weeks. No test labels are used for calibration.
- The small, simulated regime set could favor particular statistical models. It is not a representative sampling of economic events.

## What the software actually did

Means are across 20 independent pseudo-random seeds within the particular generator definition. F1 is computed *only on planted artificial ground truth*.

| Synthetic scenario | Detector | Mean held-out alarms | Mean unmatched alarms | Mean planted-event F1 |
|---|---|---:|---:|---:|
| Abrupt return mean changes | BOCPD | 7.20 | 5.75 | 0.346 |
| Abrupt return mean changes | CUSUM | 16.05 | 14.35 | 0.189 |
| Abrupt return mean changes | Rolling variance | 12.10 | 10.65 | 0.208 |
| Volatility changes | BOCPD | 9.00 | 8.05 | 0.172 |
| Volatility changes | CUSUM | 10.05 | 9.00 | 0.170 |
| Volatility changes | Rolling variance | 12.10 | 11.10 | 0.140 |
| Combined mean/volatility changes | BOCPD | 8.80 | 7.65 | 0.215 |
| Combined mean/volatility changes | CUSUM | 16.05 | 14.40 | 0.183 |
| Combined mean/volatility changes | Rolling variance | 11.40 | 10.35 | 0.161 |
| Stationary, NO abrupt changes | BOCPD | 6.75 | 6.75 | Not applicable |
| Stationary, NO abrupt changes | CUSUM | 8.05 | 8.05 | Not applicable |
| Stationary, NO abrupt changes | Rolling variance | 7.05 | 7.05 | Not applicable |
| Isolated outliers, NO durable break | BOCPD | 8.55 | 8.55 | Not applicable |
| Isolated outliers, NO durable break | CUSUM | 9.90 | 9.90 | Not applicable |
| Isolated outliers, NO durable break | Rolling variance | 13.00 | 13.00 | Not applicable |
| Gradual drift, NO discrete break | BOCPD | 6.20 | 6.20 | Not applicable |
| Gradual drift, NO discrete break | CUSUM | 12.45 | 12.45 | Not applicable |
| Gradual drift, NO discrete break | Rolling variance | 7.10 | 7.10 | Not applicable |

**Interpretation:** The current alert calibration is not sufficient to produce low-noise change warnings even under some clean negative controls. A detector's lower F1 on this *synthetic* suite does not imply inferior performance on any real market. All three models can still be useful as exploratory measurements and in a model-disagreement workbench. None is presently validated for high-confidence alerts or trading decisions.

## Why these values matter

Two planted events occur in each positive-control test. For BOCPD abrupt-mean simulation, mean event recall was 0.725 but the detector generated 7.20 alarms over the 78-week test, only 1.45 of which matched planted events on average. In a research workflow this is a useful warning that a calibrated *count* budget does not substitute for reliable alert quality.

The negative controls have no planted abrupt change point by construction. Alerts are therefore unmatched **relative to that generator's strict target**; a human investigator might still care about gradual movement or transients for different applications. This distinction must be explained rather than calling every alert a financial failure.

## Scientific launch blockers

- [ ] Independent code review of the Bayesian reset/run-length mathematics against Adams & MacKay (2007), with numerical parity or a documented intentional variation.
- [ ] Robust predictive-noise model or explicit outlier policy (e.g. Student-t), evaluated without post-hoc tuning.
- [ ] **Separate** calibration and objective scoring of mean shifts versus volatility shifts; avoid claiming rolling variance is an equivalent mean detector.
- [ ] Freeze complete licensed datasets and independently cross-check timestamps, dividends, splits and provider adjustments.
- [ ] Preregister the event target, blinded reviewed labels *including no-event intervals*, matched alert budgets, and multiple disjoint held-out markets.
- [ ] Measure recall, precision, post-event delay, alert burden, sensitivity to outliers and failure handling jointly. Report uncertainty that accounts for temporal and cross-market dependence.
- [ ] Avoid suggesting future price prediction; change-point recognition is not itself an investment strategy.

## Engineering safeguards already improved

The five-year importer previously combined adjusted closes with raw closes *on individual missing-adjustment dates*. This could fabricate return jumps. On the research branch it now consistently selects **one pricing basis for the whole dataset**, records that basis, rejects unordered/duplicate daily timestamps, and includes a regression test.

**Sources**:
- BOCPD: https://arxiv.org/abs/0710.3742
- Scientific five-year observational audit: [FIVE_YEAR_WALKFORWARD.md](FIVE_YEAR_WALKFORWARD.md)
- Label protocol: [EVENT_ANNOTATION_PROTOCOL.md](EVENT_ANNOTATION_PROTOCOL.md)

All numbers above are from the *synthetic* GitHub Actions run, not financial market-event truth or the missing dissertation.
