from __future__ import annotations

import re
from dataclasses import dataclass
from time import sleep
from typing import Any
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

from .conferences import Conference


_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0 Safari/537.36"
)


@dataclass(frozen=True)
class _TeamEndpoint:
    team_code: str
    team_name: str | None


def _session() -> requests.Session:
    s = requests.Session()
    s.trust_env = False
    s.headers.update(
        {
            "User-Agent": _UA,
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    return s


def _fetch_html(url: str) -> str:
    r = _session().get(url, timeout=30)
    r.raise_for_status()
    return r.text


def _discover_team_endpoints(base_url: str, sport_path: str, year: str) -> list[_TeamEndpoint]:
    stats_url = f"{base_url.rstrip('/')}/stats.aspx?path={sport_path}&year={year}"
    html = _fetch_html(stats_url)
    soup = BeautifulSoup(html, "html.parser")
    rows: list[_TeamEndpoint] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        href = str(a["href"])
        href_l = href.lower()
        if "teamstats.aspx" not in href_l:
            continue
        if f"path={sport_path.lower()}" not in href_l:
            continue
        full_url = urljoin(base_url.rstrip("/") + "/", href)
        team_html = _fetch_html(full_url)
        m = re.search(r"team_id:\s*'(?P<team_code>\d+)'", team_html)
        if not m:
            continue
        code = m.group("team_code")
        if code in seen:
            continue
        seen.add(code)
        label = a.get_text(" ", strip=True).strip() or None
        rows.append(_TeamEndpoint(team_code=code, team_name=label))

    return rows


def _safe_scalar(v: Any) -> Any:
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    return None


def _flatten_dict(prefix: str, obj: Any, out: dict[str, Any]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f"{prefix}_{k}" if prefix else str(k)
            _flatten_dict(key, v, out)
        return
    if isinstance(obj, list):
        return
    out[prefix] = _safe_scalar(obj)


def _split_name(name: str) -> tuple[str | None, str | None]:
    s = name.strip()
    if not s:
        return None, None
    if "," in s:
        left, right = [x.strip() for x in s.split(",", 1)]
        return right or None, left or None
    parts = s.split()
    if len(parts) == 1:
        return None, parts[0]
    return " ".join(parts[:-1]), parts[-1]


def _fetch_team_players(
    *,
    conf_stats_api_url: str,
    team_code: str,
    sport_path: str,
    year: str,
    conf_only: bool,
) -> list[dict[str, Any]]:
    params = {
        "method": "get_team_stats",
        "team_id": team_code,
        "sport": sport_path,
        "year": year,
        "conf": "True" if conf_only else "False",
        "postseason": "False",
    }
    data: Any = None
    for attempt in range(4):
        resp = _session().get(conf_stats_api_url, params=params, timeout=30)
        resp.raise_for_status()
        body = resp.text.strip()
        if body.lower() in {"", "null"}:
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
    if not isinstance(data, dict):
        return []
    players = data.get("players", [])
    if isinstance(players, list):
        return [p for p in players if isinstance(p, dict)]
    return []


def scrape_conference_players_sidearm(
    *,
    conference: Conference,
    sport_path: str,
    year: str,
    season_label: str,
    conf_only: bool,
) -> pd.DataFrame:
    if conference.platform != "sidearm":
        return pd.DataFrame()

    team_endpoints = _discover_team_endpoints(conference.base_url, sport_path, year)
    if not team_endpoints:
        return pd.DataFrame()

    conf_stats_api_url = f"{conference.base_url.rstrip('/')}/services/conf_stats.ashx"
    rows: list[dict[str, Any]] = []

    for te in team_endpoints:
        players = _fetch_team_players(
            conf_stats_api_url=conf_stats_api_url,
            team_code=te.team_code,
            sport_path=sport_path,
            year=year,
            conf_only=conf_only,
        )
        for p in players:
            name = str(p.get("name") or "").strip()
            if not name or name.upper() == "TEAM":
                continue
            first, last = _split_name(name)
            team = (
                str(p.get("team_name") or p.get("school_name") or te.team_name or "").strip()
                or None
            )
            position = str(p.get("position") or p.get("pos") or "").strip() or None

            row: dict[str, Any] = {
                "season": season_label,
                "sport": sport_path,
                "conference": conference.name,
                "conference_code": conference.code,
                "team": team,
                "player_name": name,
                "first_name": first,
                "last_name": last,
                "position": position,
            }

            for k, v in p.items():
                if isinstance(v, dict):
                    _flatten_dict(str(k), v, row)
                elif isinstance(v, (str, int, float, bool)) or v is None:
                    row[str(k)] = v

            rows.append(row)

    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows)
