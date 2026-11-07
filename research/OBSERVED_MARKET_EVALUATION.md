# BCPD One — Three-model observed time-series evaluation

**Run date:** 2026-11-07 UTC · **Status:** Confirmed Python execution of observed-data *alarm-count* comparison. **NOT a verified accuracy benchmark.**

## What is a time series here?

Each row is an actual provider-observed daily closing price for a dated financial market. Prices are grouped into Saturday-ending UTC calendar weeks using the **last real close** (without inventing weekend equity closes). For consecutive weekly closes (P_t), our observation is the percentage **log return**, `100 × ln(P_t / P_(t-1))`. We detect possible *changes in the process that generates these returns*. This is **time-series change-point analysis**, not an implemented or validated future-price forecast.

- **Gaussian Bayesian online change-point detection (BOCPD):** conditional posterior reset probabilities under a fixed, training-fitted Normal/Normal model.
- **Two-sided CUSUM:** cumulative standardized positive/negative mean-shift evidence using a training-fitted reference.
- **Rolling variance ratio:** differences between past and current 12-week sample variances; this detector has a different statistical target from the first two.

## Historical input and evaluation protocol

**Data:** 2-year daily historical price responses, attributed by the BCPD One production market API to **Yahoo Finance unofficial chart data**; an independent vendor cross-check has *not* yet been completed.

| Market | Daily observed prices | Excluded provisional daily rows | Complete weekly closes | Weekly returns |
|---|---:|---:|---:|---:|
| S&P 500 (us) | 501 | 5 | 104 | 103 |
| Bitcoin (btc) | 731 | 7 | 104 | 103 |
| Nifty 50 (in) | 495 | 5 | 104 | 103 |

Provider response snapshots were retrieved on 2026-11-07 UTC. **Last complete UTC week: 2026-10-31.** The ongoing 2026-11-07 week was excluded. The Python evaluation used **51 fit weeks**, **21 threshold-calibration weeks**, and **31 untouched test weeks** (2026-04-04 to 2026-10-31). Observation-variance and prior parameters use fit data only.

Calibration selected the lowest threshold from each model's predeclared grid for which **at most 2 alarms** occurred in the 21-week calibration segment (corresponding to a target of 6 alarms per 52 weeks, rounded down). This matches an **unlabeled alarm-count budget**, *not* a verified false-positive budget. Sequential model state was carried through into the test period.

## Python benchmark results

The exact `research.observed_cohort` command was executed in GitHub Actions on commit `c6209afe`; the [research workflow](https://github.com/HuLaxx/BCPD/actions/runs/42411988972) succeeded. It also passed 37 Python unit tests. The independent first-pass calculation matched each Python count, threshold, and test alarm date.

| Market | Detector | Threshold | Calibration alerts / allowed | Held-out alerts | Annualized held-out alarm count |
|---|---|---:|---:|---:|---:|
| S&P 500 | BOCPD | 0.02 | 1 / 2 | 3 | 5.03 |
| S&P 500 | Rolling variance | 0.8 | 2 / 2 | 5 | 8.39 |
| S&P 500 | CUSUM | 0.5 | 2 / 2 | 4 | 6.71 |
| Bitcoin | BOCPD | 0.04 | 2 / 2 | 3 | 5.03 |
| Bitcoin | Rolling variance | 0.6 | 2 / 2 | 4 | 6.71 |
| Bitcoin | CUSUM | 2.0 | 2 / 2 | 2 | 3.35 |
| Nifty 50 | BOCPD | 0.02 | 2 / 2 | 4 | 6.71 |
| Nifty 50 | Rolling variance | 0.8 | 2 / 2 | 5 | 8.39 |
| Nifty 50 | CUSUM | 0.5 | 2 / 2 | 5 | 8.39 |
| **All markets** | **BOCPD** | Market-specific | — | **10** | Do not aggregate rates across markets |
| **All markets** | **Rolling variance** | Market-specific | — | **14** | Do not aggregate rates across markets |
| **All markets** | **CUSUM** | Market-specific | — | **11** | Do not aggregate rates across markets |

The table reports **alarm volume**. Fewer alarms are not necessarily better: a detector could miss important changes while producing fewer signals. In several markets the held-out annualized count exceeded the six-per-year **calibration** target. This is evidence that a short calibration segment does not reliably control future alarm volume.

### Actual held-out candidate alert windows (UTC Saturday week-end)

- **S&P 500** — BOCPD: 04 Apr, 06 Jun, 08 Aug 2026. Variance: 18 Apr, 16 May, 13 Jun, 11 Jul, 31 Oct. CUSUM: 11 Apr, 09 May, 06 Jun, 08 Aug.
- **Bitcoin** — BOCPD: 11 Apr, 06 Jun, 22 Aug. Variance: 02 May, 30 May, 25 Jul, 22 Aug. CUSUM: 06 Jun, 22 Aug.
- **Nifty 50** — BOCPD: 11 Apr, 16 May, 25 Jul, 03 Oct. Variance: 11 Apr, 09 May, 04 Jul, 01 Aug, 29 Aug. CUSUM: 04 Apr, 02 May, 25 Jul, 12 Sep, 10 Oct.

These are **candidate model alerts**. We have **not independently associated them with verified exogenous events, true regimes or trading signals**.

## Provenance and reproducibility risk

The first Python observed-data run [GitHub Actions 42411881137](https://github.com/HuLaxx/BCPD/actions/runs/42411881137) recorded:

- S&P 500 local CSV SHA-256: `4881284572cc5613664256e1363bf31399177880f1d55c258f8b7b914f6ec833`
- Bitcoin local CSV SHA-256: `5196ce533bb227d27667c4328c92a285953b6e56e2c1b0c92dd0e8adae8f431b`
- Nifty 50 local CSV SHA-256: `cfdedc2fe671897791765ef1280757466e34a55b38c5300697f2a3c68f12f02c`

The second [Python observed run 42411988972](https://github.com/HuLaxx/BCPD/actions/runs/42411988972) recorded **the same model alert results** but a **different Bitcoin CSV SHA-256**: `a05bd63c5b3618a485350d51e10bf270e1fbef8265d7817f13f41117d2bb039a`. The cause is unknown without both immutable raw snapshots. Possible differences include upstream data revisions or one observation update; no specific explanation is claimed. The market API is not a permanent research-data archive.

**For publication-grade reproducibility:** store legally permitted raw input snapshots in controlled, versioned storage with a source ledger and immutable hashes. Repeat the same exact Python evaluation against those saved files. Do not commit licensed raw price data into a public repository or treat changing fetch results as identical data.

## What the current experiment cannot establish

- No independently sourced event labels → **precision, recall, F1, true/false positives and detection delay are unknown**.
- No five-year daily reference dataset → original five-year thesis validation is **not reproduced**.
- No pre-registered cross-regime multi-fold validation, confidence intervals, independent vendor cross-check, or fair statistical superiority test.
- CUSUM and BOCPD primarily target mean changes; rolling variance targets volatility. A ranking requires predeclared separate mean/variance objectives.
- The comparison is descriptive retrospective research, **not verified market forecasts, an investment system, or proof of the portfolio's historical 35% figure**.

## Reproduce the protocol

```bash
python -m unittest discover -s research/tests -v
# Recommended: capture legal daily inputs once and retain their local provenance files.
python -m research.market_snapshot --asset us --range 2y --out-dir local-data
python -m research.market_snapshot --asset btc --range 2y --out-dir local-data
python -m research.market_snapshot --asset in --range 2y --out-dir local-data
python -m research.observed_cohort --assets us btc in --snapshot-dir local-data --out artifacts/observed-cohort.json
```

`python -m research.observed_cohort --fetch` is an *on-demand smoke test*, not an immutable scientific replay. The optional source-dependent GitHub Actions job can be started manually using **workflow_dispatch**; it is deliberately **non-gating** so an unofficial external provider outage does not obscure deterministic software test results.

## Priority next steps

1. Establish licensed, immutable five-year **daily** datasets and cross-verify timestamps/adjustment conventions against a second provider.
2. Define independent regime/event labels for distinct **mean and variance** changes, including negative controls.
3. Evaluate multiple chronological walk-forward folds and confidence intervals, with calibration rules frozen before each test fold.
4. Measure detection delay, precision, recall, false-alert burden and robustness under an objective matched alert budget.
5. Only then make empirical accuracy comparisons or integrate validated signals into the production application.

**Release status: research investigation only. Draft PR #3 remains unmerged.**
