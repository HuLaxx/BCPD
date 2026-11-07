# BCPD One — Regime Intelligence

Research-grade Bayesian change-point exploration across nine national equity indices and a selected five-cryptocurrency cohort.

## Architecture

- **Next.js App Router / React / TypeScript**: a production-oriented modular application.
- **Tailwind CSS v4 + bespoke dark design system**: responsive research workspace.
- **Recharts**: interactive observed weekly log returns and posterior reset probabilities.
- **TypeScript research domain** in `lib/analysis.ts`: Gaussian mean-shift BOCPD, nine-setting hazard/noise sensitivity, sample volatility, pairwise correlations and shared shift-event clustering.
- **Node.js route handler** at `/api/markets`: source-attributed historical chart responses from the existing whitelisted Yahoo Finance adapter, with optional one-year CoinGecko Demo fallback.
- **Classic Bayesian laboratory** preserved at `/lab.html` and original research implementation retained in `site/` for reproducibility.
- **CI checks**: original numerical tests, new TypeScript research tests, type checking, linting and Next.js production build.

### Run locally

Requires Node.js 20.9 or newer, with package registry access.

```bash
npm install
npm run dev
# visit http://localhost:3000
```

```bash
npm run verify
```

### Working workflow

1. Select one or more indices or cryptoassets, date range and BOCPD settings.
2. Run the study: the app requests observed historical closing prices and independently reports failed providers.
3. Examine posterior reset probabilities, sensitivity-stable candidate breaks, pairwise return correlations, trailing annualized volatility and temporal clusters of shared peaks.
4. Export an attributed CSV for reproducibility.
5. When a provider cannot supply data, upload a local `date,close` CSV. The local override never leaves the browser.

A 20-week return minimum applies before running a model. Market series are aligned to Sunday–Saturday UTC weeks using the last **observed** close, with no synthetic weekend fills.

### Data and methodological limitations

- Yahoo Finance chart data is an **unofficial** and potentially rate-limited data source, not a licensed feed. CoinGecko fallback requires `COINGECKO_DEMO_API_KEY` on the server and is limited to a one-year crypto window.
- The cohort of five cryptoassets is fixed for research; it is not a current capitalization ranking.
- Posterior reset probabilities are model conditional, not calibrated certainty about real-world events. Sensitivity agreement across 9 settings is **not** predictive accuracy.
- The model estimates fixed observation variance using the entire return series and estimates its prior mean from the first observations, making the current study **retrospective** rather than leakage-free real-time prediction.
- Pairwise correlation uses only common dated weekly returns and is not causal; annualized historical volatility is not a risk forecast.
- The user’s original dissertation source data and verified assessment metrics are not present here. Nothing is represented as replicated dissertation findings.
- The source adapter's rate limits and network availability depend on where Vercel runs. Users should validate data provenance before any academic publication.

## Production follow-up

- Archive verified source snapshots and methodology-specific benchmark datasets.
- Introduce walk-forward evaluation and alternate change-point models.
- Add provider health monitoring, caching policy reviews and operational error budgets.
- Add accessible, interactive event drill-down and automated visual regression tests.

Built from [HuLaxx/BCPD](https://github.com/HuLaxx/BCPD). This is research software, **not financial advice**.


## Workspace functionality (v1.1)

BCPD One can save up to 30 **named research presets** in your browser (market identifiers, history window, hazard and posterior threshold). Apply them to restart a study or export the preset list as JSON. This is **local browser storage**, not cloud synchronization or user accounts. Imported CSV data is deliberately excluded from saved presets and exports.

The research workbench now displays an **eight-observed-week diagnostic** before and after sensitivity-stable change-point candidates, including mean weekly return and annualized sample volatility. An event must have at least six observed weeks on each side to be displayed. These are descriptive differences, not calibrated event significance or trading signals.

The history request pipeline limits concurrent upstream requests to three. The `GET /api/health` endpoint is an application heartbeat; it explicitly does not claim that external market-data providers are healthy.

### Startup roadmap (not implemented)

- Authentication, organization workspaces and permissioned cloud study storage
- Licensed datasets and scheduled source snapshots, vendor terms and audit trails
- Real-time notification policies, team review and collaborative research
- Billing, subscription tiers and multi-tenant limits
- Independent, genuinely out-of-sample model benchmarks

These items require product and infrastructure decisions; the project does not claim they already work.

## Inspect, document and export results

- Select a loaded asset to inspect posterior reset probability, observed returns, and before/after summaries of stable shift candidates.
- Export a CSV or a **versioned JSON research report** containing market identifiers, observed weekly closes and log returns, model probabilities, source labels, observation times, sensitivity parameters, and candidate peaks.
- `/methodology` explains the statistical assumptions and why this is retrospective evidence, not a predictive trading system.
- `/privacy` describes local storage and CSV processing. It does not claim to replace an organization-grade legal privacy policy.
- `docs/ARCHITECTURE.md` details the build boundary, data/trust model, release checks and unimplemented multi-tenant features.

**Important deployment status:** GitHub Action and Vercel previews still need a successful green build. Do not interpret commits in this branch as a production release.
