from __future__ import annotations

import math

import pandas as pd

SIDEARM_STATS_PREFIX = "stats_stats_"
BASKETBALL_MIN_GP = 10
BASKETBALL_MIN_MPG = 10.0


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
    min_gp: int | None = None,
    min_mpg: float | None = None,
) -> pd.DataFrame:
    df = normalize_sidearm_stat_columns(players)
    if df.empty:
        return df

    if min_gp is not None or min_mpg is not None:
        df = ensure_basketball_rate_columns(df)
        eligible = df
        if min_gp is not None:
            eligible = eligible[pd.to_numeric(eligible["gp"], errors="coerce") >= min_gp]
        if min_mpg is not None:
            eligible = eligible[pd.to_numeric(eligible["mpg"], errors="coerce") >= min_mpg]
        df = eligible.copy()
        if df.empty:
            raise RuntimeError("No eligible players after filters.")

    score = pd.Series(0.0, index=df.index, dtype=float)
    used_any = False
    for col, w in weights.items():
        if col not in df.columns:
            continue
        z = _zscore(df[col])
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
