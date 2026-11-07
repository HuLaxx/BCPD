"""Evaluate the three time-series regime detectors on privately archived markets.

Default: read previously captured <asset>-2y.csv and sidecar manifests.
Optional --fetch: retrieve fresh daily provider observations into a TEMPORARY
directory, evaluate, and delete raw files. Only aggregate research metadata
and alert dates are written to the requested JSON report.

Accuracy is never claimed without independent, audited event labels.

Examples:
    python -m research.observed_cohort --snapshot-dir local-data --out artifacts/observed-cohort.json
    python -m research.observed_cohort --fetch --out artifacts/observed-cohort.json
"""
from __future__ import annotations

import argparse
import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Iterator, Mapping

from .calibrated_benchmark import MODELS, run
from .market_snapshot import SUPPORTED, download

DEFAULT_ASSETS = ("us", "btc", "in")


def summarize(files: Mapping[str, Path]) -> dict:
    """Fail closed: all requested markets must pass their provenance and model gates."""
    if not files or any(asset not in SUPPORTED for asset in files):
        raise ValueError("Provide at least one allowed market identifier")
    markets = []
    for asset, path in files.items():
        if path.name != f"{asset}-2y.csv":
            raise ValueError("Expected market snapshot named <asset>-2y.csv")
        provenance = path.with_suffix(".provenance.json")
        if not provenance.is_file():
            raise ValueError(f"Missing immutable source provenance for {asset}")
        report = run(path)
        if report["evaluation"]["independent_event_labels_supplied"]:
            raise ValueError("This unlabeled cohort report must not include scored events")
        manifest = report["source"]["manifest"]
        if manifest.get("asset") != asset or manifest.get("interval") != "1d":
            raise ValueError(f"Source manifest mismatch for {asset}")
        tests = report["protocol"]["test_weeks"]
        per_model = {}
        for name in MODELS:
            calibration = report["calibration"][name]
            if not calibration["budget_met"]:
                raise ValueError(f"Calibration budget unmet for {name} on {asset}")
            weeks = report["test_alerts"][name]
            per_model[name] = {
                "calibrated_threshold": calibration["threshold"],
                "calibration_alerts": calibration["calibration_alerts"],
                "calibration_allowed": calibration["allowed_alerts"],
                "test_alert_count": len(weeks),
                "test_alerts_per_52_weeks": round(52 * len(weeks) / tests, 4),
                "test_alert_week_ends": weeks,
            }
        markets.append({
            "asset": asset,
            "name": manifest["market_name"],
            "provider": manifest["source"],
            "interval": manifest["interval"],
            "capture_time_utc": manifest["snapshot_captured_at"],
            "original_daily_rows": manifest["rows"],
            "daily_close_sha256": report["source"]["sha256"],
            "finalized_week_cutoff": report["source"]["weekly_temporal_integrity"]["latest_complete_utc_saturday"],
            "provisional_daily_rows_excluded": report["source"]["weekly_temporal_integrity"]["excluded_provisional_observations"],
            "fit_weeks": report["protocol"]["fit_weeks"],
            "calibration_weeks": report["protocol"]["calibration_weeks"],
            "test_weeks": tests,
            "test_period_start": report["protocol"]["first_test_week"],
            "test_period_end": report["protocol"]["last_test_week"],
            "models": per_model,
        })
    return {
        "schema": "bcpd.observed-unlabeled-cohort.v1",
        "status": "Exploratory observed-market alarm comparison; scientific accuracy not validated",
        "models": list(MODELS),
        "markets": markets,
        "total_test_alerts": {name: sum(x["models"][name]["test_alert_count"] for x in markets) for name in MODELS},
        "accuracy_verified": False,
        "precision": None,
        "recall": None,
        "f1": None,
        "limitations": [
            "No independent event labels: alert counts are not false positives or detection accuracy.",
            "Calibration alert budgets do not guarantee the same alert burden in holdout periods.",
            "Provider prices are unofficial; corporate-action adjustments and dates need external checks.",
            "The default 2-year window creates short calibration/test samples; multiple frozen windows are needed.",
            "The implementation is not the missing original PyMC3 dissertation model.",
        ],
    }


@contextmanager
def data_files(
    assets: tuple[str, ...], snapshot_dir: Path, fetch: bool
) -> Iterator[dict[str, Path]]:
    if len(set(assets)) != len(assets) or not assets or any(asset not in SUPPORTED for asset in assets):
        raise ValueError("Assets must be distinct recognized market identifiers")
    if fetch:
        with TemporaryDirectory(prefix="bcpd-observed-") as temp:
            files = {}
            for asset in assets:
                prices, _ = download(asset, "2y", Path(temp))
                files[asset] = prices
            yield files
    else:
        yield {asset: snapshot_dir / f"{asset}-2y.csv" for asset in assets}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", default=list(DEFAULT_ASSETS), choices=sorted(SUPPORTED))
    parser.add_argument("--snapshot-dir", type=Path, default=Path("local-data"))
    parser.add_argument("--fetch", action="store_true", help="Fetch fresh provider data; delete raw data after evaluation")
    parser.add_argument("--out", type=Path, default=Path("artifacts/observed-cohort.json"))
    args = parser.parse_args()
    with data_files(tuple(args.assets), args.snapshot_dir, args.fetch) as files:
        report = summarize(files)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Unvalidated observed-market comparison: {args.out}")
    for market in report["markets"]:
        print(f"MARKET {market['asset']} | {market['test_period_start']} to {market['test_period_end']} | {market['test_weeks']} held-out weeks")
        for name in MODELS:
            model = market["models"][name]
            print(
                f"  {name}: threshold={model['calibrated_threshold']}; "
                f"calibration={model['calibration_alerts']}/{model['calibration_allowed']}; "
                f"holdout={model['test_alert_count']}; "
                f"annualized_alert_count={model['test_alerts_per_52_weeks']}; "
                f"alert_weeks={','.join(model['test_alert_week_ends']) or 'none'}"
            )
    print("NO VERIFIED EVENT LABELS: do not infer F1, precision, false-alarm rates or model superiority.")


if __name__ == "__main__":
    main()
