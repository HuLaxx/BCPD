# Five-year daily walk-forward: measured cohort results

**Status: five-year input acquisition and walk-forward ALARM COMPARISON executed. No empirical detector accuracy is established.**

**Run:** [GitHub Actions 42413004749](https://github.com/HuLaxx/BCPD/actions/runs/42413004749), 2026-11-07 UTC. Optional five-year daily-source job succeeded. An initial test expectation error in the same commit was fixed; the next [Python run 42413085093](https://github.com/HuLaxx/BCPD/actions/runs/42413085093) passed all **46 tests**, and also reran the source job successfully.

## Scope and provenance

- **Real observed data (unofficial):** direct Yahoo Finance chart responses, **five-year daily bars**, independently retrieved by \`research.five_year_source\` for the S&P 500 (\`^GSPC\`), Bitcoin (\`BTC-USD\`) and Nifty 50 (\`^NSEI\`).
- **Time series:** daily positive closes → last actual observed close in each fully completed UTC Saturday-ending week → percentage weekly log returns.
- **Lookahead protection:** snapshot UTC capture date controls the end-of-week cutoff. Incomplete weeks are excluded. BOCPD Normal prior and observation variance, and the CUSUM mean/scale, are refitted only on history available before the fold's calibration interval.
- **Five-year scale:** each market produced **259 weekly returns** on the checked retrieval.
- **Walk-forward:** expanding-origin fitting with **26-week calibration**, **26-week non-overlapping held-out tests**, and initially **104 fit weeks**. The 259-return series permits **four complete holdout folds**. Earlier test windows can become fit observations in later folds; test outcomes are not used to select thresholds for the current fold.
- **Calibration:** an unlabeled target of six alerts per 52 weeks, enforced within each calibration fold. A detector that cannot satisfy this is rejected rather than silently compared.
- **Model intent:** Gaussian BOCPD and CUSUM target shifts in the return mean; rolling variance targets volatility. Alarm counts are not comparable measures of scientific superiority.

## Observed five-year result

Numbers are the **mean count of test alarms per 52 held-out weeks across four walk-forward test folds**. Parentheses show **seeded descriptive fold-bootstrap bounds**, *not a confidence interval with guaranteed coverage*: folds share training histories and there are only four per market.

| Market | BOCPD | Two-sided CUSUM | Rolling variance |
|---|---:|---:|---:|
| S&P 500 | **5.0** (4.0–6.0) | **4.5** (1.5–7.0) | **4.5** (1.0–9.5) |
| Bitcoin | **3.5** (2.5–4.0) | **4.0** (1.0–7.0) | **5.0** (4.0–6.0) |
| Nifty 50 | **5.5** (3.0–8.5) | **5.5** (3.0–7.5) | **5.5** (3.0–8.0) |

**Do not infer that BOCPD wins or that any model predicts returns.** A detector that never fires has zero alarms, but it can miss every meaningful regime change. There are no reviewed, complete event labels to determine whether these alarms are true/false positives, compute detection delays, or estimate precision/recall/F1.

### Source hashes from the first successful five-year diagnostic

The job did **not** publish raw source data to a public GitHub artifact; it logged the local CSV SHA-256 for audit only.

| Market | SHA-256 of that job's local daily CSV |
|---|---|
| S&P 500 | \`2616a51ae6b074f33ff78311213268519823dc37149153dc860720d997b0bcec\` |
| Bitcoin | \`c259787637de8887b6c85fbfc2c724aa2a880d20b6addcbe8b48dfcae715b6af\` |
| Nifty 50 | \`e8a89d6e3ff9ea3174df87297f41da228fe76d4a345be1e3a0a2138a20c6174d\` |

These hashes document which observations *were used*, but **cannot substitute for retaining licensed, immutable input files**. A subsequent fetch may contain revisions, which happened during the earlier two-year Bitcoin checks. The source API is unofficial and the adjusted-price conventions, exchange-local timestamps and redistribution rights require external verification.

## Reproduce on *permitted, fixed* historical data

Python 3.11+; no third-party Python packages are necessary for this research protocol.

~~~bash
# Collect from the allowlisted source only if you have permission to do so;
# historical daily CSVs and source sidecars are excluded from public Git.
python -m research.five_year_source --asset us --out-dir local-data
python -m research.five_year_source --asset btc --out-dir local-data
python -m research.five_year_source --asset in --out-dir local-data

# Evaluate exactly the saved files, not another live provider response.
python -m research.walkforward_cohort \
  --snapshot-dir local-data \
  --out artifacts/five-year-cohort.json

python -m unittest discover -s research/tests -v
~~~

The optional **manually dispatched** GitHub Actions source check uses \`--fetch\` and temporary storage, deliberately deleting provider files after summarizing them. It is not an immutable scientific rerun and never certifies model accuracy.

## Scientific requirements before declaring a winner

1. Independently verify snapshots against another licensed source and preserve actual source files under controlled access.
2. Pre-register the detection target, threshold selection, event matching tolerance, and a complete event-label annotation policy **before reviewing model-alert dates**.
3. Blind two reviewers to model outputs; label mean and variance changes separately, with source references, coverage boundaries, negative controls and adjudication of disagreements. See [EVENT_ANNOTATION_PROTOCOL.md](EVENT_ANNOTATION_PROTOCOL.md).
4. Check multi-period calibration drift and compare all methods against a truly matched **held-out false-positive budget**, using independently verified labels.
5. Quantify uncertainty with more independent time blocks/markets and report failure modes. The current four dependent folds cannot support strong statistical confidence claims.
6. Review BOCPD recursion and predictive likelihood against independent academic derivations and benchmark implementations.

**Release decision:** phase milestone achieved as an *engineering/data evaluation*. Independent event accuracy, validated superiority and startup-grade production integration remain explicitly blocked. Draft PR #3 is not merged.
