from __future__ import annotations

import argparse
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ncaa_rankings.golf import ingest_and_rank_clippd_golf

SEASON_LABEL = "2025-26"
CLIPPD_SEASON = "2026"
FILE_TAG = "2025_26"
MIN_ROUNDS = 6

GOLF_SPORTS = (
    ("mgolf", "Men", "Men's Golf"),
    ("wgolf", "Women", "Women's Golf"),
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest D3 golf rankings from Clippd.")
    parser.add_argument("--season-label", default=SEASON_LABEL)
    parser.add_argument("--clippd-season", default=CLIPPD_SEASON)
    parser.add_argument("--file-tag", default=FILE_TAG)
    args = parser.parse_args()

    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    for sport_code, gender, label in GOLF_SPORTS:
        print(
            f"\n=== {label} ({sport_code}) via Clippd "
            f"season={args.clippd_season} label={args.season_label} ===",
            flush=True,
        )
        players, rankings = ingest_and_rank_clippd_golf(
            sport_code=sport_code,
            gender=gender,
            season_label=args.season_label,
            clippd_season=args.clippd_season,
            min_stroke_play_rounds=MIN_ROUNDS,
        )

        players_path = out_dir / f"d3_{sport_code}_players_{args.file_tag}.csv"
        rankings_path = out_dir / f"d3_{sport_code}_player_rankings_{args.file_tag}.csv"
        players.to_csv(players_path, index=False)
        rankings.to_csv(rankings_path, index=False)
        print(f"Wrote {len(players)} players -> {players_path.name}", flush=True)
        print(f"Wrote {len(rankings)} ranked -> {rankings_path.name}", flush=True)

        if "conference_code" in rankings.columns:
            for conf_code, conf_df in rankings.groupby("conference_code", dropna=True):
                conf_code = str(conf_code)
                conf_players = players[players["conference_code"] == conf_code].copy()
                conf_rankings = conf_df.copy()
                conf_players.to_csv(
                    out_dir / f"{conf_code}_{sport_code}_players_{args.file_tag}.csv",
                    index=False,
                )
                conf_rankings.to_csv(
                    out_dir / f"{conf_code}_{sport_code}_player_rankings_{args.file_tag}.csv",
                    index=False,
                )
            print(f"Wrote per-conference {sport_code} CSVs", flush=True)

    print("\nDone. Run: python export_frontend_data.py", flush=True)


if __name__ == "__main__":
    main()
