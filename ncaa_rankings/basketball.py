from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd

from .conferences import Conference
from .c2c_mbb import scrape_c2c_mbb_players


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


def scrape_conference_mbb_players(
    conference: Conference,
    *,
    year: str,
    season_label: str,
) -> pd.DataFrame:
    """
    Load men’s basketball players for a conference.

    Resolution order:
    1) data/{code}_mbb_players_{year}_26.csv if present (cached scrape).
    2) Conference-specific scraper (currently only C2C), then update the cache.
    3) Filter data/d3_mbb_players_2025_26.csv by conference_code.
    4) Raise RuntimeError so caller can skip this conference.
    """
    data_dir = Path("data")

    # 1) Conference-level CSV if it exists (use cached data first, avoids network when site is down)
    csv_path = data_dir / f"{conference.code}_mbb_players_{year}_26.csv"
    if csv_path.exists():
        return pd.read_csv(csv_path)

    # 2) Conference-specific scraper(s)
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

    # 3) Fallback to global players file, filtered by conference_code
    global_players_path = data_dir / "d3_mbb_players_2025_26.csv"
    if global_players_path.exists():
        all_players = pd.read_csv(global_players_path)
        if "conference_code" in all_players.columns:
            conf_players = all_players[all_players["conference_code"] == conference.code].copy()
            if not conf_players.empty:
                return conf_players

    # 4) Nothing found
    raise RuntimeError(f"No men’s basketball player data found for conference {conference.code!r}")

