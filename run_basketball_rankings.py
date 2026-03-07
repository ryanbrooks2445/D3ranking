from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on path so ncaa_rankings can be imported
_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import pandas as pd

from ncaa_rankings.basketball import rank_mbb_players, scrape_conference_mbb_players
from ncaa_rankings.conferences import load_conferences


def main() -> None:
    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    conferences = load_conferences()
    all_players: list[pd.DataFrame] = []
    for conf in conferences:
        print(f"Scraping {conf.code} ({conf.name}) men’s basketball 2025–26...", flush=True)
        try:
            players = scrape_conference_mbb_players(conference=conf, year="2025", season_label="2025-26")
            rankings = rank_mbb_players(players, min_gp=10, min_mpg=10.0)
        except Exception as e:
            print(f"  {conf.code}: skipping MBB scrape/rank: {e}", flush=True)
            continue

        players_path = out_dir / f"{conf.code}_mbb_players_2025_26.csv"
        rankings_path = out_dir / f"{conf.code}_mbb_player_rankings_2025_26.csv"
        players.to_csv(players_path, index=False)
        rankings.to_csv(rankings_path, index=False)

        print(f"  wrote {len(players)} players -> {players_path}", flush=True)
        print(f"  wrote {len(rankings)} ranked players -> {rankings_path}", flush=True)

        all_players.append(players)

    # Global all-D3 (Sidearm-compatible subset) ranking
    if all_players:
        d3_players = pd.concat(all_players, ignore_index=True)
        # Normalize player_name so "Smith,  John" and "Smith, John" dedupe together
        if "player_name" in d3_players.columns:
            d3_players["player_name"] = (
                d3_players["player_name"]
                .astype(str)
                .str.strip()
                .str.replace(r"\s+", " ", regex=True)
            )
        # Remove within-conference duplicates (same player/team listed twice)
        dedupe_conf = [c for c in ["season", "conference_code", "team", "player_name"] if c in d3_players.columns]
        if dedupe_conf:
            d3_players = d3_players.drop_duplicates(subset=dedupe_conf, keep="first").copy()
        # Remove cross-conference duplicates: same player+team in multiple conference files
        global_dedupe = [c for c in ["season", "team", "player_name"] if c in d3_players.columns]
        if global_dedupe:
            d3_players = d3_players.drop_duplicates(subset=global_dedupe, keep="first").copy()

        d3_rankings = rank_mbb_players(d3_players, min_gp=10, min_mpg=10.0)

        d3_players_path = out_dir / "d3_mbb_players_2025_26.csv"
        d3_rankings_path = out_dir / "d3_mbb_player_rankings_2025_26.csv"
        d3_players.to_csv(d3_players_path, index=False)
        d3_rankings.to_csv(d3_rankings_path, index=False)

        print(f"Wrote {len(d3_players)} all-D3 players -> {d3_players_path}", flush=True)
        print(f"Wrote {len(d3_rankings)} all-D3 ranked players -> {d3_rankings_path}", flush=True)


if __name__ == "__main__":
    main()

