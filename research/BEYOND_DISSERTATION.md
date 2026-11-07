# BCPD One / Beyond the dissertation

## Product direction

We cannot recreate an unavailable 2025 MSc thesis, and we will **not** adopt the portfolio's 35% improvement as a proven benchmark. We can build a **better-documented, independently testable successor** that expands on the research question and eventually becomes a credible market-regime intelligence platform.

**Research question:** Given a stream of historical returns, which methods recognize persistent shifts while controlling false alarms, avoiding hindsight bias, and remaining explainable under different markets and volatility regimes?

### What the independent Python research branch currently adds

| Foundation | Implementation | Interpreting the outcome |
| --- | --- | --- |
| Bayesian online mean-shift detector | Stdlib Gaussian/Normal run-length model with training-fitted prior/variance | Independent prototype; neither original PyMC3 parity nor calibrated real-time claims |
| Rolling variance baseline | Difference of trailing window variances | Detects volatility changes, *not* an apples-to-apples mean-shift benchmark |
| Two-sided CUSUM baseline | Train-only mean/scale and sequential standardized alarm statistic | Mean-shift comparator; no test data used to fit the reference |
| Evaluation | Chronological train/test, one-to-one matching, precision/recall/F1, post-event detection delay, false alarms | Explicit fixed thresholds; not tuned on holdout |
| Synthetic stress lab | 260-week seeded price scenarios with known ground truth, 3 changed-regime cases and 3 controls | **Synthetic data only**; not proof of performance on financial observations |
| Provenance | SHA-256 of CSV inputs, source references for event labels, JSON audit | Labels need independent validation before scientific claims |
| Release safety | Dedicated branch, draft PR, tests, no changes to live Vercel production | CI remains separately subject to GitHub runner availability |

### Stress-test cases

1. **Abrupt mean changes**: two known switches in expected weekly return.
2. **Volatility changes**: two known switches in dispersion, without mean switching.
3. **Combined change**: simultaneous mean and variance shifts.
4. **Stationary control**: no structural event; **all** alerts are false alarms.
5. **Isolated outliers**: short, high-amplitude shocks without a lasting regime switch.
6. **Gradual drift**: smooth changing trend; no single objectively defined event.

Every scenario has a fixed RNG seed and is regenerated from code. Prices are mathematical simulations, **not supplied by Yahoo, CoinGecko or any actual stock exchange**. The source strings for event labels clearly mark them as synthetic. Thus a five-year-*sized* run is not the original five-year market study.

### Run with Python 3.11+

~~~bash
python -m unittest discover -s research/tests -v
python -m research.stress_test --seeds 3 --out artifacts/synthetic-stress.json
python -m research.benchmark --prices /path/to/real_prices.csv --out artifacts/observed-audit.json
~~~

Only add \`--events /path/to/independently-sourced-events.csv\` to the last command when those sources actually exist. Inputs and reports remain local unless you choose to publish them. Do not place restricted financial data or private thesis material in the public repo.

### What "better" must mean before any product claims

A credible successor should demonstrate improvements over a **matched baseline at a matched false-alarm budget**, with uncertainty estimates and independent held-out market periods. Meaningful goals are better event F1, shorter *post-event* detection delay, less false alerting on no-change controls, less sensitivity to outliers and source failures, and reproducible latency. The direction must be supported by measured results; none is guaranteed by adding technology.

**Measurement risk:** fixed thresholds in this prototype are chosen for demonstration and are not optimized on a training-only validation set. A fair performance study must tune **all** detectors on comparable validation data, freeze the settings, and evaluate once on previously unseen time blocks. Matching and smoothing windows should be defined before looking at the test outcomes. Holdout controls are essential: otherwise an apparent “improvement” could be just an increased alert rate.

### Next development gates

- [x] Inventory dissertation claims against available code.
- [x] Independent online Bayesian baseline in Python.
- [x] Separate variance and mean-shift comparators.
- [x] Deterministic synthetic stress scenarios including negative controls.
- [x] No hindsight event matching: alerts *before* a labeled event do not score as detections.
- [ ] Restore green CI and run the entire suite on a clean Python interpreter.
- [ ] Build a train-only calibration stage targeting the **same false-alarm budget** across models.
- [ ] Implement a heavy-tailed predictive likelihood variant (e.g. Student-t) and a robust outlier policy.
- [ ] Archive permitted, timestamped S&P 500/crypto history with provider metadata and adjustment conventions.
- [ ] Design independent event annotations and truly chronological walk-forward validation.
- [ ] Produce confidence intervals across datasets/seeds and report negative results.
- [ ] Expose research-grade model selection and methodology summaries in BCPD One's existing UI.
- [ ] Validate streaming ingestion, online update cost and alert deduplication before claiming real-time operation.

## Source references

- Adams, R. P., and MacKay, D. J. C. (2007), *Bayesian Online Changepoint Detection*, https://arxiv.org/abs/0710.3742
- Alami, R., Maillard, O., and Féraud, R. (2020), *Restarted Bayesian Online Change-point Detector achieves Optimal Detection Delay*, https://proceedings.mlr.press/v119/alami20a.html

These sources motivate a scientific protocol; they are not evidence that our code reproduces their experimental results.

**Status:** research prototype, not a production trading strategy or a validated dissertation reproduction.
