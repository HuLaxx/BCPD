"""Capture real, daily-dated historical observations from the BCPD One market API.

Outputs stay on the researcher's machine. Do not commit downloaded provider
data without checking redistribution rights and source-adjustment conventions.

Examples:
  python -m research.market_snapshot --asset us --range 2y --out-dir local-data
  python -m research.market_snapshot --asset btc --range 2y --out-dir local-data

The five-year API endpoint currently requests weekly provider bars and may
timestamp those bars at their period *start*. This script deliberately rejects
that interval to avoid misplacing independently annotated real-world events.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import date, datetime, timezone
from math import isfinite
from pathlib import Path
from urllib.request import Request, urlopen

BASE_URL = "https://xchange-82uu.vercel.app"
SUPPORTED = frozenset(("us", "uk", "de", "fr", "jp", "hk", "in", "au", "ca",
                       "btc", "eth", "xrp", "bnb", "sol"))
RANGES = frozenset(("1y", "2y"))


def parse_daily_payload(payload: object, asset: str, history_range: str) -> dict:
    if asset not in SUPPORTED or history_range not in RANGES | {"5y"}:
        raise ValueError("Only allowlisted markets and daily 1y, 2y or independent 5y histories are permitted")
    if not isinstance(payload, dict) or not isinstance(payload.get("asset"), dict):
        raise ValueError("Invalid market provider response")
    if payload["asset"].get("id") != asset or payload.get("range") != history_range:
        raise ValueError("Unexpected market identifier or history range in response")
    if payload.get("interval") != "1d":
        raise ValueError("Only daily timestamped bars are safe for event-date matching")
    if not isinstance(payload.get("source"), str) or len(payload["source"].strip()) < 3:
        raise ValueError("Missing data-source attribution")
    observations = payload.get("points")
    if not isinstance(observations, list) or not 150 <= len(observations) <= 2500:
        raise ValueError("Insufficient or oversized daily historical response")
    normalized = []
    for item in observations:
        if not isinstance(item, dict):
            raise ValueError("Invalid price record")
        day = date.fromisoformat(item["date"]).isoformat()
        close = item["close"]
        if not isinstance(close, (int, float)) or isinstance(close, bool) or not isfinite(close) or close <= 0:
            raise ValueError("Invalid observed closing price")
        normalized.append((day, float(close)))
    if normalized != sorted(normalized) or len({day for day, _ in normalized}) != len(normalized):
        raise ValueError("Daily dates are duplicated or out of order")
    return {
        "asset": asset,
        "name": payload["asset"].get("label", asset),
        "range": history_range,
        "interval": "1d",
        "source": payload["source"],
        "provider_accessed_at": payload.get("accessedAt"),
        "first_day": normalized[0][0],
        "last_day": normalized[-1][0],
        "observations": normalized,
    }


def save_snapshot(parsed: dict, directory: Path) -> tuple[Path, Path]:
    directory.mkdir(parents=True, exist_ok=True)
    stem = f"{parsed['asset']}-{parsed['range']}"
    target = directory / (stem + ".csv")
    # Do not silently overwrite a source snapshot; preserve benchmark provenance.
    if target.exists():
        raise FileExistsError(f"{target} already exists. Archive or rename before another capture.")
    with target.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(("date", "close"))
        writer.writerows(parsed["observations"])
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    metadata = {
        "schema": "bcpd.market-snapshot.v1",
        "asset": parsed["asset"],
        "market_name": parsed["name"],
        "range": parsed["range"],
        "source": parsed["source"],
        "source_url": parsed.get("source_url", BASE_URL + "/api/markets?asset=" + parsed["asset"] + "&range=" + parsed["range"]),
        "price_basis": parsed.get("price_basis", "Provider close, adjustment policy not independently verified"),
        "interval": parsed["interval"],
        "provider_accessed_at": parsed["provider_accessed_at"],
        "snapshot_captured_at": datetime.now(timezone.utc).isoformat(),
        "first_day": parsed["first_day"],
        "last_day": parsed["last_day"],
        "rows": len(parsed["observations"]),
        "csv_sha256": digest,
        "license_warning": "Historical price data source is unofficial and must not be republished without permission.",
    }
    sidecar = target.with_suffix(".provenance.json")
    sidecar.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return target, sidecar


def download(asset: str, history_range: str = "2y", out_dir: Path = Path("local-data")) -> tuple[Path, Path]:
    if asset not in SUPPORTED or history_range not in RANGES:
        raise ValueError("The deployed app can supply daily data only for 1y and 2y; use research.five_year_source for five-year daily data")
    url = BASE_URL + "/api/markets?asset=" + asset + "&range=" + history_range
    request = Request(url, headers={"User-Agent": "BCPD-One-Research-Validation/1.0", "Accept": "application/json"})
    with urlopen(request, timeout=25) as response:
        payload = json.load(response)
    return save_snapshot(parse_daily_payload(payload, asset, history_range), out_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", required=True, choices=sorted(SUPPORTED))
    parser.add_argument("--range", default="2y", choices=sorted(RANGES))
    parser.add_argument("--out-dir", type=Path, default=Path("local-data"))
    args = parser.parse_args()
    data, metadata = download(args.asset, args.range, args.out_dir)
    print(f"Saved source-attributed DAILY observations to {data}")
    print(f"Saved source hash and provider details to {metadata}")
    print("Research only; no observed events or model accuracy have been verified.")


if __name__ == "__main__":
    main()
