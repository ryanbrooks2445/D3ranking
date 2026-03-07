"""
Scrape C2C (Coast-To-Coast Athletic Conference) men's basketball player stats.

Data comes from the conference-wide players page in two views:
- Shooting (Game): ppg, gp, min/g → mpg
- Ball control (Game): reb/g, ast/g, to/g, stl/g, blk/g → rpg, apg, tov_pg, spg, bpg

We fetch both HTML tables and merge on (player_name, team).
"""

from __future__ import annotations

import re

import pandas as pd
import requests
from bs4 import BeautifulSoup

from .conferences import Conference


def _players_url(base_url: str, season_label: str, pos: str, sort: str = "ptspg") -> str:
    """Build URL for conference players page. pos=sh (shooting) or pos=bc (ball control)."""
    return f"{base_url}/sports/mbkb/{season_label}/players?sort={sort}&view=&pos={pos}&r=0"


def _text(cell) -> str:
    """Extract visible text from a table cell (strip links to text)."""
    if cell is None:
        return ""
    return "".join(cell.find_all(string=True, recursive=True)).strip()


def _parse_players_table(html: str, view: str) -> pd.DataFrame:
    """
    Parse the main players table from C2C players page using BeautifulSoup.
    view: 'shooting' | 'ball_control' for column mapping.
    """
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", class_=re.compile(r"table"))
    if not tables:
        return pd.DataFrame()

    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 5:
            continue
        header = rows[0]
        ths = header.find_all(["th", "td"])
        cols = [_text(t).strip().lower() or f"col_{i}" for i, t in enumerate(ths)]
        if "gp" not in cols:
            continue
        data_rows = []
        for tr in rows[1:]:
            tds = tr.find_all(["td", "th"])
            if len(tds) < len(cols):
                continue
            row = [_text(td) for td in tds[: len(cols)]]
            data_rows.append(row)
        if not data_rows:
            continue
        df = pd.DataFrame(data_rows, columns=cols)
        df["player_name"] = df.iloc[:, 1].astype(str).str.strip()
        df["team"] = df.iloc[:, 2].astype(str).str.strip() if df.shape[1] > 2 else ""
        df["gp"] = pd.to_numeric(df.get("gp"), errors="coerce")

        if view == "shooting":
            mpg_col = next((c for c in df.columns if "min" in c and "g" in c), None)
            if mpg_col:
                df["mpg"] = pd.to_numeric(df[mpg_col], errors="coerce")
            else:
                df["mpg"] = pd.NA
            df["ppg"] = pd.to_numeric(df.get("ppg"), errors="coerce")
            out = df[["player_name", "team", "gp", "mpg", "ppg"]].copy()
        elif view == "ball_control":
            df["mpg"] = pd.to_numeric(df.get("mpg"), errors="coerce")
            reb_col = next((c for c in df.columns if "reb" in c and "g" in c), None)
            ast_col = next((c for c in df.columns if "ast" in c and "g" in c), None)
            to_col = next((c for c in df.columns if "to" in c and "g" in c and "stl" not in c), None)
            stl_col = next((c for c in df.columns if "stl" in c and "g" in c), None)
            blk_col = next((c for c in df.columns if "blk" in c and "g" in c), None)
            df["rpg"] = pd.to_numeric(df[reb_col], errors="coerce") if reb_col else pd.NA
            df["apg"] = pd.to_numeric(df[ast_col], errors="coerce") if ast_col else pd.NA
            df["tov_pg"] = pd.to_numeric(df[to_col], errors="coerce") if to_col else pd.NA
            df["spg"] = pd.to_numeric(df[stl_col], errors="coerce") if stl_col else pd.NA
            df["bpg"] = pd.to_numeric(df[blk_col], errors="coerce") if blk_col else pd.NA
            out = df[["player_name", "team", "gp", "mpg", "rpg", "apg", "tov_pg", "spg", "bpg"]].copy()
        else:
            continue
        out = out[out["player_name"].str.match(r"^[A-Za-z]", na=False)]
        out = out[out["gp"].notna() & (out["gp"] > 0)]
        return out
    return pd.DataFrame()


def scrape_c2c_mbb_players(
    conference: Conference,
    *,
    year: str,
    season_label: str,
) -> pd.DataFrame:
    """
    Scrape C2C men's basketball players from the conference players page.

    Fetches two views (shooting game stats and ball control game stats), then merges
    on (player_name, team) to produce one row per player with gp, mpg, ppg, rpg, apg,
    tov_pg, spg, bpg.
    """
    base = conference.base_url.rstrip("/")
    shooting_url = _players_url(base, season_label, "sh", sort="ptspg")
    ball_control_url = _players_url(base, season_label, "bc", sort="trebpg")

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; D3Rankings/1.0)"})

    try:
        r_sh = session.get(shooting_url, timeout=30)
        r_sh.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"C2C shooting page failed: {e}") from e

    try:
        r_bc = session.get(ball_control_url, timeout=30)
        r_bc.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"C2C ball control page failed: {e}") from e

    shooting = _parse_players_table(r_sh.text, "shooting")
    ball_control = _parse_players_table(r_bc.text, "ball_control")

    if shooting.empty:
        return pd.DataFrame()

    # Merge on player_name and team (normalize for join)
    def norm(s: pd.Series) -> pd.Series:
        return s.astype(str).str.strip().str.replace(r"\s+", " ", regex=True)

    shooting["_pn"] = norm(shooting["player_name"])
    shooting["_tm"] = norm(shooting["team"])
    ball_control["_pn"] = norm(ball_control["player_name"])
    ball_control["_tm"] = norm(ball_control["team"])

    bc_cols = [c for c in ["rpg", "apg", "tov_pg", "spg", "bpg"] if c in ball_control.columns]
    merged = shooting.merge(
        ball_control[["_pn", "_tm"] + bc_cols],
        on=["_pn", "_tm"],
        how="left",
        suffixes=("", "_bc"),
    )
    for c in bc_cols:
        if c not in merged.columns and f"{c}_bc" in merged.columns:
            merged[c] = merged[f"{c}_bc"]
    merged = merged.drop(columns=["_pn", "_tm"], errors="ignore")
    for c in ["rpg", "apg", "tov_pg", "spg", "bpg"]:
        if c not in merged.columns:
            merged[c] = pd.NA

    # Drop rows that look like headers or empty
    merged = merged[merged["player_name"].str.match(r"^[A-Za-z]", na=False)]
    merged = merged[merged["gp"].notna() & (merged["gp"] > 0)]

    merged["season"] = f"{year}-{int(year) + 1}"
    merged["conference_code"] = conference.code
    merged["conference"] = conference.name

    out_cols = [
        "conference_code", "conference", "season", "team", "player_name",
        "gp", "mpg", "ppg", "rpg", "apg", "spg", "bpg", "tov_pg",
    ]
    return merged[[c for c in out_cols if c in merged.columns]].reset_index(drop=True)
