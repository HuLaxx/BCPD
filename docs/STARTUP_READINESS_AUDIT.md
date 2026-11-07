# BCPD One — startup viability and commercialization gate

**Date:** 2026-11-08
**Current decision: GO for private discovery and supervised research pilots; NO-GO for public commercial market-data or high-confidence financial-alert subscription launch.**

This is a product/hypothesis audit, not a valuation, investor endorsement, legal opinion, proof of customers, or claim of positive business economics.

## Exactly what exists today

- Public-facing **Next.js** research application with multiple selected stock and crypto markets, CSV import, charts, model sensitivity displays, local presets and exportable source-attributed reports.
- Standalone Python research modules on **draft PR #3**: Gaussian Bayesian online change-point detector, two-sided CUSUM, rolling variance, chronological calibration, synthetic negative controls and five-year observed-data walk-forward diagnostics.
- Both Python and web quality gates passed on previous branch commits; an expanded synthetic-quality CI step is now required. Vercel has **READY preview deployments** for research-branch commits, but do not conflate deployment status with a reviewed business production launch.
- Research Python runs **offline** and is **not yet integrated as a production API** or as authenticated, versioned organization research projects.
- The commercial multi-user features (accounts/organizations/RBAC, cloud persistence, invoices/entitlements, alert delivery, contract-backed market data, support and audit operation) are **not implemented**.
- There is no verified customer count, revenue, conversion, retention, pilot adoption or willingness-to-pay data in the accessible repository.

## Decision matrix

| Dimension | Evidence | Decision |
|---|---|---|
| Engineering feasibility | Real UI, historical API, exports, tested Python methods and five-year walk-forward diagnostic | **Yes — research MVP** |
| Statistical signal quality | 20-seed artificial event/negative-control experiment; significant unmatched alarms and limited synthetic F1 | **Not validated for alerts** |
| Market data legality | Existing public API fetches *unofficial* Yahoo Finance data, with commercial use/redistribution restrictions | **P0 commercial blocker** |
| Reliability | Unit/type/lint/build pass; independent price feed quality, stress/chaos tests, secure data storage and uptime unproven | **Partial** |
| Product differentiation | Specialized auditable regime analysis possible; basic dashboards/backtests already crowded | **Hypothesis, not evidence** |
| Multi-tenant SaaS product | No production org RBAC, licensed data pipeline, versioned cloud workspaces or subscriptions | **Not present** |
| Product-market fit | No documented design partners, pilots, repeat usage, paid intent or retention | **Unknown** |

## Commercial data terms: do not ignore

Yahoo publicly says Finance data must not be redistributed and restricts commercial reuse of its content/services. Its unofficial chart endpoint is not an approved startup redistribution license. Do **not** monetize the current Yahoo-based application as a commercial hosted data product, or assume derived indicators have unlimited licensing rights.

- Yahoo Finance data guidance: https://in.help.yahoo.com/kb/SLN2310.html
- Yahoo Terms: https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html
- Twelve Data says its **business** tiers handle commercial display subject to exchange rights, and redistribution requires a separate contract: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage
- Massive/Polygon says any customer-facing price redistribution needs a **commercial license**, not an individual plan: https://massive.com/knowledge-base/article/how-can-i-redistribute-massives-market-data

A safer early wedge is **bring-your-own-data** with independently checked customer usage rights and contractual/privacy safeguards. Have a qualified advisor confirm the terms for model outputs, raw chart display, historical snapshots, derived signals, source retention and any planned resale before charging.

## Proposed buyer and narrower job-to-be-done

**Initial candidate buyer:** independent quant researchers, small risk teams and portfolio research groups working with their own legally sourced time series.

**Core job:** "When a market or portfolio exposure changes, give me a traceable statistical investigation of *why the detector thinks the process may have changed*, what other detectors say, what data were used and how to reproduce the decision."

**Wedge features to test with real people**:
1. Immutable BYO source upload and explicit adjusted/raw price policy, date-calendar alignment, automated provenance ledger.
2. Side-by-side BOCPD/CUSUM/variance comparison with disclosing false alerts, missing data and model disagreements.
3. Reproducible, reviewable team reports and model/version settings (no invented calibrated certainty).
4. Collaborative review, approval history and controlled sharing after privacy/security requirements are designed.

This is an evidence/workflow proposition; it is **not** price prediction, broker execution or investment advice.

## Differentiation and competitors

- [Koyfin](https://www.koyfin.com/Pricing/) already offers charts, portfolios and advanced analysis with tiered plans. Generic dashboards are not a moat.
- [QuantConnect](https://www.quantconnect.com/pricing) offers quantitative research, backtesting, dataset access and organization tooling. General model notebooks and backtesting are not enough to stand out.
- A defensible initial advantage *could* be time-series change-point **explainability, source provenance and workflow auditability** for underserved smaller research teams. It is not verified until customers choose it over current tools.

## Proposed validation sprint (experimental hypotheses, not claims of traction)

**Gate 1 — Discovery:** interview ~10 target users with actual regime-investigation work. Observe their current workflow and artifacts; document severity, frequency, switching cost, and measurable cost of wrong or noisy alerts. At least three should volunteer a real, legally usable (or privately shared with consent) time series for controlled pilot evaluation.

**Gate 2 — Proof of workflow benefit:** run supervised BYO-data pilots with 3–5 users. Time a fixed investigation task vs their current workflow, measure source traceability and ability to reproduce findings, and log which warnings they trust or reject. Define a target and success threshold with the user **before running the pilot**, not afterward.

**Gate 3 — Scientific adequacy:** demonstrate on preregistered, properly labeled held-out data that the chosen detector/workflow meets **buyer-agreed** false-alert and missed-change limits, with honest dependence-aware uncertainty. No universal "35% better" claim.

**Gate 4 — Paid intent:** seek at least two concrete paid-pilot commitments **after** validation, with explicitly agreed scope, permitted data rights, service level and price; distinguish a verbal compliment from money or a signed paid intent.

**Gate 5 — Commercial launch:** approved data agreements, secure authentication and project isolation, data processing policies, monitored provider reliability, support and incident response, and release-specific Vercel preview plus green required CI.

Failing any gate means revise the hypothesis or stop commercial expansion rather than buying infrastructure to simulate progress.

## Highest-priority risk backlog

| Priority | Issue | Evidence required to close |
|---|---|---|
| P0 | No proven buyer or purchase motivation | Recorded user interviews, signed pilot scopes, priced intent |
| P0 | Unlicensed commercial data path | Provider/exchange contracts or legally reviewed BYO-only model |
| P0 | Low signal precision on artificial positive/negative controls | Preregistered alternative model + improved held-out matched-budget tests; [scientific audit](../research/SIGNAL_QUALITY_AUDIT.md) |
| P0 | No validated actual market-event accuracy | Blinded independent mean/volatility event annotations with negative-control periods |
| P1 | Research Python not integrated into a multi-user workflow | Versioned, reproducible background research jobs with quotas |
| P1 | No production authorization and private org storage | Auth/RBAC, secure storage, security tests, privacy/legal review |
| P1 | No reliability and source quality SLO | Staleness checks, timestamp audits, provider failsafes and incident exercises |
| P2 | Premium UI polish and growth marketing | Only after core accuracy, trust and design-partner utility |

## Immediate product decision

**Proceed with a lean, supervised BYO-data research beta** and customer discovery. **Do not launch as a paid automated trading signal or publicly redistribute unofficial price data.** A technically working tool can become startup-worthy only when a specific buyer repeatedly obtains value, trusts the evidence, and agrees to pay under a lawful data arrangement.

**Startup-worthy as an experiment: yes. Startup-proven today: no.**
