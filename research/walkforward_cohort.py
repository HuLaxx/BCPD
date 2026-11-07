"""Three-market five-year walk-forward cohort.

Use immutable 5y daily snapshots where licensing permits. --fetch is an
explicit best-effort diagnostic; it queries the allowlisted upstream Yahoo
chart endpoint and deletes original price files after calculating the report.

Usage:
 python -m research.walkforward_cohort --snapshot-dir local-data --out artifacts/walkforward-cohort.json
 python -m research.walkforward_cohort --fetch --out artifacts/walkforward-cohort.json
"""
from __future__ import annotations

import argparse
import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Iterator

from .five_year_source import SYMBOLS, download
from .walkforward import MODELS, run

COHORT = ("us", "btc", "in")


@contextmanager
def snapshots(
    assets: tuple[str, ...], directory: Path, fetch: bool
) -> Iterator[dict[str, Path]]:
    if not assets or len(set(assets)) != len(assets) or any(a not in SYMBOLS for a in assets):
        raise ValueError("Five-year cohort requires distinct allowlisted asset names")
    if fetch:
        with TemporaryDirectory(prefix="bcpd-five-year-") as temporary:
            files = {}
            for asset in assets:
                data, _ = download(asset, Path(temporary))
                files[asset] = data
            yield files
    else:
        yield {asset: directory / f"{asset}-5y.csv" for asset in assets}


def evaluate_cohort(files: dict[str, Path]) -> dict:
    if not files or any(asset not in SYMBOLS for asset in files):
        raise ValueError("Unknown or empty five-year cohort")
    markets = []
    for asset, path in files.items():
        if path.name != f"{asset}-5y.csv":
            raise ValueError(f"Five-year market path must end with {asset}-5y.csv")
        report = run(path)
        if report["asset"] != asset or report["model_accuracy_verified"] is not False:
            raise ValueError("Inconsistent asset/source or unexpected accuracy claim")
        summary = report["descriptive_fold_bootstrap_intervals"]
        markets.append({
            "asset": report["asset"],
            "market": report["market_name"],
            "price_source": report["price_provenance"],
            "fold_count": report["fold_count"],
            "observed_weekly_returns": report["protocol"]["observed_weekly_returns"],
            "calibration_target_alarms_per_52_weeks": report["protocol"]["max_calibration_alarms_per_52_weeks"],
            "folds": [
                {"fold": fold["fold"],
                 "test_start_week": fold["test_start_week"],
                 "test_end_week": fold["test_end_week"],
                 "models": {
                     name: {
                         "threshold": fold["models"][name]["calibrated_threshold"],
                         "calibration_alerts": fold["models"][name]["calibration_alerts"],
                         "calibration_allowed": fold["models"][name]["allowed_calibration_alerts"],
                         "holdout_alerts": fold["models"][name]["holdout_alerts"],
                         "holdout_rate_per_52": fold["models"][name]["holdout_alerts_per_52_weeks"],
                         "alarm_week_ends": fold["models"][name]["holdout_alarm_week_ends"],
                     } for name in MODELS}
                 } for fold in report["folds"]
            ],
            "fold_bootstrap_alert_rate": {
                name: summary[name] for name in MODELS
            },
        })
    return {
        "schema": "bcpd.five-year-cohort.v1",
        "status": "Five-year daily time-series analysis, NO verified event accuracy",
        "markets": markets,
        "model_accuracy_verified": False,
        "precision": None, "recall": None, "f1": None,
        "limitations": [
            "The interval only describes fold-to-fold alarm rate variation and is not a confidence interval for event accuracy.",
            "Shared training histories make expanding-origin folds statistically dependent.",
            "Thresholds are selected by unlabeled calibration alert budgets, not confirmed false positives.",
            "Providers are unofficial and archived source data need independent verification and licensed storage.",
            "Different models detect mean vs volatility shifts; fewer alerts cannot establish superiority.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", choices=sorted(SYMBOLS), default=list(COHORT))
    parser.add_argument("--snapshot-dir", type=Path, default=Path("local-data"))
    parser.add_argument("--fetch", action="store_true",
                        help="Fresh unofficial data in temporary storage, not immutable scientific replay")
    parser.add_argument("--out", type=Path, default=Path("artifacts/five-year-cohort.json"))
    args = parser.parse_args()
    with snapshots(tuple(args.assets), args.snapshot_dir, args.fetch) as files:
        report = evaluate_cohort(files)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    for market in report["markets"]:
        print(
            f"{market['asset']} | {market['fold_count']} nonoverlapping holdouts | "
            f"{market['observed_weekly_returns']} weekly returns | "
            f"SHA-256 {market['price_source']['daily_price_csv_sha256']}"
        )
        for name in MODELS:
            s = market["fold_bootstrap_alert_rate"][name]
            print(
                f" {name}: {s['mean']:.2f} mean alarms/52 weeks "
                f"(descriptive fold bootstrap {s['lower']:.2f}–{s['upper']:.2f})"
            )
    print(f"Wrote source-attributed summary: {args.out}")
    print("CAUTION: without verified event labels, neither accuracy nor model superiority is measurable.")


if __name__ == "__main__":
    main()
