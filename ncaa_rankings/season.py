"""Production academic-year defaults for scrape, rank, and export.

Sidearm's `year` query param is the fall calendar year of the academic season
(2026 → 2026–27), matching run_baseball_2026_27.py.
"""
from __future__ import annotations

from pathlib import Path

# Fall year of the current academic season.
SIDEARM_YEAR = "2026"
SEASON_LABEL = "2026-27"
FILE_TAG = "2026_27"
RANKINGS_JSON = "rankings_2026-27.json"

# Clippd scoreboard season id (was 2026 for academic 2025-26).
CLIPPD_SEASON = "2027"

# Previous season, kept so empty 2026-27 scrapes do not wipe last year's files.
LEGACY_SEASON_LABEL = "2025-26"
LEGACY_FILE_TAG = "2025_26"
LEGACY_RANKINGS_JSON = "rankings_2025-26.json"


def file_tag_from_label(season_label: str) -> str:
    return season_label.strip().replace("-", "_")


def rankings_json_name(season_label: str) -> str:
    return f"rankings_{season_label.strip()}.json"


def season_candidates() -> tuple[tuple[str, str], ...]:
    """(file_tag, season_label) newest first."""
    return (
        (FILE_TAG, SEASON_LABEL),
        (LEGACY_FILE_TAG, LEGACY_SEASON_LABEL),
    )


def prefer_csv(data_dir: Path, prefix: str) -> tuple[Path | None, str, str]:
    """Return the newest non-empty `{prefix}_{tag}.csv` plus its tag and label."""
    for tag, label in season_candidates():
        path = data_dir / f"{prefix}_{tag}.csv"
        if path.exists() and path.stat().st_size > 0:
            return path, tag, label
    return None, FILE_TAG, SEASON_LABEL
