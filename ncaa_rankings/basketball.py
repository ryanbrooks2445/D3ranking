from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd

from .c2c_mbb import scrape_c2c_mbb_players
from .conferences import Conference
from .sidearm_generic import scrape_conference_players_sidearm

SIDEARM_MBB_PATH = "mbball"

# Sidearm conf_stats payloads flatten to stats_stats_*; map onto the MBB ranking schema.
_SIDEARM_MBB_COLUMN_MAP = {
    "stats_stats_games_played": "gp",
    "games_played": "gp",
    "stats_stats_minutes_played": "mp_total",
    "stats_stats_points_per_game": "ppg",
    "stats_stats_rebounds_per_game": "rpg",
    "stats_stats_assists_per_game": "apg",
    "stats_stats_steals_per_game": "spg",
    "stats_stats_blocked_shots_per_game": "bpg",
    "stats_stats_turnovers": "tov_total",
    "stats_stats_points_scored": "pts_total",
    "stats_stats_total_rebounds": "reb_total",
    "stats_stats_assists": "ast_total",
    "stats_stats_steals": "stl_total",
    "stats_stats_blocked_shots": "blk_total",
    "stats_stats_field_goals_made": "fgm",
    "stats_stats_field_goals_attempted": "fga",
    "stats_stats_field_goals_pct": "fg_pct",
    "stats_stats_three_points_made": "tpm",
    "stats_stats_three_points_attempted": "tpa",
    "stats_stats_three_points_pct": "tp_pct",
    "stats_stats_free_throws_made": "ftm",
    "stats_stats_free_throws_attempted": "fta",
    "stats_stats_free_throws_pct": "ft_pct",
    "year": "class_year",
}


def _to_float(x: Any) -> float | None:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


@dataclass(frozen=True)
class CompositeWeights:
    """Weights for composite z-score. PPG is primary so best players (elite scorers + all-around) rank correctly."""
    ppg: float = 2.0   # scoring is primary differentiator for "best" players
    rpg: float = 0.7
    apg: float = 0.7
    spg: float = 0.5   # avoid steal/block specialists outranking stars
    bpg: float = 0.5   # avoid block specialists outranking stars
    tov_pg: float = -0.8


def _zscore(series: pd.Series) -> pd.Series:
    s = pd.to_numeric(series, errors="coerce")
    mean = s.mean(skipna=True)
    std = s.std(skipna=True, ddof=0)
    if std == 0 or pd.isna(std):
        return s * 0
    return (s - mean) / std


def rank_mbb_players(
    df: pd.DataFrame,
    *,
    min_gp: int = 10,
    min_mpg: float = 10.0,
    weights: CompositeWeights = CompositeWeights(),
) -> pd.DataFrame:
    out = df.copy()
    out["gp"] = pd.to_numeric(out.get("gp"), errors="coerce")
    out["mpg"] = pd.to_numeric(out.get("mpg"), errors="coerce")

    eligible = out[(out["gp"] >= min_gp) & (out["mpg"] >= min_mpg)].copy()
    if eligible.empty:
        raise RuntimeError("No eligible players after filters.")

    eligible["z_ppg"] = _zscore(eligible.get("ppg"))
    eligible["z_rpg"] = _zscore(eligible.get("rpg"))
    eligible["z_apg"] = _zscore(eligible.get("apg"))
    eligible["z_spg"] = _zscore(eligible.get("spg"))
    eligible["z_bpg"] = _zscore(eligible.get("bpg"))
    eligible["z_tov_pg"] = _zscore(eligible.get("tov_pg"))

    eligible["composite_score"] = (
        weights.ppg * eligible["z_ppg"]
        + weights.rpg * eligible["z_rpg"]
        + weights.apg * eligible["z_apg"]
        + weights.spg * eligible["z_spg"]
        + weights.bpg * eligible["z_bpg"]
        + weights.tov_pg * eligible["z_tov_pg"]
    )

    eligible = eligible.sort_values(["composite_score", "ppg"], ascending=[False, False])
    eligible["rank"] = range(1, len(eligible) + 1)

    cols = [
        "rank",
        "conference_code",
        "conference",
        "season",
        "team",
        "player_name",
        "class_year",
        "position",
        "gp",
        "mpg",
        "ppg",
        "rpg",
        "apg",
        "spg",
        "bpg",
        "tov_pg",
        "composite_score",
    ]
    zcols = ["z_ppg", "z_rpg", "z_apg", "z_spg", "z_bpg", "z_tov_pg"]
    cols = [c for c in cols if c in eligible.columns] + [c for c in zcols if c in eligible.columns]
    return eligible[cols]


def _normalize_sidearm_mbb_players(
    raw: pd.DataFrame,
    conference: Conference,
    season_label: str,
) -> pd.DataFrame:
    """Map flattened Sidearm MBB columns onto gp/mpg/ppg/... used by rank_mbb_players."""
    if raw.empty:
        return raw

    out = raw.copy()
    rename = {src: dst for src, dst in _SIDEARM_MBB_COLUMN_MAP.items() if src in out.columns}
    if rename:
        out = out.rename(columns=rename)

    if "gp" not in out.columns:
        return pd.DataFrame()

    out["gp"] = pd.to_numeric(out["gp"], errors="coerce")
    if "mp_total" in out.columns:
        out["mp_total"] = pd.to_numeric(out["mp_total"], errors="coerce")
        out["mpg"] = out["mp_total"] / out["gp"].replace(0, pd.NA)
    elif "mpg" not in out.columns:
        out["mpg"] = pd.NA

    if "tov_total" in out.columns:
        out["tov_total"] = pd.to_numeric(out["tov_total"], errors="coerce")
        out["tov_pg"] = out["tov_total"] / out["gp"].replace(0, pd.NA)
    elif "tov_pg" not in out.columns:
        out["tov_pg"] = pd.NA

    if "first_name" in out.columns and "last_name" in out.columns:
        first = out["first_name"].fillna("").astype(str).str.strip().replace({"None": "", "nan": ""})
        last = out["last_name"].fillna("").astype(str).str.strip().replace({"None": "", "nan": ""})
        assembled = (first + " " + last).str.replace(r"\s+", " ", regex=True).str.strip()
        raw_name = out["player_name"].astype(str) if "player_name" in out.columns else assembled
        out["player_name"] = assembled.where(assembled.str.len() > 1, raw_name)

    out["conference_code"] = conference.code
    out["conference"] = conference.name
    out["season"] = season_label

    keep = [
        "conference_code",
        "conference",
        "season",
        "team",
        "player_name",
        "first_name",
        "last_name",
        "gp",
        "mpg",
        "ppg",
        "rpg",
        "apg",
        "spg",
        "bpg",
        "tov_pg",
        "class_year",
        "position",
        "mp_total",
        "pts_total",
        "reb_total",
        "ast_total",
        "stl_total",
        "blk_total",
        "tov_total",
        "fgm",
        "fga",
        "fg_pct",
        "tpm",
        "tpa",
        "tp_pct",
        "ftm",
        "fta",
        "ft_pct",
    ]
    return out[[c for c in keep if c in out.columns]].copy()


def scrape_conference_mbb_players(
    conference: Conference,
    *,
    year: str,
    season_label: str,
    refresh: bool = False,
) -> pd.DataFrame:
    """
    Load men’s basketball players for a conference.

    Resolution order:
    1) data/{code}_mbb_players_{year}_26.csv if present (unless refresh=True).
    2) Live Sidearm scrape (platform=sidearm) via conf_stats, normalized to MBB columns.
    3) Conference-specific scraper (currently only C2C), then update the cache.
    4) Cached conference CSV if a live scrape returned nothing.
    5) Filter data/d3_mbb_players_2025_26.csv by conference_code.
    6) Raise RuntimeError so caller can skip this conference.
    """
    data_dir = Path("data")

    # 1) Conference-level CSV if it exists (use cached data first, avoids network when site is down)
    csv_path = data_dir / f"{conference.code}_mbb_players_{year}_26.csv"
    if not refresh and csv_path.exists():
        return pd.read_csv(csv_path)

    # 2) Live Sidearm scrape when asked to refresh (or cache is missing)
    if conference.platform == "sidearm":
        try:
            raw = scrape_conference_players_sidearm(
                conference=conference,
                sport_path=SIDEARM_MBB_PATH,
                year=year,
                season_label=season_label,
                conf_only=False,
            )
            df = _normalize_sidearm_mbb_players(raw, conference, season_label)
        except Exception as e:
            print(f"  {conference.code}: Sidearm MBB scrape failed ({e})", flush=True)
            df = pd.DataFrame()
        if not df.empty:
            data_dir.mkdir(parents=True, exist_ok=True)
            df.to_csv(csv_path, index=False)
            return df

    # 3) Conference-specific scraper(s)
    if conference.code == "c2c":
        try:
            df = scrape_c2c_mbb_players(conference=conference, year=year, season_label=season_label)
        except Exception:
            df = pd.DataFrame()
        if not df.empty:
            # Persist a normalized CSV so future runs can use the cached file
            data_dir.mkdir(parents=True, exist_ok=True)
            df.to_csv(csv_path, index=False)
            return df

    # 4) Keep yesterday's conference file if a refresh found nothing
    if csv_path.exists():
        print(f"  {conference.code}: using cached MBB CSV (live scrape empty/failed)", flush=True)
        return pd.read_csv(csv_path)

    # 5) Fallback to global players file, filtered by conference_code
    global_players_path = data_dir / "d3_mbb_players_2025_26.csv"
    if global_players_path.exists():
        all_players = pd.read_csv(global_players_path)
        if "conference_code" in all_players.columns:
            conf_players = all_players[all_players["conference_code"] == conference.code].copy()
            if not conf_players.empty:
                return conf_players

    # 6) Nothing found
    raise RuntimeError(f"No men’s basketball player data found for conference {conference.code!r}")

