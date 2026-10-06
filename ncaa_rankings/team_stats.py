"""Aggregate per-player season totals into team-level statistics.

Only statistics that can be derived from the scraped player rows are produced.
Opponent-dependent metrics (points allowed, efficiency, strength of schedule,
win-loss record) are intentionally absent: the current pipeline has no game data.
"""
from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

TOTAL_COLUMNS = {
    "pts_total": "ppg",
    "reb_total": "rpg",
    "ast_total": "apg",
    "tov_total": "tov_pg",
    "stl_total": "spg",
    "blk_total": "bpg",
}
SHOOTING_PAIRS = {
    "fg_pct": ("fgm", "fga"),
    "tp_pct": ("tpm", "tpa"),
    "ft_pct": ("ftm", "fta"),
}
PER_GAME_OUTPUT = {
    "pts_total": "points_per_game",
    "reb_total": "rebounds_per_game",
    "ast_total": "assists_per_game",
    "tov_total": "turnovers_per_game",
    "stl_total": "steals_per_game",
    "blk_total": "blocks_per_game",
}


@dataclass(frozen=True)
class TeamStatRow:
    team: str
    conference_code: str
    conference: str
    season: str
    games_played: int | None
    roster_count: int
    stats: dict[str, float | None]
    totals: dict[str, float | None]
    totals_derived_from_per_game: bool


def _num(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _team_total(group: pd.DataFrame, total_col: str) -> tuple[float | None, bool]:
    """Sum a totals column; fall back to per_game * gp when the source only has rates."""
    if total_col in group.columns and _num(group[total_col]).notna().any():
        return float(_num(group[total_col]).sum(skipna=True)), False
    per_game_col = TOTAL_COLUMNS.get(total_col)
    if per_game_col and per_game_col in group.columns and "gp" in group.columns:
        est = (_num(group[per_game_col]) * _num(group["gp"])).sum(skipna=True)
        if _num(group[per_game_col]).notna().any():
            return float(est), True
    return None, False


def _ratio(num: float | None, den: float | None) -> float | None:
    if num is None or den is None or den <= 0:
        return None
    return round(num / den, 4)


def aggregate_team_stats(players: pd.DataFrame) -> list[TeamStatRow]:
    required = {"team", "conference_code", "gp"}
    missing = required - set(players.columns)
    if missing:
        raise ValueError(f"players frame missing columns: {sorted(missing)}")

    rows: list[TeamStatRow] = []
    for (conf_code, team), group in players.groupby(["conference_code", "team"], dropna=True):
        gp_series = _num(group["gp"])
        games_played = int(gp_series.max()) if gp_series.notna().any() else None
        conference = str(group["conference"].iloc[0]) if "conference" in group.columns else str(conf_code)
        season = str(group["season"].iloc[0]) if "season" in group.columns else ""

        totals: dict[str, float | None] = {}
        derived = False
        for total_col in TOTAL_COLUMNS:
            value, was_derived = _team_total(group, total_col)
            totals[total_col] = value
            derived = derived or was_derived
        for made, att in SHOOTING_PAIRS.values():
            for col in (made, att):
                if col in group.columns and _num(group[col]).notna().any():
                    totals[col] = float(_num(group[col]).sum(skipna=True))
                else:
                    totals[col] = None

        stats: dict[str, float | None] = {}
        for total_col, out_key in PER_GAME_OUTPUT.items():
            total = totals.get(total_col)
            stats[out_key] = round(total / games_played, 2) if total is not None and games_played else None
        for pct_key, (made, att) in SHOOTING_PAIRS.items():
            stats[pct_key] = _ratio(totals.get(made), totals.get(att))

        rows.append(
            TeamStatRow(
                team=str(team),
                conference_code=str(conf_code),
                conference=conference,
                season=season,
                games_played=games_played,
                roster_count=int(len(group)),
                stats=stats,
                totals=totals,
                totals_derived_from_per_game=derived,
            )
        )
    return rows


def team_stat_rows_to_records(rows: list[TeamStatRow]) -> list[dict]:
    records: list[dict] = []
    for r in rows:
        rec: dict = {
            "team": r.team,
            "conference_code": r.conference_code,
            "conference": r.conference,
            "season": r.season,
            "games_played": r.games_played,
            "roster_count": r.roster_count,
            "totals_derived_from_per_game": r.totals_derived_from_per_game,
        }
        rec.update(r.stats)
        rec["totals"] = {k: (None if v is None else round(v, 2)) for k, v in r.totals.items()}
        records.append(rec)
    records.sort(key=lambda x: (x["conference_code"], x["team"]))
    return records
