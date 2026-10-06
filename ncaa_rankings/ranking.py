from __future__ import annotations

import math

import pandas as pd

SIDEARM_STATS_PREFIX = "stats_stats_"
BASKETBALL_MIN_GP = 10
BASKETBALL_MIN_MPG = 10.0
# Every sport: counting stats are scored per game, and this many games are required.
MIN_GAMES_PLAYED = 5

_RATE_MARKERS = (
    "per_game",
    "per_set",
    "percentage",
    "_pct",
    "average",
    "_avg",
    "efficiency",
    "whip",
    "vs_par",
    "onbase",
    "slugging",
    "earned_run",
)

# Season totals shown on rankings tables. These are stored again as {column}_per_game.
DISPLAY_COUNTING_COLUMNS = (
    "hitting_stats_home_runs",
    "hitting_stats_runs_batted_in",
    "hitting_stats_runs",
    "hitting_stats_stolen_bases",
    "pitching_stats_strikeouts",
    "pitching_stats_wins",
    "pitching_stats_losses",
    "pitching_stats_saves",
    "pitching_stats_walks_allowed",
    "shot_stats_goals",
    "shot_stats_assists",
    "shot_stats_points",
    "shot_stats_shots",
    "shot_stats_shots_on_goal",
    "misc_stats_ground_balls",
    "misc_stats_caused_turnovers",
    "goalie_stats_saves",
    "goalie_stats_shutouts",
    "goalie_stats_wins",
    "pass_stats_yards",
    "pass_stats_touchdowns",
    "pass_stats_completions",
    "pass_stats_attempts",
    "pass_stats_interceptions",
    "rush_stats_net_yards",
    "rush_stats_touchdowns",
    "receiving_stats_yards",
    "receiving_stats_touchdowns",
    "receiving_stats_number",
    "defense_stats_total_tackles",
    "defense_stats_tackles_for_loss",
    "defense_stats_sacks",
    "defense_stats_interceptions",
    "defense_stats_passes_defended",
    "defense_stats_fumbles_forced",
    "fieldgoal_stats_made",
    "fieldgoal_stats_attempts",
    "punt_stats_inside_twenty",
    "kickreturn_stats_yards",
    "puntreturn_stats_yards",
    "fumble_stats_number_lost",
    "overall_stats_singles_wins",
    "overall_stats_singles_losses",
    "overall_stats_doubles_wins",
    "overall_stats_doubles_losses",
    "overall_stats_total_wins",
)


def _zscore(series: pd.Series) -> pd.Series:
    s = pd.to_numeric(series, errors="coerce")
    mean = s.mean(skipna=True)
    std = s.std(skipna=True, ddof=0)
    if std is None or not math.isfinite(float(std)) or float(std) == 0.0:
        return pd.Series(0.0, index=s.index)
    return (s - mean) / std


def _rating_from_rank(rank_series: pd.Series) -> pd.Series:
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


def normalize_sidearm_stat_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Copy stats_stats_* columns to the unprefixed names composite weights expect."""
    out = df.copy()
    rename: dict[str, str] = {}
    for col in out.columns:
        if not str(col).startswith(SIDEARM_STATS_PREFIX):
            continue
        short = str(col)[len(SIDEARM_STATS_PREFIX) :]
        if short and short not in out.columns:
            rename[col] = short
    if rename:
        out = out.rename(columns=rename)
    return out


def _first_numeric(df: pd.DataFrame, names: tuple[str, ...]) -> pd.Series | None:
    for name in names:
        if name in df.columns:
            return pd.to_numeric(df[name], errors="coerce")
    return None


def is_rate_stat(column: str) -> bool:
    """True when a column is already a rate (average, percentage, per game, per set)."""
    name = column.lower()
    return any(marker in name for marker in _RATE_MARKERS)


def _pair_matches(df: pd.DataFrame, wins_col: str, losses_col: str) -> pd.Series | None:
    wins = _first_numeric(df, (wins_col,))
    losses = _first_numeric(df, (losses_col,))
    if wins is None and losses is None:
        return None
    if wins is None:
        return losses
    if losses is None:
        return wins
    return wins.fillna(0) + losses.fillna(0)


def games_played_series(df: pd.DataFrame) -> pd.Series:
    """Games played, or tennis matches (wins + losses) when a games column is absent."""
    played = _first_numeric(df, ("gp", "games_played"))
    if played is not None and played.notna().any():
        return played
    singles = _pair_matches(df, "overall_stats_singles_wins", "overall_stats_singles_losses")
    doubles = _pair_matches(df, "overall_stats_doubles_wins", "overall_stats_doubles_losses")
    if singles is None and doubles is None:
        return pd.Series(pd.NA, index=df.index, dtype="Float64")
    if singles is None:
        return doubles
    if doubles is None:
        return singles
    return singles.fillna(0) + doubles.fillna(0)


def _stat_games(df: pd.DataFrame, column: str, games: pd.Series) -> pd.Series:
    """Divisor for a counting stat. Pitchers use appearances; goalies use goalie games."""
    if column.startswith("pitching_stats_"):
        appearances = _first_numeric(df, ("pitching_stats_appearances",))
        if appearances is not None:
            return appearances.where(appearances.notna(), games)
    if column.startswith("goalie_stats_"):
        goalie_games = _first_numeric(df, ("goalie_stats_games_played",))
        if goalie_games is not None:
            return goalie_games.where(goalie_games.notna(), games)
    if column.startswith("overall_stats_singles_"):
        matches = _pair_matches(df, "overall_stats_singles_wins", "overall_stats_singles_losses")
        if matches is not None:
            return matches
    if column.startswith("overall_stats_doubles_"):
        matches = _pair_matches(df, "overall_stats_doubles_wins", "overall_stats_doubles_losses")
        if matches is not None:
            return matches
    return games


def counting_per_game(df: pd.DataFrame, column: str, games: pd.Series) -> pd.Series:
    """Season total divided by games so more games does not raise the stat."""
    if column not in df.columns:
        return pd.Series(pd.NA, index=df.index, dtype="Float64")
    values = pd.to_numeric(df[column], errors="coerce")
    divisor = pd.to_numeric(_stat_games(df, column, games), errors="coerce")
    return values / divisor.where(divisor > 0)


def materialize_per_game_columns(
    df: pd.DataFrame,
    columns: tuple[str, ...] | list[str],
    games: pd.Series | None = None,
) -> pd.DataFrame:
    """Add {column}_per_game for counting stats. Rate columns are left unchanged."""
    played = games if games is not None else games_played_series(df)
    for column in columns:
        if column not in df.columns or is_rate_stat(column):
            continue
        df[f"{column}_per_game"] = counting_per_game(df, column, played).round(4)
    return df


def ensure_basketball_rate_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Fill gp, mpg, and turnovers_per_game from Sidearm totals when missing."""
    out = df.copy()
    gp = _first_numeric(out, ("gp", "games_played"))
    if gp is None:
        out["gp"] = pd.NA
    else:
        out["gp"] = gp

    minutes = _first_numeric(out, ("minutes_played", "mp_total"))
    if "mpg" not in out.columns or pd.to_numeric(out["mpg"], errors="coerce").isna().all():
        if minutes is not None:
            gp_safe = pd.to_numeric(out["gp"], errors="coerce")
            out["mpg"] = minutes / gp_safe.replace(0, pd.NA)
        else:
            out["mpg"] = pd.to_numeric(out.get("mpg"), errors="coerce") if "mpg" in out.columns else pd.NA

    if "turnovers_per_game" not in out.columns or pd.to_numeric(
        out["turnovers_per_game"], errors="coerce"
    ).isna().all():
        turnovers = _first_numeric(out, ("turnovers",))
        gp_safe = pd.to_numeric(out["gp"], errors="coerce")
        if turnovers is not None:
            out["turnovers_per_game"] = turnovers / gp_safe.replace(0, pd.NA)
    return out


def rank_by_composite(
    players: pd.DataFrame,
    *,
    weights: dict[str, float],
    min_gp: int | None = MIN_GAMES_PLAYED,
    min_mpg: float | None = None,
) -> pd.DataFrame:
    """
    Rank on z-scored stats. Counting stats are divided by games played first so a
    longer season does not raise the score. Players below min_gp are left unranked.
    Rate stats (averages, percentages, per-set, existing per-game columns) are used as-is.
    Basketball keeps a higher games and minutes floor by passing min_gp and min_mpg.
    """
    df = normalize_sidearm_stat_columns(players)
    if df.empty:
        return df

    if min_gp is None:
        min_gp = MIN_GAMES_PLAYED

    if min_mpg is not None:
        df = ensure_basketball_rate_columns(df)

    if min_gp > 0:
        played = games_played_series(df)
        df = df.loc[played >= min_gp].copy()
        if df.empty:
            raise RuntimeError(f"No eligible players after filters (min_gp={min_gp}).")

    if min_mpg is not None:
        df = df.loc[pd.to_numeric(df["mpg"], errors="coerce") >= min_mpg].copy()
        if df.empty:
            raise RuntimeError("No eligible players after filters.")

    played = games_played_series(df)
    rate_columns = list(dict.fromkeys([*weights.keys(), *DISPLAY_COUNTING_COLUMNS]))
    df = materialize_per_game_columns(df, rate_columns, played)

    score = pd.Series(0.0, index=df.index, dtype=float)
    used_any = False
    for col, w in weights.items():
        if is_rate_stat(col):
            if col not in df.columns:
                continue
            series = pd.to_numeric(df[col], errors="coerce")
        else:
            rate_col = f"{col}_per_game"
            if rate_col not in df.columns:
                continue
            series = pd.to_numeric(df[rate_col], errors="coerce")
        z = _zscore(series)
        score = score + (z.fillna(0.0) * float(w))
        used_any = True

    if not used_any:
        # Stable fallback so downstream exports still work if stats are sparse.
        score = pd.Series(range(len(df), 0, -1), index=df.index, dtype=float)

    df["composite_score"] = score
    sort_cols = ["composite_score"]
    ascending = [False]
    if "player_name" in df.columns:
        sort_cols.append("player_name")
        ascending.append(True)
    df = df.sort_values(sort_cols, ascending=ascending).reset_index(drop=True)
    df["global_rank"] = range(1, len(df) + 1)
    df["rating"] = _rating_from_rank(df["global_rank"]).astype(int)
    return df
