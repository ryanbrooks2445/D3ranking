from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from time import sleep
from typing import Any
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup


CNE_ALL_STANDINGS_URL = "https://cnesports.org/allstandings.aspx?path=mbball"
CNE_MBB_STATS_2025_URL = "https://cnesports.org/stats.aspx?path=mbball&year=2025"
CNE_CONF_STATS_API_URL = "https://cnesports.org/services/conf_stats.ashx"
CNE_BASE_URL = "https://cnesports.org/"


@dataclass(frozen=True)
class StandingsRow:
    school: str
    school_url: str | None
    overall: str | None
    overall_pct: str | None
    conf: str | None
    conf_pct: str | None
    streak: str | None


def _fetch_html(url: str) -> str:
    session = requests.Session()
    # Avoid surprises from corporate/sandbox proxy env vars.
    session.trust_env = False
    resp = session.get(
        url,
        headers={
            # Sidearm sites sometimes return 404/empty unless headers look browser-like.
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.text


def _extract_season_from_heading(heading_text: str) -> str | None:
    # Examples observed: "2025-26 Men's Basketball Standings"
    m = re.search(r"(\d{4}(?:-\d{2})?)\s+.*Standings", heading_text)
    return m.group(1) if m else None


def _find_standings_table(soup: BeautifulSoup, sport_key: str) -> tuple[str | None, Any]:
    """
    sport_key: "Men's Basketball" or "Women's Basketball"
    Returns (season, table_tag)
    """
    heading = soup.find(lambda tag: tag.name in {"h2", "h3", "h4"} and tag.get_text(strip=True).endswith(f"{sport_key} Standings"))
    if heading is None:
        # More permissive fallback.
        heading = soup.find(string=re.compile(rf"{re.escape(sport_key)}\s+Standings", re.IGNORECASE))
        heading = heading.parent if heading is not None else None

    if heading is None:
        raise RuntimeError(f"Could not find section heading for {sport_key!r}. The page layout may have changed.")

    season = _extract_season_from_heading(heading.get_text(strip=True))
    table = heading.find_next("table")
    if table is None:
        raise RuntimeError(f"Found heading for {sport_key!r} but no table after it.")
    return season, table


def _parse_standings_table(table: Any) -> list[StandingsRow]:
    rows: list[StandingsRow] = []

    for tr in table.select("tbody tr") or table.select("tr"):
        cells = tr.find_all(["th", "td"])
        if not cells:
            continue

        # Skip header rows that sometimes appear inside the table.
        cell_texts = [c.get_text(" ", strip=True) for c in cells]
        joined = " ".join(cell_texts).lower()
        if "school" in joined and ("overall" in joined or "conf" in joined):
            continue

        school_cell = cells[0]
        a = school_cell.find("a")
        school = (a.get_text(" ", strip=True) if a else school_cell.get_text(" ", strip=True)).strip()
        if not school:
            continue

        school_url = None
        if a and a.get("href"):
            href = a["href"]
            school_url = href if href.startswith("http") else f"https://cnesports.org/{href.lstrip('/')}"

        def get_cell(i: int) -> str | None:
            if i >= len(cells):
                return None
            val = cells[i].get_text(" ", strip=True).strip()
            return val or None

        # Expected order on CNE page for basketball:
        # School | Overall | Pct. | Conf | CPct. | Streak
        rows.append(
            StandingsRow(
                school=school,
                school_url=school_url,
                overall=get_cell(1),
                overall_pct=get_cell(2),
                conf=get_cell(3),
                conf_pct=get_cell(4),
                streak=get_cell(5),
            )
        )

    if not rows:
        raise RuntimeError("Parsed 0 standings rows; table structure may have changed.")
    return rows


def scrape_cne_basketball_standings() -> tuple[pd.DataFrame, pd.DataFrame]:
    html = _fetch_html(CNE_ALL_STANDINGS_URL)
    soup = BeautifulSoup(html, "lxml")

    men_season, men_table = _find_standings_table(soup, "Men's Basketball")
    women_season, women_table = _find_standings_table(soup, "Women's Basketball")

    men_rows = _parse_standings_table(men_table)
    women_rows = _parse_standings_table(women_table)

    men_df = pd.DataFrame([r.__dict__ for r in men_rows])
    women_df = pd.DataFrame([r.__dict__ for r in women_rows])

    if men_season:
        men_df.insert(0, "season", men_season)
    if women_season:
        women_df.insert(0, "season", women_season)

    men_df.insert(0, "conference", "CNE")
    women_df.insert(0, "conference", "CNE")

    return men_df, women_df


def _discover_teamstats_urls(stats_url: str) -> list[str]:
    html = _fetch_html(stats_url)
    soup = BeautifulSoup(html, "lxml")

    urls: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "teamstats.aspx" not in href.lower():
            continue
        if "path=mbball" not in href.lower():
            continue
        urls.append(urljoin(CNE_BASE_URL, href))

    # Preserve order, remove dupes.
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _extract_team_code_from_teamstats_page(teamstats_url: str) -> str:
    """
    Extracts the numeric team code used by /services/conf_stats.ashx as team_id.
    """
    html = _fetch_html(teamstats_url)
    m = re.search(r"team_id:\s*'(?P<team_code>\d+)'", html)
    if not m:
        raise RuntimeError(f"Could not find team_id on {teamstats_url}")
    return m.group("team_code")


def _fetch_team_player_stats(*, team_code: str, year: str = "2025", conf_only: bool = False, postseason: bool = False) -> list[dict[str, Any]]:
    session = requests.Session()
    session.trust_env = False
    params = {
        "method": "get_team_stats",
        "team_id": team_code,
        "sport": "mbball",
        "year": year,
        "conf": "True" if conf_only else "False",
        "postseason": "True" if postseason else "False",
    }
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0 Safari/537.36"
        ),
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }

    data: Any = None
    last_text: str | None = None
    for attempt in range(4):
        resp = session.get(CNE_CONF_STATS_API_URL, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        last_text = resp.text.strip()
        # Sidearm sometimes returns literal "null" transiently.
        if last_text.lower() in {"", "null"}:
            sleep(0.5 * (2**attempt))
            continue
        try:
            data = resp.json()
        except ValueError:
            sleep(0.5 * (2**attempt))
            continue
        if data is None:
            sleep(0.5 * (2**attempt))
            continue
        break

    if data is None:
        raise RuntimeError(f"Team stats API returned null/empty for team_code={team_code}. Last body={last_text!r}")
    if not isinstance(data, dict):
        raise RuntimeError(f"Unexpected API response type for team_code={team_code}: {type(data)}")

    players = data.get("players", [])
    if not isinstance(players, list):
        raise RuntimeError("Unexpected API response: players is not a list")
    return players


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


def _to_int(x: Any) -> int | None:
    f = _to_float(x)
    if f is None:
        return None
    return int(round(f))


def _split_last_first(name: str) -> tuple[str, str]:
    # Sidearm format is often "Last,First" (sometimes includes suffixes).
    parts = [p.strip() for p in name.split(",", maxsplit=1)]
    if len(parts) == 2 and parts[0] and parts[1]:
        last, first = parts[0], parts[1]
        return first, last
    return name, ""


def scrape_cne_mbb_players_2025_26(*, conf_only: bool = False) -> pd.DataFrame:
    """
    Returns one row per player for CNE men's basketball 2025-26.
    Data source: Sidearm /services/conf_stats.ashx (team stats endpoint), merged across teams.
    """
    teamstats_urls = _discover_teamstats_urls(CNE_MBB_STATS_2025_URL)
    team_codes = [_extract_team_code_from_teamstats_page(u) for u in teamstats_urls]

    all_rows: list[dict[str, Any]] = []
    failures: list[str] = []
    for team_code in team_codes:
        try:
            players = _fetch_team_player_stats(team_code=team_code, conf_only=conf_only)
        except Exception as e:
            failures.append(f"{team_code}: {e}")
            continue
        for p in players:
            if not isinstance(p, dict):
                continue
            name = str(p.get("name") or "").strip()
            if not name or name.upper() == "TEAM":
                continue
            stats = p.get("stats_stats") or {}
            if not isinstance(stats, dict):
                stats = {}

            gp = _to_int(stats.get("games_played"))
            mp = _to_float(stats.get("minutes_played"))
            tov = _to_float(stats.get("turnovers"))

            first, last = _split_last_first(name)

            all_rows.append(
                {
                    "conference": "CNE",
                    "season": "2025-26",
                    "team": p.get("team_name"),
                    "player_name": name,
                    "first_name": first,
                    "last_name": last or None,
                    "class_year": p.get("year"),
                    "position": p.get("position"),
                    "gp": gp,
                    "mp_total": mp,
                    "mpg": (mp / gp) if (mp is not None and gp) else None,
                    "pts_total": _to_float(stats.get("points_scored")),
                    "ppg": _to_float(stats.get("points_per_game")),
                    "reb_total": _to_float(stats.get("total_rebounds")),
                    "rpg": _to_float(stats.get("rebounds_per_game")),
                    "ast_total": _to_float(stats.get("assists")),
                    "apg": _to_float(stats.get("assists_per_game")),
                    "stl_total": _to_float(stats.get("steals")),
                    "spg": _to_float(stats.get("steals_per_game")),
                    "blk_total": _to_float(stats.get("blocked_shots")),
                    "bpg": _to_float(stats.get("blocked_shots_per_game")),
                    "tov_total": tov,
                    "tov_pg": (tov / gp) if (tov is not None and gp) else None,
                    "fgm": _to_float(stats.get("field_goals_made")),
                    "fga": _to_float(stats.get("field_goals_attempted")),
                    "fg_pct": _to_float(stats.get("field_goals_pct")),
                    "tpm": _to_float(stats.get("three_points_made")),
                    "tpa": _to_float(stats.get("three_points_attempted")),
                    "tp_pct": _to_float(stats.get("three_points_pct")),
                    "ftm": _to_float(stats.get("free_throws_made")),
                    "fta": _to_float(stats.get("free_throws_attempted")),
                    "ft_pct": _to_float(stats.get("free_throws_pct")),
                }
            )

    df = pd.DataFrame(all_rows)
    if df.empty:
        raise RuntimeError("No player rows scraped. The API may have changed.")

    if failures:
        # Non-fatal: allow partial results rather than crashing the app.
        print(f"Warning: failed to fetch players for {len(failures)} team(s):")
        for msg in failures:
            print(" -", msg)

    # De-dupe defensively (same player could appear twice in rare cases).
    df = df.drop_duplicates(subset=["season", "team", "player_name"], keep="first")
    return df


def _zscore(series: pd.Series) -> pd.Series:
    s = pd.to_numeric(series, errors="coerce")
    mean = s.mean(skipna=True)
    std = s.std(skipna=True, ddof=0)
    if std == 0 or pd.isna(std):
        return s * 0
    return (s - mean) / std


def rank_cne_mbb_players_2025_26(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds composite z-score based ranking columns.
    Filters to meaningful contributors before ranking.
    """
    out = df.copy()
    out["gp"] = pd.to_numeric(out["gp"], errors="coerce")
    out["mpg"] = pd.to_numeric(out["mpg"], errors="coerce")

    eligible = out[(out["gp"] >= 10) & (out["mpg"] >= 10)].copy()
    if eligible.empty:
        raise RuntimeError("No eligible players after filters (gp>=10 and mpg>=10).")

    eligible["z_ppg"] = _zscore(eligible["ppg"])
    eligible["z_rpg"] = _zscore(eligible["rpg"])
    eligible["z_apg"] = _zscore(eligible["apg"])
    eligible["z_spg"] = _zscore(eligible["spg"])
    eligible["z_bpg"] = _zscore(eligible["bpg"])
    eligible["z_tov_pg"] = _zscore(eligible["tov_pg"])

    eligible["composite_score"] = (
        eligible["z_ppg"]
        + 0.7 * eligible["z_rpg"]
        + 0.7 * eligible["z_apg"]
        + 0.7 * eligible["z_spg"]
        + 0.7 * eligible["z_bpg"]
        - 0.8 * eligible["z_tov_pg"]
    )

    eligible = eligible.sort_values(["composite_score", "ppg"], ascending=[False, False])
    eligible["rank"] = range(1, len(eligible) + 1)

    cols = [
        "rank",
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
        "z_ppg",
        "z_rpg",
        "z_apg",
        "z_spg",
        "z_bpg",
        "z_tov_pg",
    ]
    cols = [c for c in cols if c in eligible.columns]
    return eligible[cols]


def main() -> None:
    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)

    men_df, women_df = scrape_cne_basketball_standings()

    men_path = out_dir / "cne_mens_basketball_standings.csv"
    women_path = out_dir / "cne_womens_basketball_standings.csv"
    men_df.to_csv(men_path, index=False)
    women_df.to_csv(women_path, index=False)

    print(f"Wrote {len(men_df)} rows to {men_path}")
    print(f"Wrote {len(women_df)} rows to {women_path}")

    players_df = scrape_cne_mbb_players_2025_26(conf_only=False)
    rankings_df = rank_cne_mbb_players_2025_26(players_df)

    players_path = out_dir / "cne_mbb_players_2025_26.csv"
    rankings_path = out_dir / "cne_mbb_player_rankings_2025_26.csv"
    players_df.to_csv(players_path, index=False)
    rankings_df.to_csv(rankings_path, index=False)

    print(f"Wrote {len(players_df)} rows to {players_path}")
    print(f"Wrote {len(rankings_df)} ranked rows to {rankings_path}")


if __name__ == "__main__":
    main()

