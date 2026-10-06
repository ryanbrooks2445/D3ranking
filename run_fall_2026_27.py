from __future__ import annotations

"""
Scrape and rank D3 fall sports for academic year 2026–27 (Sidearm year=2026).

Sports: football, men's soccer, women's soccer, women's volleyball.
Writes:
  data/{conf}_{code}_players_2026_27.csv
  data/{conf}_{code}_player_rankings_2026_27.csv
  data/d3_{code}_players_2026_27.csv
  data/d3_{code}_player_rankings_2026_27.csv
"""

import argparse
import sys
import time
from pathlib import Path

_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import pandas as pd

from ncaa_rankings.composites import SIDEARM_COMPOSITES
from ncaa_rankings.conferences import load_conferences
from ncaa_rankings.ranking import rank_by_composite
from ncaa_rankings.sidearm_generic import scrape_conference_players_sidearm
from ncaa_rankings.sports import SPORTS

YEAR = "2026"
SEASON_LABEL = "2026-27"
FILE_TAG = "2026_27"
FALL_CODES = ("football", "msoc", "wsoc", "wvb")


def _dedupe_players(players: pd.DataFrame) -> pd.DataFrame:
    out = players
    if "player_name" in out.columns:
        out = out.copy()
        out["player_name"] = (
            out["player_name"].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
        )
    dedupe_conf = [
        c for c in ["season", "conference_code", "sport", "team", "player_name"] if c in out.columns
    ]
    if dedupe_conf:
        out = out.drop_duplicates(subset=dedupe_conf, keep="first").copy()
    global_dedupe = [c for c in ["season", "sport", "team", "player_name"] if c in out.columns]
    if global_dedupe:
        out = out.drop_duplicates(subset=global_dedupe, keep="first").copy()
    return out


def _scrape_with_retry(**kwargs):
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            return scrape_conference_players_sidearm(**kwargs)
        except Exception as e:
            last_error = e
            message = str(e).lower()
            transient = any(
                token in message
                for token in (
                    "nameresolution",
                    "timed out",
                    "timeout",
                    "connection",
                    "reset",
                    "temporarily",
                    "max retries",
                )
            )
            if not transient or attempt == 3:
                raise
            wait = 2 * (attempt + 1)
            print(f"Retry {attempt + 1}/3 after {wait}s: {e}", flush=True)
            time.sleep(wait)
    raise last_error if last_error else RuntimeError("scrape failed")


def _conference_player_frames(out_dir: Path, code: str) -> list[pd.DataFrame]:
    frames: list[pd.DataFrame] = []
    for path in sorted(out_dir.glob(f"*_{code}_players_{FILE_TAG}.csv")):
        if path.name.startswith("d3_"):
            continue
        try:
            frame = pd.read_csv(path, low_memory=False)
        except (pd.errors.EmptyDataError, pd.errors.ParserError):
            continue
        if not frame.empty:
            frames.append(frame)
    return frames


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape D3 fall sports for 2026-27.")
    parser.add_argument(
        "--sport",
        action="append",
        choices=FALL_CODES,
        help="Limit to one sport. Repeat to scrape several. Default: all fall sports.",
    )
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="Skip conferences that already have a players CSV, then rebuild the national file.",
    )
    args = parser.parse_args()
    codes = tuple(args.sport) if args.sport else FALL_CODES

    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    by_code = {sport.code: sport for sport in SPORTS}
    missing = [code for code in codes if code not in by_code or by_code[code].sidearm_path is None]
    if missing:
        raise SystemExit(f"Missing Sidearm sports: {', '.join(missing)}")

    conferences = load_conferences()

    for code in codes:
        sport = by_code[code]
        sidearm_path = sport.sidearm_path
        assert sidearm_path is not None
        comp = SIDEARM_COMPOSITES.get(sidearm_path)
        if comp is None:
            raise SystemExit(f"No composite weights for {sidearm_path}")

        print(f"\n=== {code} ({sport.label}, {SEASON_LABEL}, year={YEAR}) ===", flush=True)

        for conf in conferences:
            if conf.platform != "sidearm":
                continue
            players_path = out_dir / f"{conf.code}_{code}_players_{FILE_TAG}.csv"
            if args.only_missing and players_path.exists() and players_path.stat().st_size > 0:
                print(f"{conf.code}: already have {players_path.name}", flush=True)
                continue
            try:
                players = _scrape_with_retry(
                    conference=conf,
                    sport_path=sidearm_path,
                    year=YEAR,
                    season_label=SEASON_LABEL,
                    conf_only=False,
                )
            except Exception as e:
                print(f"Skipping {conf.code} {sidearm_path}: {e}", flush=True)
                continue

            players.to_csv(players_path, index=False)
            print(f"{conf.code}: wrote {len(players)} players -> {players_path.name}", flush=True)

            try:
                ranked = rank_by_composite(players, weights=comp.weights)
                ranked_path = out_dir / f"{conf.code}_{code}_player_rankings_{FILE_TAG}.csv"
                ranked.to_csv(ranked_path, index=False)
                print(f"{conf.code}: wrote {len(ranked)} ranked -> {ranked_path.name}", flush=True)
            except Exception as e:
                print(f"{conf.code}: ranking skipped ({sidearm_path}): {e}", flush=True)

        sport_players_parts = _conference_player_frames(out_dir, code)
        if not sport_players_parts:
            print(f"ALL-D3: no {code} data collected.", flush=True)
            continue

        all_players = _dedupe_players(pd.concat(sport_players_parts, ignore_index=True))
        all_players_path = out_dir / f"d3_{code}_players_{FILE_TAG}.csv"
        all_players.to_csv(all_players_path, index=False)
        print(f"ALL-D3: wrote {len(all_players)} players -> {all_players_path.name}", flush=True)

        try:
            all_ranked = rank_by_composite(all_players, weights=comp.weights)
            all_ranked_path = out_dir / f"d3_{code}_player_rankings_{FILE_TAG}.csv"
            all_ranked.to_csv(all_ranked_path, index=False)
            print(f"ALL-D3: wrote {len(all_ranked)} ranked -> {all_ranked_path.name}", flush=True)
        except Exception as e:
            print(f"ALL-D3: ranking skipped ({sidearm_path}): {e}", flush=True)

    print("\nDone. Golf: python run_golf_rankings.py --file-tag 2026_27 --season-label 2026-27 --clippd-season 2027", flush=True)
    print("Then: python export_frontend_data.py", flush=True)


if __name__ == "__main__":
    main()
