from __future__ import annotations

"""
Scrape and rank D3 baseball only for academic year 2026–27 (Sidearm year=2026).
Writes:
  data/{conf}_baseball_players_2026_27.csv
  data/{conf}_baseball_player_rankings_2026_27.csv
  data/d3_baseball_players_2026_27.csv
  data/d3_baseball_player_rankings_2026_27.csv
"""

import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import pandas as pd

from ncaa_rankings.baseball import rank_baseball_players
from ncaa_rankings.conferences import load_conferences
from ncaa_rankings.sidearm_generic import scrape_conference_players_sidearm

YEAR = "2026"
SEASON_LABEL = "2026-27"
SPORT_CODE = "baseball"
SIDEARM_PATH = "baseball"
FILE_TAG = "2026_27"


def main() -> None:
    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    conferences = load_conferences()
    sport_players_parts: list[pd.DataFrame] = []

    print(f"\n=== {SPORT_CODE} ({SEASON_LABEL}, year={YEAR}) ===", flush=True)

    for conf in conferences:
        if conf.platform != "sidearm":
            continue

        try:
            players = scrape_conference_players_sidearm(
                conference=conf,
                sport_path=SIDEARM_PATH,
                year=YEAR,
                season_label=SEASON_LABEL,
                conf_only=False,
            )
        except Exception as e:
            print(f"Skipping {conf.code} {SIDEARM_PATH}: {e}", flush=True)
            continue

        players_path = out_dir / f"{conf.code}_{SPORT_CODE}_players_{FILE_TAG}.csv"
        players.to_csv(players_path, index=False)
        print(f"{conf.code}: wrote {len(players)} players -> {players_path.name}", flush=True)
        sport_players_parts.append(players)

        try:
            ranked = rank_baseball_players(players)
            ranked_path = out_dir / f"{conf.code}_{SPORT_CODE}_player_rankings_{FILE_TAG}.csv"
            ranked.to_csv(ranked_path, index=False)
            print(f"{conf.code}: wrote {len(ranked)} ranked -> {ranked_path.name}", flush=True)
        except Exception as e:
            print(f"{conf.code}: ranking skipped: {e}", flush=True)

    if not sport_players_parts:
        print("No conference data collected.", flush=True)
        return

    all_players = pd.concat(sport_players_parts, ignore_index=True)
    if "player_name" in all_players.columns:
        all_players["player_name"] = (
            all_players["player_name"]
            .astype(str)
            .str.strip()
            .str.replace(r"\s+", " ", regex=True)
        )
    dedupe_conf = [
        c for c in ["season", "conference_code", "sport", "team", "player_name"] if c in all_players.columns
    ]
    if dedupe_conf:
        all_players = all_players.drop_duplicates(subset=dedupe_conf, keep="first").copy()
    global_dedupe = [c for c in ["season", "sport", "team", "player_name"] if c in all_players.columns]
    if global_dedupe:
        all_players = all_players.drop_duplicates(subset=global_dedupe, keep="first").copy()

    all_players_path = out_dir / f"d3_{SPORT_CODE}_players_{FILE_TAG}.csv"
    all_players.to_csv(all_players_path, index=False)
    print(f"ALL-D3: wrote {len(all_players)} players -> {all_players_path.name}", flush=True)

    try:
        all_ranked = rank_baseball_players(all_players)
        all_ranked_path = out_dir / f"d3_{SPORT_CODE}_player_rankings_{FILE_TAG}.csv"
        all_ranked.to_csv(all_ranked_path, index=False)
        print(f"ALL-D3: wrote {len(all_ranked)} ranked -> {all_ranked_path.name}", flush=True)
    except Exception as e:
        print(f"ALL-D3: ranking skipped: {e}", flush=True)


if __name__ == "__main__":
    main()
