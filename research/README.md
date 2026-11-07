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
