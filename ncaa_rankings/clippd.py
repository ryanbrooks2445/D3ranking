from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

CLIPPD_SCOREBOARD_BASE = "https://scoreboard.clippd.com"
DEFAULT_DIVISION = "NCAA Division III"
DEFAULT_SEASON = "2027"
DEFAULT_PAGE_SIZE = 500
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)


def _get_json(url: str, *, timeout: float = 60.0, retries: int = 4) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "application/json",
            "Referer": f"{CLIPPD_SCOREBOARD_BASE}/rankings/leaderboard",
        },
    )
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
            if attempt + 1 < retries:
                time.sleep(0.5 * (2**attempt))
    raise RuntimeError(f"Clippd request failed for {url}") from last_err


def fetch_player_leaderboard(
    *,
    gender: str,
    division: str = DEFAULT_DIVISION,
    season: str = DEFAULT_SEASON,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> list[dict[str, Any]]:
    """
    Fetch all D3 player rows from Clippd Scoreboard rankings leaderboard.
    gender: "Men" or "Women"
    """
    gender = gender.strip()
    if gender not in {"Men", "Women"}:
        raise ValueError(f"gender must be Men or Women, got {gender!r}")

    all_rows: list[dict[str, Any]] = []
    offset = 0
    total_expected: int | None = None

    while True:
        params = urllib.parse.urlencode(
            {
                "division": division,
                "gender": gender,
                "rankingType": "Player",
                "season": season,
                "offset": offset,
                "limit": page_size,
            }
        )
        url = f"{CLIPPD_SCOREBOARD_BASE}/api/rankings/leaderboard?{params}"
        payload = _get_json(url)
        batch = payload.get("results") or []
        if not isinstance(batch, list):
            raise RuntimeError("Unexpected Clippd leaderboard payload: results is not a list")

        if total_expected is None:
            total_expected = int(payload.get("size") or 0)

        all_rows.extend(row for row in batch if isinstance(row, dict))
        if not batch or len(batch) < page_size:
            break
        if total_expected and len(all_rows) >= total_expected:
            break
        offset += page_size

    return all_rows
