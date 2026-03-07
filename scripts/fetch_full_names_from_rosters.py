#!/usr/bin/env python3
"""
Build data/player_full_name_lookup.csv by scraping full names from team roster pages.

Reads:
  - data/roster_urls.csv (conference_code, team, roster_url) — one row per team
  - data/*_mbb_players_2025_26.csv — finds players with single-initial first names

For each roster URL, fetches the page and parses player names from roster links (e.g. Sidearm
bios). Matches by (team, last_name, first_initial) and writes lookup rows.

Usage:
  python scripts/fetch_full_names_from_rosters.py

Then run your export so the frontend uses the updated lookup:
  python export_frontend_data.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ROSTER_URLS_CSV = DATA_DIR / "roster_urls.csv"
LOOKUP_CSV = DATA_DIR / "player_full_name_lookup.csv"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def _normalize_last_name(name: str) -> str:
    """Last name for matching: last token, lowercased (handles 'Jr.', 'III', hyphens)."""
    s = (name or "").strip()
    if not s:
        return ""
    parts = s.split()
    return parts[-1].lower().replace(".", "")


def _first_initial(name: str) -> str:
    """First character of first token, uppercased."""
    s = (name or "").strip()
    if not s:
        return ""
    return s[0].upper()


def _roster_key(team: str, last_name: str, first_initial: str) -> tuple[str, str, str]:
    return (team.strip(), _normalize_last_name(last_name), _first_initial(first_initial))


def extract_names_from_roster_html(html: str, base_url: str) -> list[str]:
    """Parse roster page and return list of full names (from bios links or table)."""
    soup = BeautifulSoup(html, "html.parser")
    names: list[str] = []
    seen: set[str] = set()

    # Sidearm: links to bios with player name as text
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        if "/bios/" in href or "/bio/" in href:
            text = (a.get_text() or "").strip()
            if re.match(r"^[A-Za-z][A-Za-z\s\-'.]+$", text) and len(text) > 3 and text not in seen:
                seen.add(text)
                names.append(text)

    # Fallback: table with "Name" column (e.g. some Presto/Sidearm tables)
    if not names:
        for table in soup.find_all("table"):
            headers = [th.get_text().strip().lower() for th in table.find_all("th")]
            try:
                name_col = headers.index("name")
            except ValueError:
                continue
            for row in table.find_all("tr")[1:]:
                cells = row.find_all(["td", "th"])
                if name_col < len(cells):
                    text = (cells[name_col].get_text() or "").strip()
                    if text and text not in seen and re.match(r"^[A-Za-z]", text):
                        seen.add(text)
                        names.append(text)
    return names


def full_name_to_key(full_name: str) -> tuple[str, str] | None:
    """(last_name_normalized, first_initial) for matching, or None if invalid."""
    s = (full_name or "").strip()
    if not s or len(s) < 3:
        return None
    parts = s.split()
    if not parts:
        return None
    first_initial = parts[0][0].upper()
    last_name = parts[-1].lower().replace(".", "")
    return (last_name, first_initial)


def fetch_roster_names(roster_url: str) -> list[str]:
    """Fetch roster page and return list of full names."""
    try:
        r = requests.get(roster_url, headers=REQUEST_HEADERS, timeout=15)
        r.raise_for_status()
        return extract_names_from_roster_html(r.text, roster_url)
    except Exception as e:
        print(f"  Warning: could not fetch {roster_url}: {e}", file=sys.stderr)
        return []


def load_short_name_players() -> pd.DataFrame:
    """Load all MBB players that have single-initial first name (need full name)."""
    pattern = "*_mbb_players_2025_26.csv"
    files = list(DATA_DIR.glob(pattern))
    files = [f for f in files if not f.name.startswith("d3_")]
    if not files:
        return pd.DataFrame()

    rows = []
    for path in files:
        df = pd.read_csv(path)
        if "first_name" not in df.columns or "last_name" not in df.columns:
            continue
        # Single letter first name, or multi-part like "J Saint" / "N Von"
        def needs_full_name(first: str) -> bool:
            if pd.isna(first):
                return False
            s = str(first).strip()
            if len(s) == 1:
                return True
            if len(s) == 2 and s[1] == ".":
                return True
            # "J Saint", "N Von" etc.
            if " " in s and len(s.split()[0]) <= 2:
                return True
            return False

        mask = df["first_name"].astype(str).apply(needs_full_name)
        sub = df.loc[mask, ["conference_code", "team", "player_name", "first_name", "last_name"]].drop_duplicates(
            ["conference_code", "team", "player_name"]
        )
        rows.append(sub)
    if not rows:
        return pd.DataFrame()
    return pd.concat(rows, ignore_index=True)


def build_roster_map(roster_urls_df: pd.DataFrame) -> dict[tuple[str, str, str], str]:
    """(team, last_name_lower, first_initial) -> full_name. Ambiguous keys get dropped."""
    key_to_name: dict[tuple[str, str, str], str] = {}
    for _, row in roster_urls_df.iterrows():
        team = str(row["team"]).strip()
        url = str(row["roster_url"]).strip()
        if not url or url.startswith("#"):
            continue
        names = fetch_roster_names(url)
        for full_name in names:
            key_parts = full_name_to_key(full_name)
            if not key_parts:
                continue
            last_norm, fi = key_parts
            key = (team, last_norm, fi)
            if key in key_to_name:
                if key_to_name[key] != full_name:
                    key_to_name[key] = ""  # ambiguous
            else:
                key_to_name[key] = full_name
    # Remove ambiguous
    return {k: v for k, v in key_to_name.items() if v}


def main() -> None:
    if not ROSTER_URLS_CSV.exists():
        print(f"Create {ROSTER_URLS_CSV} with columns: conference_code, team, roster_url", file=sys.stderr)
        sys.exit(1)

    roster_urls = pd.read_csv(ROSTER_URLS_CSV)
    for c in ["conference_code", "team", "roster_url"]:
        if c not in roster_urls.columns:
            print(f"Missing column '{c}' in {ROSTER_URLS_CSV}", file=sys.stderr)
            sys.exit(1)

    players = load_short_name_players()
    if players.empty:
        print("No short-name MBB players found in data/*_mbb_players_2025_26.csv", file=sys.stderr)
        sys.exit(0)

    print("Building roster map from roster URLs...")
    roster_map = build_roster_map(roster_urls)

    # Existing lookup (so we keep manual entries and only add/fill from scrape)
    existing: dict[tuple[str, str, str], str] = {}
    if LOOKUP_CSV.exists():
        try:
            lookup_df = pd.read_csv(LOOKUP_CSV)
            for _, r in lookup_df.iterrows():
                full = str(r.get("player_name_full", "")).strip()
                if not full:
                    continue
                short = str(r.get("player_name_short", "")).strip()
                team = str(r.get("team", "")).strip()
                conf = str(r.get("conference_code", "")).strip()
                # Reconstruct key from short: "J Jackson" -> J, Jackson
                parts = short.split(None, 1)
                if len(parts) == 2:
                    fi, last = parts[0][0].upper(), parts[1].lower()
                    key = (team, last, fi)
                    existing[key] = full
        except Exception as e:
            print(f"Warning: could not read existing lookup: {e}", file=sys.stderr)

    # Merge: roster_map overwrites only where we have a new full name; existing kept otherwise
    for k, v in existing.items():
        if k not in roster_map and v:
            roster_map[k] = v

    # Build lookup rows from players + roster_map
    lookup_rows = []
    for _, p in players.iterrows():
        team = str(p["team"]).strip()
        conf = str(p["conference_code"]).strip()
        short = str(p["player_name"]).strip()
        first = str(p["first_name"]).strip()
        last = str(p["last_name"]).strip()
        last_norm = _normalize_last_name(last)
        fi = _first_initial(first)
        key = (team, last_norm, fi)
        full = roster_map.get(key)
        if full:
            lookup_rows.append({"conference_code": conf, "team": team, "player_name_short": short, "player_name_full": full})

    # Deduplicate by (conference_code, team, player_name_short), keep last
    out_df = pd.DataFrame(lookup_rows)
    if out_df.empty:
        print("No full names resolved. Check roster_urls and that roster pages list player names.", file=sys.stderr)
        if LOOKUP_CSV.exists():
            print("Leaving existing lookup file unchanged.", file=sys.stderr)
        sys.exit(0)
    out_df = out_df.drop_duplicates(subset=["conference_code", "team", "player_name_short"], keep="last")
    out_df.to_csv(LOOKUP_CSV, index=False)
    print(f"Wrote {len(out_df)} rows to {LOOKUP_CSV}")
    print("Run: python export_frontend_data.py")


if __name__ == "__main__":
    main()
