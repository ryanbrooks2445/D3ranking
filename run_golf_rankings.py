from __future__ import annotations

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
    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    for sport_code, gender, label in GOLF_SPORTS:
        print(f"\n=== {label} ({sport_code}) via Clippd ===", flush=True)
        players, rankings = ingest_and_rank_clippd_golf(
            sport_code=sport_code,
            gender=gender,
            season_label=SEASON_LABEL,
            clippd_season=CLIPPD_SEASON,
            min_stroke_play_rounds=MIN_ROUNDS,
        )

        players_path = out_dir / f"d3_{sport_code}_players_{FILE_TAG}.csv"
        rankings_path = out_dir / f"d3_{sport_code}_player_rankings_{FILE_TAG}.csv"
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
                    out_dir / f"{conf_code}_{sport_code}_players_{FILE_TAG}.csv",
                    index=False,
                )
                conf_rankings.to_csv(
                    out_dir / f"{conf_code}_{sport_code}_player_rankings_{FILE_TAG}.csv",
                    index=False,
                )
            print(f"Wrote per-conference {sport_code} CSVs", flush=True)

    print("\nDone. Run: python export_frontend_data.py", flush=True)


if __name__ == "__main__":
    main()
