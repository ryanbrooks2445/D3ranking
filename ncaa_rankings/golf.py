from __future__ import annotations

import re
from typing import Any

import pandas as pd

from .clippd import fetch_player_leaderboard
from .conferences import load_conferences
from .ranking import _rating_from_rank

# Minimum stroke-play rounds to qualify for D3Rank OVR (filters tiny samples).
DEFAULT_MIN_STROKE_PLAY_ROUNDS = 6


def _strip_conf_paren(name: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*$", "", name.strip()).strip()


def build_conference_lookup() -> dict[str, str]:
    """Map Clippd conference label -> internal conference_code."""
    lookup: dict[str, str] = {}
    for conf in load_conferences():
        keys = {
            conf.name.strip().lower(),
            _strip_conf_paren(conf.name).lower(),
        }
        for key in keys:
            if key:
                lookup[key] = conf.code
    return lookup


def _normalize_conf_label(name: str) -> str:
    s = _strip_conf_paren(name.strip())
    # Clippd often abbreviates e.g. "Inter." -> "Intercollegiate"
    s = re.sub(r"Inter\.", "Intercollegiate", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def conference_code_for_clippd(conference: str | None, lookup: dict[str, str]) -> str:
    if not conference:
        return "unknown"
    raw = _normalize_conf_label(str(conference))
    if not raw:
        return "unknown"
    key = raw.lower()
    if key in lookup:
        return lookup[key]
    stripped = _strip_conf_paren(raw).lower()
    if stripped in lookup:
        return lookup[stripped]
    for known, code in lookup.items():
        if known in key or key in known:
            return code
    slug = re.sub(r"[^a-z0-9]+", "_", stripped).strip("_")
    return slug or "unknown"


def clippd_rows_to_players(
    rows: list[dict[str, Any]],
    *,
    sport_code: str,
    gender: str,
    season_label: str = "2025-26",
    conference_lookup: dict[str, str] | None = None,
) -> pd.DataFrame:
    lookup = conference_lookup or build_conference_lookup()
    out_rows: list[dict[str, Any]] = []

    for row in rows:
        player_name = str(row.get("playerName") or row.get("displayName") or "").strip()
        if not player_name:
            continue
        conf_name = str(row.get("conference") or "").strip() or None
        conf_code = conference_code_for_clippd(conf_name, lookup)
        avg_score = row.get("averageScore")
        adj_score = row.get("adjustedScore")
        rounds = row.get("strokePlayRounds")
        vs_par = None
        try:
            if avg_score is not None:
                vs_par = round(float(avg_score) - 72.0, 2)
        except (TypeError, ValueError):
            vs_par = None

        out_rows.append(
            {
                "season": season_label,
                "sport": sport_code,
                "gender": gender,
                "conference": conf_name,
                "conference_code": conf_code,
                "team": str(row.get("boardName") or row.get("schoolName") or "").strip() or None,
                "school_name": str(row.get("schoolName") or "").strip() or None,
                "player_name": player_name,
                "position": None,
                "class_year": str(row.get("schoolYear") or "").strip() or None,
                "clippd_player_id": row.get("playerId"),
                "clippd_rank": row.get("rank"),
                "player_ranking_status": str(row.get("playerRankingStatus") or "").strip() or None,
                "scoring_stats_scoring_average": avg_score,
                "scoring_stats_vs_par": vs_par,
                "scoring_stats_rounds": rounds,
                "scoring_stats_adjusted_score": adj_score,
                "scoring_stats_stroke_play_events": row.get("strokePlayEvents"),
                "top10_finishes": row.get("eventsTop3"),
                "events_won": row.get("eventsWon"),
                "average_points": row.get("averagePoints"),
                "strength_of_schedule": row.get("strengthOfSchedule"),
                "region": row.get("region"),
                "data_source": "clippd_scoreboard",
            }
        )

    df = pd.DataFrame(out_rows)
    if df.empty:
        return df
    if "clippd_player_id" in df.columns:
        df = df.drop_duplicates(subset=["clippd_player_id"], keep="first").copy()
    return df


def rank_golf_players(
    players: pd.DataFrame,
    *,
    min_stroke_play_rounds: int = DEFAULT_MIN_STROKE_PLAY_ROUNDS,
) -> pd.DataFrame:
    """
    D3Rank golf formula (D3 twist on Clippd inputs):
    - ACTIVE players with enough stroke-play rounds
    - Sort: lower scoring average, higher Clippd average points, more wins, name
    - OVR from global_rank via standard D3Rank curve
    """
    if players.empty:
        return players.copy()

    df = players.copy()
    rounds = pd.to_numeric(df.get("scoring_stats_rounds"), errors="coerce")
    avg = pd.to_numeric(df.get("scoring_stats_scoring_average"), errors="coerce")
    pts = pd.to_numeric(df.get("average_points"), errors="coerce")
    wins = pd.to_numeric(df.get("events_won"), errors="coerce").fillna(0)

    status = df.get("player_ranking_status")
    if status is not None:
        active = status.astype(str).str.upper().eq("ACTIVE")
    else:
        active = pd.Series(True, index=df.index)

    eligible = df[active & (rounds >= min_stroke_play_rounds) & avg.notna()].copy()
    if eligible.empty:
        raise RuntimeError(
            f"No eligible golf players after filters (min_stroke_play_rounds={min_stroke_play_rounds})."
        )

    eligible = eligible.sort_values(
        [
            "scoring_stats_scoring_average",
            "average_points",
            "events_won",
            "player_name",
        ],
        ascending=[True, False, False, True],
        na_position="last",
    ).reset_index(drop=True)

    eligible["global_rank"] = range(1, len(eligible) + 1)
    eligible["rating"] = _rating_from_rank(eligible["global_rank"]).astype(int)
    # Higher average_points = stronger season; use for Score column on site.
    eligible["composite_score"] = pts.fillna(0.0)
    return eligible


def ingest_and_rank_clippd_golf(
    *,
    sport_code: str,
    gender: str,
    season_label: str = "2025-26",
    clippd_season: str = "2026",
    min_stroke_play_rounds: int = DEFAULT_MIN_STROKE_PLAY_ROUNDS,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    rows = fetch_player_leaderboard(gender=gender, season=clippd_season)
    players = clippd_rows_to_players(
        rows,
        sport_code=sport_code,
        gender=gender,
        season_label=season_label,
    )
    rankings = rank_golf_players(players, min_stroke_play_rounds=min_stroke_play_rounds)
    return players, rankings
