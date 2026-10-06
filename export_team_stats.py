"""Export team-level statistics JSON for the frontend.

Reads data/d3_{sport}_players_{season}.csv (per-player season totals) and writes
frontend/public/data/sports/{sport}/teams_{season}.json.

Usage:
    python export_team_stats.py            # mbb, 2025-26
    python export_team_stats.py wbb 2025-26
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ncaa_rankings.team_stats import aggregate_team_stats, team_stat_rows_to_records  # noqa: E402


def main(sport_code: str = "mbb", season: str = "2025-26") -> None:
    file_tag = season.replace("-", "_")
    players_csv = Path("data") / f"d3_{sport_code}_players_{file_tag}.csv"
    if not players_csv.exists():
        parts = sorted(Path("data").glob(f"*_{sport_code}_players_{file_tag}.csv"))
        if not parts:
            raise SystemExit(f"No player CSVs found for {sport_code} {season} under data/")
        players = pd.concat([pd.read_csv(p) for p in parts], ignore_index=True)
    else:
        players = pd.read_csv(players_csv)

    if "player_name" in players.columns:
        players["player_name"] = players["player_name"].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
    dedupe_key = [c for c in ["season", "team", "player_name"] if c in players.columns]
    if dedupe_key:
        players = players.drop_duplicates(subset=dedupe_key, keep="first").copy()

    rows = aggregate_team_stats(players)
    records = team_stat_rows_to_records(rows)

    out_dir = Path("frontend/public/data/sports") / sport_code
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"teams_{season}.json"
    out_path.write_text(json.dumps(records, allow_nan=False), encoding="utf-8")

    with_shooting = sum(1 for r in records if r.get("fg_pct") is not None)
    print(f"Wrote {len(records)} teams -> {out_path} ({with_shooting} with shooting splits)")


if __name__ == "__main__":
    args = sys.argv[1:]
    main(*(args[:2]))
