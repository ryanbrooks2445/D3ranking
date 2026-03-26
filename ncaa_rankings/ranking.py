from __future__ import annotations

import math

import pandas as pd


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


def rank_by_composite(players: pd.DataFrame, *, weights: dict[str, float]) -> pd.DataFrame:
    df = players.copy()
    if df.empty:
        return df

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
