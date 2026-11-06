# BCPD One platform architecture

## Product boundary
BCPD One is a working research-oriented MVP. It is **not yet** a multi-tenant subscription SaaS. The functional north star is a verifiable research session: choose observations → run change-point inference → inspect parameter stability → compare markets → export source-attributed evidence.

## Modules
- `app/`: Next.js App Router pages and API. The market route uses Node.js runtime, constrained inputs and controlled source adapters; `/api/health` reports only the process heartbeat.
- `components/research-workbench.tsx`: accessible research controls and visualizations.
- `components/preset-studio.tsx`: local preset persistence and portable configuration exports.
- `lib/analysis.ts`: typed, deterministic research calculations (BOCPD, harmonization, correlation, volatility, event windows).
- `lib/insights.ts`: descriptive before/after market diagnostics with sample sufficiency requirements.
- `lib/report.ts`: versioned, standalone observed-data evidence package.
- `lib/market-provider.js`: provider adapter with a strict market allowlist. **No free-form proxy or hidden synthetic data source**.
- `lib/presets.ts`: validated, versioned browser-only settings schema.
- `tests/`: original research engine tests and typed platform tests.

## Data and trust model
- Provider responses originate on the server. The public data endpoint exposes only allowlisted asset identifiers and time ranges.
- All prices are explicitly source-attributed; failures are reported.
- CSV files are parsed in the browser. They are not transmitted to the server and do not persist automatically.
- Presets persist only in localStorage. No account, billing, private cloud storage or collaboration claim is made.
- Research JSON reports contain underlying observed weekly close values and returns; export occurs only on user request. Users must review provider distribution rights.
- BOCPD is retrospective because it estimates variance using the full sample.

## Release gates
1. Unit tests, strict TypeScript and ESLint pass.
2. Next.js builds successfully; Vercel preview passes functionality and responsive checks.
3. API provider rate limiting and outages are exercised; CSV fallback is verified.
4. Independently inspect academic provenance, sampling, parameter calibration and result interpretation.
5. Review privacy/security and vendor licensing before enabling real customer data.
6. Merge into protected main only when CI and preview are green.

## Roadmap, not implemented
1. Authenticated organizations with per-project RBAC and audited versioned study storage.
2. Licensed market providers, durable caching, quotas and monitoring.
3. Time-based and signal-based alert rules with user consent and rate limits.
4. Billing and entitlements after product-market validation.
5. Verified historical backtesting, method comparisons and artifact integrity hashes.

Keep scope research-first. The product should never blur parameter stability into prediction accuracy or label a model change-point as a causal real-world incident.
