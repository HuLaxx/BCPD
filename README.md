# BCPD · Regime Shift Laboratory

A functional, browser-based Bayesian online change-point detection application, built from a repository that previously contained only .gitkeep.

## Features
- Import a one-column numeric CSV or date,value series, or use a reproducible synthetic sample.
- Run Bayesian online change-point detection with a Gaussian known-variance observation model and Normal prior over the changing segment mean.
- Inspect observed signals, posterior reset probabilities and a recent run-length posterior heatmap.
- Adjust hazard, observation variance and peak threshold; export a CSV report.
- Entire calculation happens in the browser. No account or external data processor.

## Run locally
From repository root: python -m http.server 4173 --directory site
Open http://localhost:4173.

## Tests
Node.js 20+: node --test tests/bocpd.test.mjs

Tests cover posterior normalization, change response, input validation and peak extraction. They do not establish scientific benchmarking.

## Assumptions and caveats
The model assumes a constant hazard, a Gaussian observation model with fixed known variance, and a Normal conjugate prior over segment mean. It caps run-length hypotheses for browser performance. Changes in variance, trends, seasonal structure or heavy tails may create misleading peaks. Results are model-conditional, not ground-truth changepoint labels.

## Vercel
vercel.json configures a static build of site/. Connect this repository and deploy the main branch. No credentials are needed.

**Current status:** Committed application and tests; live deployment still requires verification.

Built by Rahul Khanke / HuLaX.
