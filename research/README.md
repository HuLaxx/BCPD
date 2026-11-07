# BCPD dissertation-reproduction protocol (phase 1)

This directory is an **independent, dependency-free Python BOCPD prototype** and a transparent comparison protocol. It is **not** the missing MSc dissertation's original PyMC3/NumPy implementation, and no scientific result or claimed 35% improvement is verified here.

## What we found

The public portfolio's Education entry describes a 2025 University of Glasgow MSc dissertation on Bayesian change-point detection across S&P 500 and cryptocurrency time series. It claims a custom Python/PyMC3/NumPy model, five years of validation, a real-time capability, and 35% better performance than a sliding-window variance baseline. The BCPD One `main` branch instead contains a TypeScript Gaussian mean-shift research engine and historical provider integrations. We found **no original thesis PDF, Python notebook, archived experiment data, event labels, baseline scores, or definition of the 35% comparison metric** in the accessible sources. Existing BOCPD One outcomes are retrospective and do not establish model parity.

## Protocol already implemented here

- Accept **date,close** CSV values; reject duplicates, invalid dates and nonpositive prices. Aggregate observed closes to UTC Saturdays with **no filled prices**, then use percentage weekly log returns.
- Split weekly returns chronologically into training and held-out test partitions. Fit the Gaussian observation-variance and Normal-prior parameters on the training partition only. Keep these parameters fixed during sequential BOCPD inference. This implementation uses Python standard library and is intentionally **not represented as PyMC3**.
- Compare against a simple, explicitly defined **rolling variance-shift** baseline that uses trailing windows, not future data. This is a protocol baseline, not necessarily the baseline used in the thesis.
- If independent **date,source** event labels are supplied, perform one-to-one event matching within a declared week tolerance, calculate precision, recall, F1, and signed detection delay. Defaults are illustrative prespecified thresholds, not training-optimized parameter choices. A numerical comparison is an exploratory output **until thesis-metric parity and event sources have been independently verified**.
- Record SHA-256 hashes of input files, model parameters, training/test split, dates, thresholds, and event sources in a versioned JSON report. The `verified` field deliberately stays `false` even if labeled events are present.

## Run without external dependencies

Requires Python 3.11+.

```bash
python -m unittest discover -s research/tests -v
python -m research.benchmark --prices /path/to/observed_prices.csv --out /path/to/audit.json
python -m research.benchmark --prices /path/to/observed_prices.csv --events /path/to/independent_events.csv --out /path/to/labeled_audit.json
```

The `--prices` CSV must have `date,close` headers and at least 40 usable weekly returns after alignment. Example header only (no example prices are treated as evidence):

```csv
date,close
```

For an independently sourced event-label CSV:

```csv
date,source
```

An event source must cite an independent reference. The evaluation requires at least one independently labeled event within the held-out test partition. No labeled data are bundled and no performance score is computed without them.

### Reproducibility guardrails

1. Do not select or change a threshold after seeing held-out results. Before any research claim, choose thresholds with a strictly training-only validation partition or a pre-registered protocol.
2. “35% improvement” is **undefined** until we identify whether the original metric meant detection delay, F1, recall, false alarms, MAE, speed, or another quantity, along with its denominator and comparison window.
3. This is an experimental Gaussian **mean-shift** model. A rolling-variance baseline targets a different statistical feature; a meaningful dissertation replication requires the actual equations and an appropriately matched set of comparators.
4. A constant-hazard finite-run-length approximation is used for numerical tractability. Any theoretical derivation, prior hyperparameter values and truncation choices require independent documentation.
5. Five years of available historical API data do not by themselves reproduce five years of original benchmark results. Archive source-adjustment conventions, exact symbols, observation timestamps, and licensed data snapshots.
6. “Online recursion” is not the same as a verified **real-time production streaming service**. A genuine real-time claim needs timestamped end-to-end ingest/update latency evidence.

## Original materials needed to proceed

1. Final PDF dissertation and methodology chapter / appendix (equations, priors, parameter choices).
2. Original `.py`, `.ipynb`, or source archive and package or environment lockfile (PyMC3 version important).
3. Raw/processed S&P 500 and cryptocurrency datasets with five-year date span and provider attribution.
4. Sliding-window baseline implementation, labels and reported benchmark outputs/figures, including the definition of the **35%** claim.
5. Train/test/validation split rules, random seeds, evaluation event timestamps, and recorded uncertainty estimates.

Do not commit copyrighted thesis pages, redistributable restricted market datasets or private research assets to the public repo without permission. Transfer sensitive originals privately and keep public GitHub limited to code, non-sensitive metadata, and permitted reproducibility artifacts.

## Beyond-dissertation experiments (new)

This independent protocol now compares **Gaussian BOCPD**, a **rolling variance ratio**, and **two-sided CUSUM** (a mean-shift baseline) on chronological held-out weeks. Event matching never credits an alert that precedes the labeled event, and completely missed event sets count as zero F1.

Run a deterministic six-scenario research **stress suite**; no market downloads or external packages are required:

~~~bash
python -m research.stress_test --seeds 3 --out artifacts/synthetic-stress.json
~~~

The suite includes known abrupt mean, volatility and combined shifts, plus no-shift, outlier, and gradual-drift negative controls. It reports seeded detection metrics and false alarms. **All synthetic observations are explicitly labeled as such and are not dissertation or real-market results.**

See [BEYOND_DISSERTATION.md](BEYOND_DISSERTATION.md) for limitations and next-stage evaluation standards.

## Daily market capture and fair calibration (new validation milestone)

The existing BCPD One production market API returned real-provider daily histories for the 2-year window when checked in November 2026: 501 S&P 500, 731 Bitcoin, and 495 Nifty 50 price records. They align to 104 weekly log returns per market, with no repeated dates or non-finite returns. This **input readiness check is not an event-detection performance result** and raw API histories were not committed.

Capture a fresh daily-dated local source snapshot, preserve its provenance, then run a three-way model comparison:

~~~bash
python -m research.market_snapshot --asset us --range 2y --out-dir local-data
python -m research.market_snapshot --asset btc --range 2y --out-dir local-data
python -m research.market_snapshot --asset in --range 2y --out-dir local-data

python -m research.calibrated_benchmark --prices local-data/us-2y.csv --out artifacts/us-audit.json
python -m research.calibrated_benchmark --prices local-data/btc-2y.csv --out artifacts/btc-audit.json
python -m research.calibrated_benchmark --prices local-data/in-2y.csv --out artifacts/in-audit.json
~~~

**Leakage controls:** By default, the earliest 50% of observed weekly returns fit Gaussian BOCPD and CUSUM parameters; the next 20% calibrate thresholds against a declared *unlabeled alert budget* (six alerts per 52 weeks); and the last 30% remain an untouched test block. Each detector searches a fixed candidate-threshold grid and chooses the most sensitive threshold that meets the same calibration-period alert budget. BOCPD updates are sequential and use no future return in the posterior step; its fixed prior and observation variance use only the fit partition. CUSUM restarts its decision statistic at the held-out boundary.

A missing labeled event file means the audit reports model configurations, alarm counts and data provenance, **not false-positive rates, precision, recall or F1**. Do not equate this with event-detection validation. Labels must come from independently documented sources and are not used to pick thresholds.

This protocol refuses the current five-year weekly-bar API mode because the provider may date weekly aggregate prices at the start of the week. For five-year evaluation, obtain daily-dated, authorized price snapshots or independently verify each weekly bar's actual close date. Never copy restricted data into this public repository.

The Python test suite now has additional cases for calibration-window isolation, source hashing, provenance rejection, and explicit unverified reports. Run locally: `python -m unittest discover -s research/tests -v`.

**CI restored:** GitHub account billing access was resolved sufficiently for runners to execute. On 2026-11-07 the latest research run passed 37 Python unit tests, and Next.js test/type/lint/build gates passed. A separate, optional observed-data job executed the actual Python three-model comparison against live API inputs. See [OBSERVED_MARKET_EVALUATION.md](OBSERVED_MARKET_EVALUATION.md). The draft research PR remains unmerged and the live production application is unchanged.

## Re-running the three observed-market models

To run from **immutable, privately stored** daily price snapshots:

```bash
python -m research.observed_cohort --assets us btc in --snapshot-dir local-data --out artifacts/observed-cohort.json
```

To conduct a **non-reproducible fresh provider smoke test** with temporary raw prices deleted after evaluation:

```bash
python -m research.observed_cohort --fetch --assets us btc in --out artifacts/observed-cohort.json
```

The output provides calibrated thresholds, exact UTC alert week-ends, daily source CSV SHA-256, alarm counts and held-out alarm rates. It explicitly omits precision, recall and F1 when no independently labeled events exist. For dataset rights and comparative evidence see [OBSERVED_MARKET_EVALUATION.md](OBSERVED_MARKET_EVALUATION.md).

## Five-year daily walk-forward milestone

The research-only `research/five_year_source.py` supports a deliberately allowlisted 5-year **daily**, not weekly, source path for S&P 500, Bitcoin and Nifty 50. It is **not** the deployed application's five-year endpoint and does not modify the production dashboard.

```bash
python -m research.five_year_source --asset us --out-dir local-data
python -m research.five_year_source --asset btc --out-dir local-data
python -m research.five_year_source --asset in --out-dir local-data
python -m research.walkforward_cohort --snapshot-dir local-data --out artifacts/five-year-cohort.json
```

The latest GitHub Actions diagnostic confirmed **259 weekly returns and four non-overlapping 26-week held-out folds** on each of three unofficial market histories, with descriptive fold-bootstrap alarm-count intervals. This is an observed-data **alarm-volume** milestone, not scientific event accuracy. See [FIVE_YEAR_WALKFORWARD.md](FIVE_YEAR_WALKFORWARD.md) for the detailed table, source hashes and limitations. For future verified target labels, see [EVENT_ANNOTATION_PROTOCOL.md](EVENT_ANNOTATION_PROTOCOL.md). The external source smoke job is manually triggered rather than part of routine PR CI.
