#!/usr/bin/env python3
"""Orchestrate the daily scrape → rank → export pipeline.

Each job is isolated: a failed sport does not abort later jobs. Export still
runs from whatever CSVs exist so the site can keep serving the last good data.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

KNOWN_JOBS = ("mbb", "sidearm", "baseball", "golf", "export")


@dataclass
class JobResult:
    name: str
    status: str
    detail: str = ""
    seconds: float = 0.0


@dataclass
class RefreshSummary:
    results: list[JobResult] = field(default_factory=list)

    def add(self, result: JobResult) -> None:
        self.results.append(result)

    def print_report(self) -> None:
        print("\n========== Daily refresh summary ==========", flush=True)
        for r in self.results:
            print(f"  [{r.status:7}] {r.name:10} {r.seconds:7.1f}s  {r.detail}", flush=True)
        print("===========================================", flush=True)


def _parse_only(raw: str) -> list[str]:
    if not raw or raw.strip().lower() in {"", "all"}:
        return list(KNOWN_JOBS)
    jobs = [part.strip().lower() for part in raw.split(",") if part.strip()]
    unknown = [j for j in jobs if j not in KNOWN_JOBS]
    if unknown:
        raise SystemExit(f"Unknown job(s): {', '.join(unknown)}. Choose from: {', '.join(KNOWN_JOBS)}")
    return jobs


def _run_job(name: str, argv: list[str]) -> JobResult:
    print(f"\n----- {name}: {' '.join(argv)} -----", flush=True)
    started = time.monotonic()
    try:
        proc = subprocess.run(argv, cwd=str(ROOT), check=False)
    except Exception as e:
        return JobResult(name=name, status="FAILED", detail=str(e), seconds=time.monotonic() - started)
    elapsed = time.monotonic() - started
    if proc.returncode == 0:
        return JobResult(name=name, status="OK", detail="exit 0", seconds=elapsed)
    return JobResult(
        name=name,
        status="FAILED",
        detail=f"exit {proc.returncode}",
        seconds=elapsed,
    )


def _check_pipeline() -> int:
    """Import production modules and confirm runner scripts exist. No scrape/export."""
    missing = [
        rel
        for rel in (
            "run_basketball_rankings.py",
            "run_all_sports.py",
            "run_baseball_2026_27.py",
            "run_golf_rankings.py",
            "export_frontend_data.py",
            "scripts/sync_rankings_to_db.py",
            "scripts/instagram_daily_post.py",
            "requirements.txt",
            "ncaa_rankings/sports.py",
            "ncaa_rankings/sidearm_generic.py",
            "ncaa_rankings/composites.py",
        )
        if not (ROOT / rel).exists()
    ]
    if missing:
        print("Missing required files:", ", ".join(missing), file=sys.stderr)
        return 1

    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))

    from ncaa_rankings.baseball import rank_baseball_players
    from ncaa_rankings.basketball import rank_mbb_players
    from ncaa_rankings.composites import SIDEARM_COMPOSITES
    from ncaa_rankings.conferences import load_conferences
    from ncaa_rankings.golf import ingest_and_rank_clippd_golf
    from ncaa_rankings.ranking import rank_by_composite
    from ncaa_rankings.season import SEASON_LABEL, SIDEARM_YEAR
    from ncaa_rankings.sidearm_generic import scrape_conference_players_sidearm
    from ncaa_rankings.sports import SPORTS

    _imported = (
        rank_baseball_players,
        rank_mbb_players,
        rank_by_composite,
        scrape_conference_players_sidearm,
        ingest_and_rank_clippd_golf,
    )
    conferences = load_conferences()
    sidearm_sports = [s.code for s in SPORTS if s.sidearm_path and s.code not in ("mgolf", "wgolf")]
    print(f"OK  {len(conferences)} conferences loaded")
    print(f"OK  sidearm sports: {', '.join(sidearm_sports)}")
    print(f"OK  composite defs: {len(SIDEARM_COMPOSITES)}")
    print(f"OK  imported {len(_imported)} ranking/scrape callables")
    print(f"OK  production season {SEASON_LABEL} (Sidearm year={SIDEARM_YEAR})")

    ig = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "instagram_daily_post.py"), "--check"],
        cwd=str(ROOT),
        check=False,
    )
    if ig.returncode != 0:
        print("Instagram graphic check failed", file=sys.stderr)
        return ig.returncode
    print("OK  daily refresh pipeline check")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily D3 rankings refresh (scrape → export).")
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Skip live scrapers; only run export_frontend_data.py from existing CSVs.",
    )
    parser.add_argument(
        "--only",
        default="all",
        help="Comma-separated jobs: mbb,sidearm,baseball,golf,export (default: all).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate that production scripts and ncaa_rankings modules import. No I/O.",
    )
    args = parser.parse_args()

    if args.check:
        raise SystemExit(_check_pipeline())

    jobs = _parse_only(args.only)
    if args.skip_scrape:
        jobs = ["export"]

    py = sys.executable
    summary = RefreshSummary()

    job_cmds: dict[str, list[str]] = {
        "mbb": [py, "run_basketball_rankings.py", "--refresh"],
        "sidearm": [py, "run_all_sports.py", "--skip-codes", "baseball"],
        "baseball": [py, "run_baseball_2026_27.py"],
        "golf": [py, "run_golf_rankings.py"],
        "export": [py, "export_frontend_data.py"],
    }

    for name in jobs:
        summary.add(_run_job(name, job_cmds[name]))

    summary.print_report()

    export_result = next((r for r in summary.results if r.name == "export"), None)
    if export_result is None:
        print("Export did not run.", file=sys.stderr)
        raise SystemExit(1)
    if export_result.status != "OK":
        print("Export failed; not updating published data.", file=sys.stderr)
        raise SystemExit(1)

    failed = [r.name for r in summary.results if r.status == "FAILED"]
    if failed:
        print(
            f"Export succeeded. Failed scrape job(s) left prior CSVs in place: {', '.join(failed)}",
            flush=True,
        )


if __name__ == "__main__":
    main()
