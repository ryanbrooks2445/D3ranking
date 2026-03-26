from __future__ import annotations

"""
Re-rank baseball 2026–27 from existing *_players_2026_27.csv files (no scraping).
Writes:
  data/{conf}_baseball_player_rankings_2026_27.csv
  data/d3_baseball_player_rankings_2026_27.csv
"""

import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import pandas as pd

from ncaa_rankings.baseball import rank_baseball_players


FILE_TAG = "2026_27"
SPORT_CODE = "baseball"


def main() -> None:
    data_dir = Path("data")
    if not data_dir.exists():
        raise SystemExit("Missing data/ directory")

    global_players_path = data_dir / f"d3_{SPORT_CODE}_players_{FILE_TAG}.csv"
    if not global_players_path.exists():
        raise SystemExit(f"Missing {global_players_path}. Run run_baseball_2026_27.py first.")

    global_players = pd.read_csv(global_players_path, low_memory=False)
    global_ranked = rank_baseball_players(global_players)
    out_global = data_dir / f"d3_{SPORT_CODE}_player_rankings_{FILE_TAG}.csv"
    global_ranked.to_csv(out_global, index=False)
    print(f"Wrote {out_global} ({len(global_ranked)} rows)")

    suffix = f"_{SPORT_CODE}_players_{FILE_TAG}.csv"
    for players_path in sorted(data_dir.glob(f"*{suffix}")):
        if players_path.name.startswith("d3_"):
            continue
        conf_code = players_path.name[: -len(suffix)]
        players = pd.read_csv(players_path, low_memory=False)
        ranked = rank_baseball_players(players)
        out_path = data_dir / f"{conf_code}_{SPORT_CODE}_player_rankings_{FILE_TAG}.csv"
        ranked.to_csv(out_path, index=False)
        print(f"Wrote {out_path.name} ({len(ranked)} rows)")


if __name__ == "__main__":
    main()

