"""Research-only 5-year daily history retrieval from allowlisted Yahoo charts.

NOT part of the production market API and NOT a licensed data feed. This
command has no arbitrary URL, host, symbol or download-path proxy. Data are
stored locally with an immutable SHA-256 sidecar. Verify vendor terms before
collecting and retaining source prices.

Run:
  python -m research.five_year_source --asset us --out-dir local-data
  python -m research.five_year_source --asset btc --out-dir local-data
  python -m research.five_year_source --asset in --out-dir local-data
"""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from .market_snapshot import parse_daily_payload, save_snapshot

# Explicitly small research cohort: extend only after provider/date audits.
SYMBOLS = {"us": "^GSPC", "btc": "BTC-USD", "in": "^NSEI"}
HOSTS = ("query1.finance.yahoo.com", "query2.finance.yahoo.com")


def parse_yahoo_daily(result: object, asset: str, fetched_at: str) -> dict:
    """Validate actual UTC daily records, prefer adjusted closes when present."""
    if asset not in SYMBOLS:
        raise ValueError("Unsupported or unapproved five-year research symbol")
    if not isinstance(result, dict):
        raise ValueError("Provider payload is not an object")
    try:
        chart = result["chart"]
        if chart.get("error"):
            raise ValueError("Provider returned a chart error")
        series = chart["result"][0]
        timestamps = series["timestamp"]
        quotes = series["indicators"]["quote"][0]["close"]
        adjusted = series["indicators"].get("adjclose") or []
        adjusted = adjusted[0].get("adjclose") if adjusted else None
    except (KeyError, IndexError, TypeError, AttributeError) as exc:
        raise ValueError("Five-year provider response has no valid daily chart") from exc
    if not isinstance(timestamps, list) or not isinstance(quotes, list) or len(timestamps) != len(quotes):
        raise ValueError("Timestamp and close record lengths differ")
    if adjusted is not None and len(adjusted) != len(timestamps):
        raise ValueError("Adjusted and raw close record lengths differ")
    if len(timestamps) < 800 or len(timestamps) > 2100:
        raise ValueError("Provider did not return a plausible five-year DAILY series")
    observations = []
    from math import isfinite
    for i, epoch in enumerate(timestamps):
        if not isinstance(epoch, (float, int)) or isinstance(epoch, bool):
            raise ValueError("Provider timestamp is invalid")
        day = datetime.fromtimestamp(epoch, timezone.utc).date().isoformat()
        # Prefer the adjusted series only when it provides an actual value.
        value = adjusted[i] if adjusted is not None and adjusted[i] is not None else quotes[i]
        if not isinstance(value, (float, int)) or isinstance(value, bool) or not isfinite(value) or value <= 0:
            continue
        if observations and observations[-1]["date"] == day:
            observations[-1] = {"date": day, "close": float(value)}
        else:
            observations.append({"date": day, "close": float(value)})
    if len(observations) < 800:
        raise ValueError("Insufficient valid daily values in five-year chart")
    start = date.fromisoformat(observations[0]["date"])
    end = date.fromisoformat(observations[-1]["date"])
    if (end - start).days < 4 * 365:
        raise ValueError("Available daily series covers less than four calendar years")
    asof = datetime.fromisoformat(fetched_at.replace("Z", "+00:00")).date()
    if end > asof:
        raise ValueError("Provider returned a future-dated chart observation")
    return {
        "asset": {"id": asset, "label": {"us": "S&P 500", "btc": "Bitcoin", "in": "Nifty 50"}[asset]},
        "range": "5y",
        "interval": "1d",
        "source": "Yahoo Finance (unofficial chart data; direct daily research snapshot)",
        "accessedAt": fetched_at,
        "points": observations,
        "_price_basis": "Adjusted close preferred per point when available; fallback to raw close (verify adjustment policy)",
    }


def retrieve(asset: str, timeout: float = 20.0) -> dict:
    if asset not in SYMBOLS:
        raise ValueError("Only us, btc and in approved in the five-year cohort")
    if not 1 <= timeout <= 60:
        raise ValueError("Timeout must be between one and sixty seconds")
    path = "/v8/finance/chart/" + quote(SYMBOLS[asset], safe="")
    query = urlencode({"interval": "1d", "range": "5y", "includeAdjustedClose": "true"})
    errors = []
    for host in HOSTS:
        url = f"https://{host}{path}?{query}"
        try:
            with urlopen(Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "BCPD-One-Scientific-Research/1.0",
            }), timeout=timeout) as response:
                if response.status != 200:
                    raise ValueError(f"Provider returned HTTP {response.status}")
                payload = json.load(response)
            return {"payload": parse_yahoo_daily(
                payload, asset, datetime.now(timezone.utc).isoformat()
            ), "source_url": url}
        except (HTTPError, URLError, TimeoutError, ValueError, OSError, KeyError) as exc:
            errors.append(f"{host}: {type(exc).__name__}")
    raise RuntimeError(
        "No verified five-year daily history available from allowlisted hosts (" +
        "; ".join(errors) + "). Do not silently fall back to weekly bars."
    )


def download(asset: str, out_dir: Path = Path("local-data")) -> tuple[Path, Path]:
    result = retrieve(asset)
    parsed = parse_daily_payload(result["payload"], asset, "5y")
    parsed["source_url"] = result["source_url"]
    parsed["price_basis"] = result["payload"]["_price_basis"]
    return save_snapshot(parsed, out_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", required=True, choices=sorted(SYMBOLS))
    parser.add_argument("--out-dir", type=Path, default=Path("local-data"))
    args = parser.parse_args()
    prices, manifest = download(args.asset, args.out_dir)
    print(f"Saved independently sourced 5-year daily chart to local file: {prices}")
    print(f"Saved provider/adjustment caveats and SHA-256 provenance: {manifest}")
    print("Provider is unofficial; no licensed redistribution or accuracy assertion.")


if __name__ == "__main__":
    main()
