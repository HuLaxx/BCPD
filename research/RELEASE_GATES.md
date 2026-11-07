# BCPD One — Non-negotiable research release gates

**Status:** NOT RELEASE APPROVED. The research PR must remain draft until the evidence below is independently verified. Passing software tests alone is not sufficient to claim scientific superiority or a deployable trading signal.

## Gate A — Correctness of numerical research

- [ ] Python 3.11 and 3.13 deterministic tests pass on clean installs, with visible logs and archived results.
- [ ] Independent reviewer checks Bayesian likelihood, prior, hazard semantics, run-length update and numerical stability against published derivations.
- [ ] Comparator parameters are fitted using training data only; all models are evaluated with identical observation splits and correctly initialized streaming states.
- [ ] One-to-one event matching is **causal** (early alerts do not score as detections), maximizes matched events, and minimizes detection delay for tied cardinality. Brute-force verification includes overlapping event windows.
- [ ] Invalid inputs, empty histories, duplicates, nonpositive prices, missing labels and unsupported calendar intervals fail clearly rather than producing confident-looking output.
- [ ] Sensitivity to the prior, hazard, variance, clipping, alert cooldown and missing observations is documented, including failures and false alerts.

## Gate B — Observed market data and provenance

- [ ] At least three independently documented real-market histories (S&P 500, Bitcoin, Nifty 50 as an initial cohort) are archived with source, retrieval timestamp, original date conventions and exact SHA-256 hashes.
- [ ] Verify source corporate-action adjustments, market holidays, mixed stock/crypto calendars, zero/duplicate close handling and timezone conventions.
- [ ] Confirm legal right to collect and store the underlying market data; vendor restrictions are not bypassed by exporting through the app.
- [ ] A second source or manual spot checks independently corroborate selected historical observations and any detected event dates.
- [ ] Dataset snapshots are stored outside public Git unless redistribution is permitted. Model evaluations never silently refetch or change source data.

## Gate C — Fair scientific evaluation

- [ ] Preregister the detection target (mean change, variance change, or both) and comparator selection. BOCPD, rolling variance and CUSUM measure different features.
- [ ] Fit, calibration and holdout partitions are **strictly chronological**. Hyperparameters are frozen before holdout evaluation.
- [ ] Any common alert budget is met by all detectors on the **calibration** partition; otherwise fail closed. Alert count in unlabeled data is NOT a false-positive rate.
- [ ] Score event precision, recall, F1, post-event detection delay and false alarms only when event sources are independent, timestamped and verified; report missing labels as unverified.
- [ ] Report performance separately by market and regime; do not average over failed or missing examples.
- [ ] Estimate uncertainty across multiple non-overlapping periods, seeds/markets and realistic drift; include stationary and isolated-shock negative controls.
- [ ] Publish no "35% better", "real-time validated", "dissertation parity", or "production alpha" claims without actual independently reproduced source evidence.

## Gate D — Platform engineering, operations and safety

- [ ] GitHub Actions runner is allocated; **all** required Python, Node, lint, typecheck, unit and production-build jobs complete green.
- [ ] No high/critical dependency vulnerabilities; restricted datasets and credentials never appear in logs, Git commits or browser responses.
- [ ] Provider failures, rate limits, stale data, partial market coverage and offline mode are exercised in an independent environment.
- [ ] End-to-end accessibility, performance, security headers, cross-device UX, data export and import validation are independently checked.
- [ ] Vercel preview corresponds to exact reviewed commit SHA; smoke tests compare the deployed health/API behavior with the release artifact.
- [ ] Rollback and incident response are documented. Main and production deploy only after written signoff and verified preview.

## Current evidence

| Category | Observed evidence | Verdict |
| --- | --- | --- |
| Historical API readiness | 2-year daily Yahoo chart responses returned 501 S&P 500, 731 Bitcoin and 495 Nifty observations; each aligned to 104 weekly returns | **Input readiness only**, not benchmark proof |
| Independent Python model | Gaussian/Normal online BOCPD prototype exists; custom code and synthetic tests | Original dissertation parity unknown |
| Event scoring | Replaced greedy matching with causal max-cardinality/min-delay dynamic programming and new brute-force regression cases | Focused local regression passed; complete latest branch CI still red |
| Calibration | Train-only alert-budget selection; hard failure when the common calibration limit cannot be met; continuous state across test boundary | Implemented; full branch CI not yet verified |
| CI workflows | GitHub runners now execute. 46 Python tests passed on 2026-11-07; Next.js quality checks have passed on prior research commits | **Engineering gates reactivated; scientific review remains open** |
| Production | Research PR is draft, not merged; BCPD One main remains unchanged | Live website does **not** include this research upgrade |

## Required accountable signoff

A release note must record: exact commit SHA, source dataset hashes, Python/Node versions, an independently reproduced model/baseline audit, CI run URLs, Vercel preview URL, known limitations, a rollback commit, and explicit approval by the project owner. No checklist item may be marked complete solely because a feature was committed.

This document is a **gate**, not a marketing promise of perfection. No software/model can be guaranteed defect-free; the goal is to eliminate unexamined claims and prevent known unresolved critical risks from reaching production.

## Five-year walk-forward evidence update

The [five-year research diagnostic](FIVE_YEAR_WALKFORWARD.md) successfully retrieved actual daily historical observations for the S&P 500, Bitcoin and Nifty 50, then ran the 3-detector Python protocol across **four disjoint 26-week held-out periods per market** (259 weekly returns per asset). The complete test suite passed **46 Python tests** on the corrected commit, and historical data remain excluded from public Git. This satisfies an *engineering demonstration of chronological evaluation*, but does **not** satisfy independent source licensing, complete event-label review, model superiority or publication-quality uncertainty. These release gates remain unchecked.
