from __future__ import annotations

import pandas as pd

from .ranking import _rating_from_rank


def _num(df: pd.DataFrame, col: str, default: float = 0.0) -> pd.Series:
    if col not in df.columns:
        return pd.Series(default, index=df.index, dtype=float)
    return pd.to_numeric(df[col], errors="coerce").fillna(default)


def _avg_tier(avg: pd.Series) -> pd.Series:
    """
    Higher is better. Tier 0 is elite.
    .400+ -> 0, .350-.399 -> 1, .300-.349 -> 2, .250-.299 -> 3, else 4
    """
    t = pd.Series(4, index=avg.index, dtype=int)
    t = t.mask(avg >= 0.250, 3)
    t = t.mask(avg >= 0.300, 2)
    t = t.mask(avg >= 0.350, 1)
    t = t.mask(avg >= 0.400, 0)
    return t


def _finalize_ranked(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    out = df.reset_index(drop=True).copy()
    out["global_rank"] = range(1, len(out) + 1)
    out["rating"] = _rating_from_rank(out["global_rank"]).astype(int)
    # Keep a numeric score for downstream display/sorting; higher rank => higher score.
    out["composite_score"] = (len(out) - out["global_rank"] + 1).astype(float)
    return out


def rank_baseball_players(players: pd.DataFrame) -> pd.DataFrame:
    """
    Build baseball rankings with separate segment formulas:
    - Batting: AVG, OBP, SLG, HR, RBI
    - Pitching: ERA, K/9, strike%, WHIP
    Eligibility thresholds keep low-usage players from topping rankings.
    """
    if players.empty:
        return players.copy()

    base = players.copy()

    batting_pool = base[
        (_num(base, "games_played") >= 8) & (_num(base, "hitting_stats_at_bats") >= 30)
    ].copy()
    pitching_pool = base[
        (_num(base, "pitching_stats_games_started") >= 1)
        & (_num(base, "pitching_stats_innings_pitched") >= 15)
    ].copy()

    parts: list[pd.DataFrame] = []
    if not batting_pool.empty:
        batting_pool["avg_tier"] = _avg_tier(_num(batting_pool, "hitting_stats_batting_average"))
        batting_pool = batting_pool.sort_values(
            [
                "avg_tier",
                "hitting_stats_runs_batted_in",
                "hitting_stats_slugging_percentage",
                "hitting_stats_home_runs",
                "hitting_stats_runs",
                "hitting_stats_stolen_bases",
                "player_name",
            ],
            ascending=[True, False, False, False, False, False, True],
            na_position="last",
        )
        batting_ranked = _finalize_ranked(batting_pool)
        batting_ranked = batting_ranked.drop(columns=["avg_tier"], errors="ignore")
        batting_ranked["ranking_segment"] = "batting"
        parts.append(batting_ranked)

    if not pitching_pool.empty:
        ip = _num(pitching_pool, "pitching_stats_innings_pitched")
        strikeouts = _num(pitching_pool, "pitching_stats_strikeouts")
        walks = _num(pitching_pool, "pitching_stats_walks_allowed")
        hits_allowed = _num(pitching_pool, "pitching_stats_hits_allowed")
        opp_avg = _num(pitching_pool, "pitching_stats_opponent_batting_average")
        era = _num(pitching_pool, "pitching_stats_earned_run_average")

        ip_safe = ip.where(ip > 0, pd.NA)
        pitching_pool["pitching_stats_k_per_9"] = ((strikeouts * 9.0) / ip_safe).fillna(0.0)
        pitching_pool["pitching_stats_whip"] = ((walks + hits_allowed) / ip_safe).fillna(0.0)
        pitching_pool["pitching_stats_opponent_batting_average"] = opp_avg
        pitching_pool["pitching_stats_earned_run_average"] = era
        pitching_pool = pitching_pool.sort_values(
            [
                "pitching_stats_k_per_9",
                "pitching_stats_whip",
                "pitching_stats_opponent_batting_average",
                "pitching_stats_earned_run_average",
                "player_name",
            ],
            ascending=[False, True, True, True, True],
            na_position="last",
        )
        pitching_ranked = _finalize_ranked(pitching_pool)
        pitching_ranked["ranking_segment"] = "pitching"
        parts.append(pitching_ranked)

    if not parts:
        fallback = _finalize_ranked(base.copy())
        fallback["ranking_segment"] = "batting"
        return fallback

    ranked = pd.concat(parts, ignore_index=True)
    ranked = ranked.sort_values(
        ["ranking_segment", "global_rank", "player_name"],
        ascending=[True, True, True],
    ).reset_index(drop=True)
    return ranked

