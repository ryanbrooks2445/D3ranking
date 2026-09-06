from __future__ import annotations

"""
Export MBB rankings to frontend/public/data for the dashboard.
Writes current-season rankings JSON (default 2026-27) plus a rankings_2025-26.json
copy for older frontend builds. Prefers data/d3_*_{FILE_TAG}.csv and falls back to
the previous season's CSVs when the new scrape is empty so we do not wipe the site.
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
from ncaa_rankings.season import (
    FILE_TAG,
    LEGACY_FILE_TAG,
    LEGACY_RANKINGS_JSON,
    LEGACY_SEASON_LABEL,
    RANKINGS_JSON,
    SEASON_LABEL,
    rankings_json_name,
    season_candidates,
)

# Sport codes that have data/d3_{code}_player_rankings_2025_26.csv (excluding mbb, handled above).
OTHER_SPORT_CODES = [
    "wbb", "mvb", "wvb", "baseball", "softball",
    "mhky", "whky", "mlax", "wlax", "msoc", "wsoc",
    "football", "mten", "wten",
]
GOLF_SPORT_CODES = ("mgolf", "wgolf")
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
    "football": "Football",
    "mgolf": "Men's Golf",
    "wgolf": "Women's Golf",
    "mten": "Men's Tennis",
    "wten": "Women's Tennis",
}


def _nonempty_csv(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    try:
        return not pd.read_csv(path, nrows=1).empty
    except (pd.errors.EmptyDataError, pd.errors.ParserError, OSError):
        return False


def _prefer_sport_csv(data_dir: Path, prefix: str) -> tuple[Path | None, str, str]:
    for tag, label in season_candidates():
        path = data_dir / f"{prefix}_{tag}.csv"
        if _nonempty_csv(path):
            return path, tag, label
    return None, FILE_TAG, SEASON_LABEL


def _resolve_mbb_inputs() -> tuple[Path, Path, str, str]:
    """Newest non-empty MBB rankings + players CSVs, or build from conference parts."""
    data_dir = Path("data")
    data_csv, tag, label = _prefer_sport_csv(data_dir, "d3_mbb_player_rankings")
    players_csv = data_dir / f"d3_mbb_players_{tag}.csv" if data_csv is not None else None
    if data_csv is not None and players_csv is not None and _nonempty_csv(players_csv):
        return data_csv, players_csv, tag, label

    for cand_tag, cand_label in season_candidates():
        parts = sorted(data_dir.glob(f"*_mbb_players_{cand_tag}.csv"))
        parts = [p for p in parts if not p.name.startswith("d3_")]
        if not parts:
            continue
        players = pd.concat([pd.read_csv(p) for p in parts], ignore_index=True)
        if "player_name" in players.columns:
            players["player_name"] = (
                players["player_name"].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
            )
        for key in [["season", "conference_code", "team", "player_name"], ["season", "team", "player_name"]]:
            key = [c for c in key if c in players.columns]
            if key:
                players = players.drop_duplicates(subset=key, keep="first").copy()
        rankings = rank_mbb_players(players, min_gp=10, min_mpg=10.0)
        data_dir.mkdir(parents=True, exist_ok=True)
        built_players = data_dir / f"d3_mbb_players_{cand_tag}.csv"
        built_rankings = data_dir / f"d3_mbb_player_rankings_{cand_tag}.csv"
        players.to_csv(built_players, index=False)
        rankings.to_csv(built_rankings, index=False)
        return built_rankings, built_players, cand_tag, cand_label

    raise SystemExit(
        f"Missing data/*.csv inputs. Run: python run_basketball_rankings.py "
        f"(expected d3_mbb_*_{FILE_TAG}.csv or legacy {LEGACY_FILE_TAG})"
    )


def _csv_row_count(path: Path, fallback: int) -> int:
    """Row count for an optional per-conference players CSV; empty files are not fatal."""
    try:
        return len(pd.read_csv(path, low_memory=False))
    except (pd.errors.EmptyDataError, pd.errors.ParserError, OSError):
        return fallback


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
    data_csv, players_csv, mbb_tag, mbb_label = _resolve_mbb_inputs()
    print(f"MBB export using {data_csv.name} ({mbb_label})", flush=True)

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
        global_rankings["season"] = players["season"].iloc[0] if len(players) else mbb_label
    elif "season" not in global_rankings.columns:
        global_rankings["season"] = mbb_label

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

    out_json = out_dir / f"d3_mbb_player_rankings_{mbb_tag}.json"
    out_json.write_text(
        json.dumps(_json_safe(global_payload).to_dict(orient="records"), allow_nan=False),
        encoding="utf-8",
    )

    out_csv = out_dir / f"d3_mbb_player_rankings_{mbb_tag}.csv"
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
    mbb_rankings_name = rankings_json_name(mbb_label)
    (sports_mbb_dir / mbb_rankings_name).write_text(
        json.dumps(mbb_records, allow_nan=False),
        encoding="utf-8",
    )
    if mbb_rankings_name != LEGACY_RANKINGS_JSON:
        (sports_mbb_dir / LEGACY_RANKINGS_JSON).write_text(
            json.dumps(mbb_records, allow_nan=False),
            encoding="utf-8",
        )
    # Write meta.json so frontend can read current season
    season_val = str(mbb_sports_payload["season"].iloc[0]) if "season" in mbb_sports_payload.columns and len(mbb_sports_payload) else mbb_label
    (sports_mbb_dir / "meta.json").write_text(
        json.dumps({"sport_code": "mbb", "sport_label": "Men's Basketball", "season": season_val}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {sports_mbb_dir / mbb_rankings_name}")

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

    # Export other sports: prefer 2026-27 CSVs, fall back to 2025-26 if the new season is empty.
    data_dir = Path("data")
    HOCKEY_CODES = ("mhky", "whky")

    def export_sidearm_global_and_meta(
        code: str,
        csv_path: Path,
        *,
        rankings_filename: str,
        default_season: str,
    ) -> None:
        """Shared path: d3_*_player_rankings CSV -> sports/{code}/{rankings_filename} + meta.json."""
        try:
            df = pd.read_csv(csv_path, low_memory=False).copy()
        except (pd.errors.EmptyDataError, pd.errors.ParserError):
            print(f"Skipping empty/unreadable export: {csv_path.name}", flush=True)
            return
        if df.empty:
            return
        if "global_rank" not in df.columns and "rank" in df.columns:
            df = df.rename(columns={"rank": "global_rank"})
        if "global_rank" not in df.columns:
            return
        if code in HOCKEY_CODES and "composite_score" in df.columns:
            df = df.sort_values(
                ["composite_score", "player_name"],
                ascending=[False, True],
                na_position="last",
            ).reset_index(drop=True)
        else:
            df = df.sort_values("global_rank", ascending=True).reset_index(drop=True)
        df["global_rank"] = range(1, len(df) + 1)
        if code in HOCKEY_CODES:
            cs = pd.to_numeric(df["composite_score"], errors="coerce")
            if cs.isna().all() or cs.max() == 0 or (cs <= 0).all():
                n = len(df)
                df["composite_score"] = 10.0 * (1.0 - (df["global_rank"] - 1) / max(1, n))
        if "rating" not in df.columns:
            df["rating"] = _rating_from_rank(df["global_rank"]).astype(int)
        if "season" not in df.columns:
            df["season"] = default_season
        rename_map = {k: v for k, v in COLUMN_RENAMES.items() if k in df.columns}
        if rename_map:
            df = df.rename(columns=rename_map)
        sport_dir = out_dir / "sports" / code
        sport_dir.mkdir(parents=True, exist_ok=True)
        records = _json_safe(df).to_dict(orient="records")
        (sport_dir / rankings_filename).write_text(
            json.dumps(records, allow_nan=False),
            encoding="utf-8",
        )
        season_val = str(df["season"].iloc[0]) if "season" in df.columns and len(df) else default_season
        (sport_dir / "meta.json").write_text(
            json.dumps(
                {
                    "sport_code": code,
                    "sport_label": SPORT_LABELS.get(code, code.upper()),
                    "season": season_val,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"Wrote {sport_dir / rankings_filename} ({code}, {season_val})")

    for code in OTHER_SPORT_CODES:
        csv_path, tag, label = _prefer_sport_csv(data_dir, f"d3_{code}_player_rankings")
        if csv_path is None:
            continue
        export_sidearm_global_and_meta(
            code,
            csv_path,
            rankings_filename=rankings_json_name(label),
            default_season=label,
        )
        if label == SEASON_LABEL:
            export_sidearm_global_and_meta(
                code,
                csv_path,
                rankings_filename=LEGACY_RANKINGS_JSON,
                default_season=label,
            )
        if code == "football":
            _export_sidearm_conference_jsons(data_dir, out_dir, sport_code="football", file_tag=tag)

    for code in GOLF_SPORT_CODES:
        csv_path, tag, label = _prefer_sport_csv(data_dir, f"d3_{code}_player_rankings")
        if csv_path is None:
            print(f"Skipping {code}; run: python run_golf_rankings.py", flush=True)
            continue
        export_sidearm_global_and_meta(
            code,
            csv_path,
            rankings_filename=rankings_json_name(label),
            default_season=label,
        )
        if label == SEASON_LABEL:
            export_sidearm_global_and_meta(
                code,
                csv_path,
                rankings_filename=LEGACY_RANKINGS_JSON,
                default_season=label,
            )
        _export_sidearm_conference_jsons(data_dir, out_dir, sport_code=code, file_tag=tag)
        sport_dir = out_dir / "sports" / code
        meta_path = sport_dir / "meta.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            meta["data_source"] = "clippd_scoreboard"
            meta["data_source_url"] = "https://scoreboard.clippd.com/players/search?division=NCAA+Division+III"
            meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Prefer 2026–27 baseball when scraped; overwrites sports/baseball/* from the loop above.
    baseball_2627 = data_dir / "d3_baseball_player_rankings_2026_27.csv"
    if baseball_2627.exists():
        export_sidearm_global_and_meta(
            "baseball",
            baseball_2627,
            rankings_filename="rankings_2026-27.json",
            default_season="2026-27",
        )
        # Backward compatibility for older frontend builds that still read rankings_2025-26.json.
        export_sidearm_global_and_meta(
            "baseball",
            baseball_2627,
            rankings_filename="rankings_2025-26.json",
            default_season="2026-27",
        )
        _export_baseball_conference_jsons(data_dir, out_dir, file_tag="2026_27")


def _export_baseball_conference_jsons(data_dir: Path, out_dir: Path, *, file_tag: str) -> None:
    """
    Write sports/baseball/conferences/{code}.json for the given season.
    IMPORTANT: Conference rows are derived from the GLOBAL baseball rankings so `rating`
    matches global (a player cannot be 99 in conference but 95 globally).
    """
    conf_dir = out_dir / "sports" / "baseball" / "conferences"
    conf_dir.mkdir(parents=True, exist_ok=True)
    global_rankings_path = data_dir / f"d3_baseball_player_rankings_{file_tag}.csv"
    if not global_rankings_path.exists():
        print(f"Skipping baseball conference export; missing {global_rankings_path.name}")
        return
    global_df = pd.read_csv(global_rankings_path, low_memory=False).copy()
    if global_df.empty or "conference_code" not in global_df.columns:
        print(f"Skipping baseball conference export; global rankings missing conference_code")
        return
    # Normalize global order and ensure global_rank is present
    if "global_rank" not in global_df.columns and "rank" in global_df.columns:
        global_df = global_df.rename(columns={"rank": "global_rank"})
    if "global_rank" not in global_df.columns:
        global_df["global_rank"] = range(1, len(global_df) + 1)
    global_df = global_df.sort_values("global_rank", ascending=True).reset_index(drop=True)
    rename_map = {k: v for k, v in COLUMN_RENAMES.items() if k in global_df.columns}
    if rename_map:
        global_df = global_df.rename(columns=rename_map)

    index_rows: list[dict[str, object]] = []

    for conf_code, df in global_df.groupby("conference_code", dropna=True):
        conf_code = str(conf_code)
        df = df.copy()
        # Keep global order; conference page assigns its own 1..n rank display
        df = df.sort_values("global_rank", ascending=True).reset_index(drop=True)
        records = _json_safe(df).to_dict(orient="records")
        (conf_dir / f"{conf_code}.json").write_text(
            json.dumps(records, allow_nan=False),
            encoding="utf-8",
        )
        players_path = data_dir / f"{conf_code}_baseball_players_{file_tag}.csv"
        player_count = _csv_row_count(players_path, len(df)) if players_path.exists() else len(df)
        conf_name = str(df["conference"].iloc[0]) if "conference" in df.columns and len(df) else conf_code
        index_rows.append(
            {
                "conference_code": conf_code,
                "conference": conf_name,
                "player_count": int(player_count),
                "ranked_count": int(len(df)),
            }
        )

    index_rows = sorted(index_rows, key=lambda r: str(r["conference"]).lower())
    (conf_dir / "index.json").write_text(
        json.dumps(index_rows, allow_nan=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote baseball conference JSONs ({file_tag}) -> {conf_dir}")


def _export_sidearm_conference_jsons(
    data_dir: Path,
    out_dir: Path,
    *,
    sport_code: str,
    file_tag: str,
) -> None:
    """
    Write sports/{sport_code}/conferences/{code}.json from global rankings for a sidearm sport.
    """
    conf_dir = out_dir / "sports" / sport_code / "conferences"
    conf_dir.mkdir(parents=True, exist_ok=True)
    global_rankings_path = data_dir / f"d3_{sport_code}_player_rankings_{file_tag}.csv"
    if not global_rankings_path.exists():
        print(f"Skipping {sport_code} conference export; missing {global_rankings_path.name}")
        return
    global_df = pd.read_csv(global_rankings_path, low_memory=False).copy()
    if global_df.empty or "conference_code" not in global_df.columns:
        print(f"Skipping {sport_code} conference export; global rankings missing conference_code")
        return
    if "global_rank" not in global_df.columns and "rank" in global_df.columns:
        global_df = global_df.rename(columns={"rank": "global_rank"})
    if "global_rank" not in global_df.columns:
        global_df["global_rank"] = range(1, len(global_df) + 1)
    global_df = global_df.sort_values("global_rank", ascending=True).reset_index(drop=True)
    rename_map = {k: v for k, v in COLUMN_RENAMES.items() if k in global_df.columns}
    if rename_map:
        global_df = global_df.rename(columns=rename_map)

    index_rows: list[dict[str, object]] = []

    for conf_code, df in global_df.groupby("conference_code", dropna=True):
        conf_code = str(conf_code)
        df = df.sort_values("global_rank", ascending=True).reset_index(drop=True)
        records = _json_safe(df).to_dict(orient="records")
        (conf_dir / f"{conf_code}.json").write_text(
            json.dumps(records, allow_nan=False),
            encoding="utf-8",
        )
        players_path = data_dir / f"{conf_code}_{sport_code}_players_{file_tag}.csv"
        player_count = _csv_row_count(players_path, len(df)) if players_path.exists() else len(df)
        conf_name = str(df["conference"].iloc[0]) if "conference" in df.columns and len(df) else conf_code
        index_rows.append(
            {
                "conference_code": conf_code,
                "conference": conf_name,
                "player_count": int(player_count),
                "ranked_count": int(len(df)),
            }
        )

    index_rows = sorted(index_rows, key=lambda r: str(r["conference"]).lower())
    (conf_dir / "index.json").write_text(
        json.dumps(index_rows, allow_nan=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {sport_code} conference JSONs ({file_tag}) -> {conf_dir}")


if __name__ == "__main__":
    main()

