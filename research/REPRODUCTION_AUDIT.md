# Dissertation parity audit — evidence register

**Source of portfolio description:** `HuLaxx/my-portfolio` → `src/data/fallbackContent.js` → `fallbackResume.studies[slug="msc-data-science"]`. The live portfolio may additionally be configured with Sanity CMS, so the repository's checked-in fallback is not proof of every live statement.

**Source of product implementation:** `HuLaxx/BCPD` → `main` → `lib/analysis.ts`, `lib/market-provider.js`, `tests/`, and `docs/ARCHITECTURE.md`.

This table separates a **portfolio narrative**, **code existing in BCPD One**, and **academic evidence**. “Missing” means *not found among accessible materials*, not “the dissertation never had it.”

| Portfolio claim / thesis objective | BCPD One code status | Original dissertation evidence status | What is still required |
|---|---|---|---|
| Bayesian change-point detection | Gaussian mean-shift BOCPD implemented in TypeScript | Original Python equations/code missing | Obtain PDF, prior and likelihood specification; verify numerical parity |
| Python/PyMC3/NumPy model | No original Python/PyMC3 implementation in BCPD `main` | Missing | Obtain notebooks, model definitions, exact package versions |
| S&P 500 and crypto historical data | Allowlisted Yahoo chart adapter, optional CoinGecko fallback, CSV imports | Original exact datasets missing | Document symbols, adjustments, dates and SHA256 source snapshots |
| Five-year validation | Five-year history request exists; coverage may vary by provider/asset | Five-year benchmark results missing | Archive exact windows, evaluation protocol and outputs |
| Real-time regime detection | On-demand retrospective TypeScript model; not a live stream | Latency and production proof missing | Online model verification + end-to-end streaming/latency tests |
| 35% improvement over rolling variance | No benchmark of that claim | Undefined metric, numerator and denominator | Obtain original baseline and figure/table; reproduce apples-to-apples out-of-sample |
| Research validity and uncertainty | Unit tests and 9-setting sensitivity analysis | Experimental validation missing | Independent event labels, holdouts, uncertainty, baselines and error analysis |
| Reproducible research interface | CSV exports, JSON report and local study presets implemented | Original result agreement unverified | Add immutable datasets/model versions and citation-ready reports |

## Current phase state

- [x] Review portfolio's accessible Education source and BCPD main implementation.
- [x] Confirm original dissertation sources are not included in accessible BCPD files or conversation uploads.
- [x] Introduce a separate Python protocol and deterministic software tests, without changing production.
- [x] Define baseline formula, training/test split, event-matching metrics, and provenance requirements.
- [ ] Obtain original dissertation PDF and source notebooks from the researcher.
- [ ] Reproduce original numerical experiments with exact saved inputs.
- [ ] Verify reported improvement metric, benchmark and the 35% numerator/denominator.
- [ ] Match original PyMC3 posterior outputs against archived figures and values.
- [ ] Validate online/real-time claims with a leakage-free protocol.
- [ ] Publish only independently verified findings and amend portfolio language as needed.

**Decision gate:** Do not publish a claim of “35% improvement”, “dissertation reproduction”, or “real-time validated” on the strength of this independent protocol alone.

## November 2026 validation update

- [x] Captured **API-level evidence** that daily 2-year provider responses for S&P 500 (501), Bitcoin (731) and Nifty 50 (495) can be aligned into 104 finite weekly log returns each; no model accuracy yet.
- [x] Implemented three-way fit/validation/test protocol and equal **calibration-period alert count** budgets (not a claim of equal false-positive rates).
- [x] Implemented local-only daily snapshot capture, SHA-256 sidecars and source-interval/date validation. Actual downloaded datasets are excluded from Git.
- [ ] Run the updated Python tests in a functioning execution environment; GitHub Actions fails before any runner step.
- [ ] Preserve authorized real market snapshots and execute the Python comparator on them.
- [ ] Acquire independently sourced held-out event labels; otherwise statistical detection F1 and false-alarm rates are undefined.
- [ ] Benchmark multiple disjoint market regimes, uncertainty, parameter robustness and cross-provider consistency.

**Do not interpret successful provider health checks or unlabeled alerts as a measured improvement over any baseline.**
