# BCPD · MSc Research Atlas

**Bayesian Change-Point Detection across global equity indices and cryptocurrencies** — a functioning interactive research application by Rahul Khanke. This site is a presentation and exploration of the user's MSc Data Science research theme, not a reproduction of dissertation data or reported results. Raw dissertation sources and ground-truth benchmark figures were not available for verification.

## Run the application

The root page is now the **Global Markets Research Atlas**, comparing nine national market indices and a fixed five-cryptocurrency research cohort. The original [single-series Bayesian lab](site/lab.html) is preserved at `/lab.html`.

Features:
- Source-attributed live-request historical price data through a serverless `/api/markets` endpoint: Yahoo Finance's **unofficial** chart API, and an optional CoinGecko Demo fallback for 1-year crypto series if `COINGECKO_DEMO_API_KEY` is supplied.
- Series included: S&P 500, FTSE 100, DAX, CAC 40, Nikkei 225, Hang Seng, Nifty 50, ASX 200, TSX Composite; Bitcoin, Ethereum, XRP, BNB and Solana. **Crypto is a fixed selected cohort—not a verified live capitalization ranking.**
- Align prices to *Sunday–Saturday UTC weeks* using each market's last actually observed close; stock exchange holidays/weekends are never forward-filled.
- Compare **weekly percentage log returns** instead of mixing unscaled raw national index levels with cryptocurrency dollar prices.
- Bayesian online change-point detection, a Gaussian mean-shift model with **fixed variance estimated from the full sample**. This is a retrospective analysis, not a leakage-free real-time trading signal.
- Nine-model parameter sensitivity grid (three hazard settings × three noise-variance scales), candidate overlap across markets, and export of observed dates, baseline probabilities and data provenance.
- **Source outage fallback**: import your own `date,close` CSV for any market. Uploaded CSVs remain client-side, and are labeled as user data rather than silently substituted for API results.

### Data-source decision

Yahoo Finance is convenient for exploratory historical national indices, but its chart endpoint is **unofficial**, may rate limit requests and does not represent licensed feeds. CoinGecko has documented crypto market APIs but free/demo plans have history and quota restrictions. For a dissertation-grade replication, use archived, traceable downloads from licensed or authorized vendors (e.g., an institutional Refinitiv/LSEG/Bloomberg subscription, official exchange data where permitted, or carefully cited datasets). Record asset identifiers, adjustments, dates, currencies, provider, retrieval time, time zone and terms. The dashboard deliberately shows failures and fallback status rather than fabricating market prices.

### Important research interpretation

This interface measures **parameter agreement**, not verified predictive accuracy, reliability of market price feeds, or an academically validated cross-country robustness score. At each event the model tests whether the posterior reset peak persists under nearby parameter settings. As its variance estimate uses the full sample, it should not be characterized as a strictly online out-of-sample predictor. Confirmed conclusions require your original dissertation methodology, evaluation criteria and archived datasets; we have not invented those.

## Develop & test

```bash
npm test                 # no dependencies to install, Node.js 20+
python -m http.server 4173 --directory site
```

The local Python static server runs UI and the original single-series lab, **not the market serverless function**. For live market data, deploy through Vercel or run Vercel's development environment. CSV fallback works without any external provider.

In Vercel, the `api/markets.js` route runs server-side. Optionally set `COINGECKO_DEMO_API_KEY` in Vercel environment variables for 1-year crypto fallback. Do not put provider secrets in client-side code.

## Deployment and scientific follow-up

- [x] Full interactive app with country indices, five-coin cohort, weekly harmonization and model sensitivity.
- [x] Original single-series lab preserved and test suites added.
- [x] Serverless source-attributed Yahoo chart adapter, optional CoinGecko fallback and user CSV import.
- [ ] Re-run analysis against verified archival dissertation datasets and label actual coursework results.
- [ ] Add split-sample evaluation and benchmark methods before claiming predictive accuracy.
- [ ] Confirm provider availability from the production Vercel region and add monitoring.
- [ ] Review research reproducibility, provider data licensing and any institution rules before publishing full dissertation input data.

**Built by Rahul Khanke / HuLaX** · University of Glasgow, MSc Data Science (2025).
