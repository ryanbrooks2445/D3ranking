from __future__ import annotations

"""
Export MBB rankings to frontend/public/data for the dashboard.
Writes: d3_mbb_player_rankings_2025_26.json, sports/mbb/rankings_2025-26.json,
sports/mbb/meta.json, and per-conference JSON/CSV. Also exports other sports from
data/d3_{code}_player_rankings_2025_26.csv to sports/{code}/rankings_2025-26.json
and meta.json so the site shows season, OVR, composite score, and stats for all sports.
"""
import json
import sys
from pathlib import Path

# Ensure project root is on path so ncaa_rankings can be imported when running this script directly
_project_root = Path(__file__).resolve().parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

import pandas as pd

from ncaa_rankings.basketball import rank_mbb_players
from ncaa_rankings.conferences import load_conferences

# Sport codes that have data/d3_{code}_player_rankings_2025_26.csv (excluding mbb, handled above).
OTHER_SPORT_CODES = [
    "wbb", "mvb", "wvb", "baseball", "softball",
    "mhky", "whky", "mlax", "wlax", "msoc", "wsoc",
]
# Optional column renames so frontend column keys match (e.g. sports.ts expects earned_run_avg).
COLUMN_RENAMES = {
    "pitching_stats_earned_run_average": "pitching_stats_earned_run_avg",
}
# Labels for meta.json (match frontend sports.ts).
SPORT_LABELS = {
    "wbb": "Women's Basketball",
    "mvb": "Men's Volleyball",
    "wvb": "Women's Volleyball",
    "baseball": "Baseball",
    "softball": "Softball",
    "mhky": "Men's Hockey",
    "whky": "Women's Hockey",
    "mlax": "Men's Lacrosse",
    "wlax": "Women's Lacrosse",
    "msoc": "Men's Soccer",
    "wsoc": "Women's Soccer",
}


def _rating_from_rank(rank_series: pd.Series) -> pd.Series:
    """OVR: 3×99, 3×98, 3×97, 3×96, then scale 95 down to 50 for the rest."""
    n = len(rank_series)
    out = pd.Series(index=rank_series.index, dtype=float)
    for idx in rank_series.index:
        r = int(rank_series.loc[idx])
        if r <= 3:
            out.loc[idx] = 99
        elif r <= 6:
            out.loc[idx] = 98
        elif r <= 9:
            out.loc[idx] = 97
        elif r <= 12:
            out.loc[idx] = 96
        else:
            rest_count = max(1, n - 12)
            progress = (r - 13) / rest_count
            out.loc[idx] = round(95 - progress * (95 - 50))
    return out


def _json_safe(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy().astype(object)
    out = out.replace([float("inf"), float("-inf")], None)
    out = out.where(pd.notna(out), None)
    return out


def _expand_player_full_names(
    rankings: pd.DataFrame,
    players: pd.DataFrame,
    lookup_path: Path,
) -> pd.DataFrame:
    """
    Replace "FirstInitial LastName" (e.g. MASCAC "K Rogers") with full names when possible.
    1) Where players has first_name + last_name and first_name is more than one character, use "First Last".
    2) Where data/player_full_name_lookup.csv has a row (conference_code, team, player_name_short), use player_name_full.
    """
    out = rankings.copy()
    merge_key = ["conference_code", "team", "player_name"]
    if not all(c in out.columns for c in merge_key):
        return out
    # 1) Full name from players when first_name is not a single initial
    if all(c in players.columns for c in merge_key + ["first_name", "last_name"]):
        sub = players[merge_key + ["first_name", "last_name"]].drop_duplicates(merge_key)
        sub["_full_name"] = sub["first_name"].astype(str).str.strip() + " " + sub["last_name"].astype(str).str.strip()
        mask_full = sub["first_name"].astype(str).str.strip().str.len() > 1
        sub = sub.loc[mask_full, merge_key + ["_full_name"]]
        if not sub.empty:
            out = out.merge(sub, on=merge_key, how="left")
            out["player_name"] = out["_full_name"].fillna(out["player_name"])
            out = out.drop(columns=["_full_name"], errors="ignore")
    # 2) Optional lookup for "Initial LastName" -> full name (e.g. MASCAC)
    if lookup_path.exists():
        try:
            lookup = pd.read_csv(lookup_path)
            for c in ["conference_code", "team", "player_name_short", "player_name_full"]:
                if c not in lookup.columns:
                    break
            else:
                lookup["player_name_short"] = lookup["player_name_short"].astype(str).str.strip()
                lookup["player_name_full"] = lookup["player_name_full"].astype(str).str.strip()
                for _, row in lookup.iterrows():
                    full = str(row["player_name_full"]).strip()
                    if not full:
                        continue
                    mask = (
                        (out["conference_code"].astype(str) == str(row["conference_code"]).strip())
                        & (out["team"].astype(str).str.strip() == str(row["team"]).strip())
                        & (out["player_name"].astype(str).str.strip() == str(row["player_name_short"]).strip())
                    )
                    out.loc[mask, "player_name"] = full
        except Exception:
            pass
    return out


def main() -> None:
    data_csv = Path("data/d3_mbb_player_rankings_2025_26.csv")
    players_csv = Path("data/d3_mbb_players_2025_26.csv")
    if not data_csv.exists():
        # Build it from existing per-conference CSVs (fast; no re-scrape).
        parts = sorted(Path("data").glob("*_mbb_players_2025_26.csv"))
        parts = [p for p in parts if not p.name.startswith("d3_")]
        if not parts:
            raise SystemExit(
                "Missing data/*.csv inputs. Run: python generate_d3_conferences.py && python run_basketball_rankings.py"
            )

        players = pd.concat([pd.read_csv(p) for p in parts], ignore_index=True)
        # Normalize and dedupe so we don't export duplicate names
        if "player_name" in players.columns:
            players["player_name"] = (
                players["player_name"].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
            )
        for key in [["season", "conference_code", "team", "player_name"], ["season", "team", "player_name"]]:
            key = [c for c in key if c in players.columns]
            if key:
                players = players.drop_duplicates(subset=key, keep="first").copy()
        rankings = rank_mbb_players(players, min_gp=10, min_mpg=10.0)
        Path("data").mkdir(parents=True, exist_ok=True)
        players.to_csv(players_csv, index=False)
        rankings.to_csv(data_csv, index=False)

    if not players_csv.exists():
        raise SystemExit("Missing data/d3_mbb_players_2025_26.csv. Run: python run_basketball_rankings.py")

    # Global rankings (already computed across all D3 players).
    global_rankings = pd.read_csv(data_csv).copy()
    global_rankings = global_rankings.rename(columns={"rank": "global_rank"})

    players = pd.read_csv(players_csv).copy()
    # Normalize and dedupe so exported data has 0 duplicate names (same player+team = one row)
    if "player_name" in players.columns:
        players["player_name"] = (
            players["player_name"].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
        )
    for key in [["season", "conference_code", "team", "player_name"], ["season", "team", "player_name"]]:
        key = [c for c in key if c in players.columns]
        if key:
            players = players.drop_duplicates(subset=key, keep="first").copy()
    # Dedupe rankings so one row per player (by team + player_name)
    rank_dedupe = [c for c in ["team", "player_name"] if c in global_rankings.columns]
    if rank_dedupe:
        global_rankings = global_rankings.drop_duplicates(subset=rank_dedupe, keep="first").copy()
    # Ensure global order: best first (rank 1, 2, 3...) and renumber after dedupe
    global_rankings = global_rankings.sort_values("global_rank", ascending=True).reset_index(drop=True)
    global_rankings["global_rank"] = range(1, len(global_rankings) + 1)

    global_rankings["rating"] = _rating_from_rank(global_rankings["global_rank"]).astype(int)

    # Expand "Initial LastName" to full name where we have first_name/last_name (len > 1) or optional lookup
    lookup_path = Path("data/player_full_name_lookup.csv")
    global_rankings = _expand_player_full_names(global_rankings, players, lookup_path)

    out_dir = Path("frontend/public/data")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Build global payload for /dashboard/players
    if "season" not in global_rankings.columns and "season" in players.columns:
        global_rankings["season"] = players["season"].iloc[0] if len(players) else "2025-26"
    elif "season" not in global_rankings.columns:
        global_rankings["season"] = "2025-26"

    global_keep = [
        "global_rank",
        "season",
        "player_name",
        "team",
        "position",
        "conference",
        "conference_code",
        "gp",
        "mpg",
        "ppg",
        "rpg",
        "apg",
        "spg",
        "bpg",
        "tov_pg",
        "composite_score",
        "rating",
    ]
    global_keep = [c for c in global_keep if c in global_rankings.columns]
    global_payload = global_rankings[global_keep].copy()

    out_json = out_dir / "d3_mbb_player_rankings_2025_26.json"
    out_json.write_text(
        json.dumps(_json_safe(global_payload).to_dict(orient="records"), allow_nan=False),
        encoding="utf-8",
    )

    out_csv = out_dir / "d3_mbb_player_rankings_2025_26.csv"
    global_payload.to_csv(out_csv, index=False)

    # Also write global rankings to sports/mbb path so global page has correct conference per player
    sports_mbb_dir = out_dir / "sports" / "mbb"
    sports_mbb_dir.mkdir(parents=True, exist_ok=True)
    mbb_sports_payload = global_payload.copy()
    renames = {
        "ppg": "points_per_game",
        "rpg": "rebounds_per_game",
        "apg": "assists_per_game",
        "tov_pg": "turnovers_per_game",
        "spg": "steals_per_game",
        "bpg": "blocked_shots_per_game",
    }
    mbb_sports_payload = mbb_sports_payload.rename(
        columns={k: v for k, v in renames.items() if k in mbb_sports_payload.columns}
    )
    # rating already set from global_rankings (3×99, 3×98, 3×97, 3×96, rest 95→50)
    mbb_keep = [
        "global_rank", "season", "player_name", "team", "position", "conference", "conference_code",
        "points_per_game", "rebounds_per_game", "assists_per_game", "turnovers_per_game",
        "steals_per_game", "blocked_shots_per_game", "gp", "mpg", "composite_score", "rating",
    ]
    mbb_keep = [c for c in mbb_keep if c in mbb_sports_payload.columns]
    mbb_records = _json_safe(mbb_sports_payload[mbb_keep]).to_dict(orient="records")
    (sports_mbb_dir / "rankings_2025-26.json").write_text(
        json.dumps(mbb_records, allow_nan=False),
        encoding="utf-8",
    )
    # Write meta.json so frontend can read current season
    season_val = str(mbb_sports_payload["season"].iloc[0]) if "season" in mbb_sports_payload.columns and len(mbb_sports_payload) else "2025-26"
    (sports_mbb_dir / "meta.json").write_text(
        json.dumps({"sport_code": "mbb", "sport_label": "Men's Basketball", "season": season_val}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {sports_mbb_dir / 'rankings_2025-26.json'}")

    # Build per-conference payloads: same order as global (best in conference = #1 = highest in global order)
    # Include every conference from conferences.json so C2C etc. appear even with no data yet.
    conf_dir = out_dir / "conferences"
    conf_dir.mkdir(parents=True, exist_ok=True)
    all_conferences = load_conferences()
    conf_name_by_code = {c.code: c.name for c in all_conferences}
    has_data = set(players["conference_code"].dropna().astype(str).unique()) if "conference_code" in players.columns else set()

    index_rows: list[dict[str, object]] = []

    for conf_code, group in players.groupby("conference_code", dropna=True):
        conf_code = str(conf_code)
        conf_name = str(group["conference"].iloc[0]) if "conference" in group.columns and len(group) else conf_name_by_code.get(conf_code, conf_code)

        # Conference rankings = global rankings filtered to this conference, with rank 1..n (reflects global order)
        conf_rankings = global_rankings[global_rankings["conference_code"] == conf_code].copy()
        conf_rankings = conf_rankings.sort_values("global_rank", ascending=True).reset_index(drop=True)
        conf_rankings["rank"] = range(1, len(conf_rankings) + 1)

        conf_keep = [
            "rank",
            "global_rank",
            "season",
            "player_name",
            "team",
            "position",
            "conference",
            "conference_code",
            "gp",
            "mpg",
            "ppg",
            "rpg",
            "apg",
            "spg",
            "bpg",
            "tov_pg",
            "composite_score",
            "rating",
        ]
        conf_keep = [c for c in conf_keep if c in conf_rankings.columns]
        conf_payload = conf_rankings[conf_keep].copy()

        (conf_dir / f"{conf_code}.json").write_text(
            json.dumps(_json_safe(conf_payload).to_dict(orient="records"), allow_nan=False),
            encoding="utf-8",
        )
        conf_payload.to_csv(conf_dir / f"{conf_code}.csv", index=False)

        index_rows.append(
            {
                "conference_code": conf_code,
                "conference": conf_name,
                "player_count": int(len(group)),
                "ranked_count": int(len(conf_payload)),
            }
        )

    # Add conferences that have no player data yet (e.g. C2C when scraper hasn't run or site was down)
    empty_payload_json = "[]"
    for conf in all_conferences:
        if conf.code in has_data:
            continue
        index_rows.append(
            {
                "conference_code": conf.code,
                "conference": conf.name,
                "player_count": 0,
                "ranked_count": 0,
            }
        )
        (conf_dir / f"{conf.code}.json").write_text(empty_payload_json, encoding="utf-8")

    index_rows = sorted(index_rows, key=lambda r: str(r["conference"]))
    (conf_dir / "index.json").write_text(
        json.dumps(index_rows, allow_nan=False, indent=2), encoding="utf-8"
    )

    # Also write conference index and payloads under sports/mbb so sport page finds them
    sports_mbb_conf_dir = out_dir / "sports" / "mbb" / "conferences"
    sports_mbb_conf_dir.mkdir(parents=True, exist_ok=True)
    (sports_mbb_conf_dir / "index.json").write_text(
        json.dumps(index_rows, allow_nan=False, indent=2), encoding="utf-8"
    )
    for conf_code, group in players.groupby("conference_code", dropna=True):
        conf_code = str(conf_code)
        conf_rankings = global_rankings[global_rankings["conference_code"] == conf_code].copy()
        conf_rankings = conf_rankings.sort_values("global_rank", ascending=True).reset_index(drop=True)
        conf_rankings["rank"] = range(1, len(conf_rankings) + 1)
        conf_keep = [
            "rank", "global_rank", "season", "player_name", "team", "position", "conference", "conference_code",
            "gp", "mpg", "ppg", "rpg", "apg", "spg", "bpg", "tov_pg", "composite_score", "rating",
        ]
        conf_keep = [c for c in conf_keep if c in conf_rankings.columns]
        conf_payload = conf_rankings[conf_keep].copy()
        (sports_mbb_conf_dir / f"{conf_code}.json").write_text(
            json.dumps(_json_safe(conf_payload).to_dict(orient="records"), allow_nan=False),
            encoding="utf-8",
        )
    for conf in all_conferences:
        if conf.code not in has_data:
            (sports_mbb_conf_dir / f"{conf.code}.json").write_text("[]", encoding="utf-8")

    print(f"Wrote {out_json}")
    print(f"Wrote {out_csv}")
    print(f"Wrote {conf_dir/'index.json'}")

    # Export other sports from data/d3_{code}_player_rankings_2025_26.csv -> sports/{code}/rankings_2025-26.json
    data_dir = Path("data")
    HOCKEY_CODES = ("mhky", "whky")
    for code in OTHER_SPORT_CODES:
        csv_path = data_dir / f"d3_{code}_player_rankings_2025_26.csv"
        if not csv_path.exists():
            continue
        df = pd.read_csv(csv_path, low_memory=False).copy()
        if df.empty:
            continue
        # Ensure global_rank exists and is 1..n
        if "global_rank" not in df.columns and "rank" in df.columns:
            df = df.rename(columns={"rank": "global_rank"})
        if "global_rank" not in df.columns:
            continue
        # Hockey: backend often has composite_score only for some players; rest are NaN and end up in conference order.
        # Re-rank by composite_score (best first), then by player name so the list is not grouped by conference.
        if code in HOCKEY_CODES and "composite_score" in df.columns:
            df = df.sort_values(
                ["composite_score", "player_name"],
                ascending=[False, True],
                na_position="last",
            ).reset_index(drop=True)
        else:
            df = df.sort_values("global_rank", ascending=True).reset_index(drop=True)
        df["global_rank"] = range(1, len(df) + 1)
        # Hockey: if best composite_score is 0 or all NaN, assign scores from rank so #1 has a real score
        if code in HOCKEY_CODES:
            cs = pd.to_numeric(df["composite_score"], errors="coerce")
            if cs.isna().all() or cs.max() == 0 or (cs <= 0).all():
                n = len(df)
                # Rank 1 = 10, rank n ≈ 0 (linear scale)
                df["composite_score"] = 10.0 * (1.0 - (df["global_rank"] - 1) / max(1, n))
        # Ensure rating (OVR) exists
        if "rating" not in df.columns:
            df["rating"] = _rating_from_rank(df["global_rank"]).astype(int)
        # Ensure season exists
        if "season" not in df.columns:
            df["season"] = "2025-26"
        # Rename columns for frontend
        rename_map = {k: v for k, v in COLUMN_RENAMES.items() if k in df.columns}
        if rename_map:
            df = df.rename(columns=rename_map)
        sport_dir = out_dir / "sports" / code
        sport_dir.mkdir(parents=True, exist_ok=True)
        records = _json_safe(df).to_dict(orient="records")
        (sport_dir / "rankings_2025-26.json").write_text(
            json.dumps(records, allow_nan=False),
            encoding="utf-8",
        )
        season_val = str(df["season"].iloc[0]) if "season" in df.columns and len(df) else "2025-26"
        (sport_dir / "meta.json").write_text(
            json.dumps({
                "sport_code": code,
                "sport_label": SPORT_LABELS.get(code, code.upper()),
                "season": season_val,
            }, indent=2),
            encoding="utf-8",
        )
        print(f"Wrote {sport_dir / 'rankings_2025-26.json'} ({code})")


if __name__ == "__main__":
    main()

