from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on path so ncaa_rankings can be imported
_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

# Non-MBB sports require ncaa_rankings.sports, composites, ranking, sidearm_generic.
# MBB is handled by run_basketball_rankings.py + export_frontend_data.py.
# When those modules exist, this script scrapes/ranks all sports and writes
# data/d3_{code}_player_rankings_2025_26.csv; export can be extended to write
# sports/{code}/rankings_2025-26.json with season, rating, composite_score.
try:
    import pandas as pd
    from ncaa_rankings.baseball import rank_baseball_players
    from ncaa_rankings.composites import SIDEARM_COMPOSITES
    from ncaa_rankings.conferences import load_conferences
    from ncaa_rankings.ranking import rank_by_composite
    from ncaa_rankings.sidearm_generic import scrape_conference_players_sidearm
    from ncaa_rankings.sports import SPORTS
except ImportError as e:
    print(
        "run_all_sports.py requires ncaa_rankings.sports, composites, ranking, sidearm_generic (not yet in repo).",
        "MBB is handled by run_basketball_rankings.py and export_frontend_data.py.",
        file=sys.stderr,
    )
    raise SystemExit(1) from e


def main() -> None:
    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    conferences = load_conferences()

    for sport in SPORTS:
        if sport.sidearm_path is None:
            continue

        sport_players_parts: list[pd.DataFrame] = []

        print(f"\n=== {sport.code} ({sport.label}) ===", flush=True)

        for conf in conferences:
            if conf.platform != "sidearm":
                # Presto multi-sport support can be added later; basketball already handled separately.
                continue

            try:
                players = scrape_conference_players_sidearm(
                    conference=conf,
                    sport_path=sport.sidearm_path,
                    year="2025",
                    season_label="2025-26",
                    conf_only=False,
                )
            except Exception as e:
                print(f"Skipping {conf.code} {sport.sidearm_path}: {e}", flush=True)
                continue

            players_path = out_dir / f"{conf.code}_{sport.code}_players_2025_26.csv"
            players.to_csv(players_path, index=False)

            print(f"{conf.code}: wrote {len(players)} players -> {players_path.name}", flush=True)
            sport_players_parts.append(players)

            # If we have a composite definition for this sport path, write rankings.
            comp = SIDEARM_COMPOSITES.get(sport.sidearm_path)
            if comp is not None:
                try:
                    if sport.code == "baseball":
                        ranked = rank_baseball_players(players)
                    else:
                        ranked = rank_by_composite(players, weights=comp.weights)
                    ranked_path = out_dir / f"{conf.code}_{sport.code}_player_rankings_2025_26.csv"
                    ranked.to_csv(ranked_path, index=False)
                    print(f"{conf.code}: wrote {len(ranked)} ranked -> {ranked_path.name}", flush=True)
                except Exception as e:
                    print(f"{conf.code}: ranking skipped ({sport.sidearm_path}): {e}", flush=True)

        if sport_players_parts:
            all_players = pd.concat(sport_players_parts, ignore_index=True)
            # Normalize and dedupe so we don't count the same player multiple times
            if "player_name" in all_players.columns:
                all_players["player_name"] = (
                    all_players["player_name"]
                    .astype(str)
                    .str.strip()
                    .str.replace(r"\s+", " ", regex=True)
                )
            dedupe_conf = [c for c in ["season", "conference_code", "sport", "team", "player_name"] if c in all_players.columns]
            if dedupe_conf:
                all_players = all_players.drop_duplicates(subset=dedupe_conf, keep="first").copy()
            global_dedupe = [c for c in ["season", "sport", "team", "player_name"] if c in all_players.columns]
            if global_dedupe:
                all_players = all_players.drop_duplicates(subset=global_dedupe, keep="first").copy()
            all_players_path = out_dir / f"d3_{sport.code}_players_2025_26.csv"
            all_players.to_csv(all_players_path, index=False)
            print(f"ALL-D3: wrote {len(all_players)} players -> {all_players_path.name}", flush=True)

            comp = SIDEARM_COMPOSITES.get(sport.sidearm_path)
            if comp is not None:
                try:
                    if sport.code == "baseball":
                        all_ranked = rank_baseball_players(all_players)
                    else:
                        all_ranked = rank_by_composite(all_players, weights=comp.weights)
                    all_ranked_path = out_dir / f"d3_{sport.code}_player_rankings_2025_26.csv"
                    all_ranked.to_csv(all_ranked_path, index=False)
                    print(f"ALL-D3: wrote {len(all_ranked)} ranked -> {all_ranked_path.name}", flush=True)
                except Exception as e:
                    print(f"ALL-D3: ranking skipped ({sport.sidearm_path}): {e}", flush=True)


if __name__ == "__main__":
    main()

