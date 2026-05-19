from __future__ import annotations

from typing import Protocol

import pandas as pd


class SportRankingEngine(Protocol):
    """Normalize ingest output and produce ranked players with OVR."""

    def rank(self, players: pd.DataFrame) -> pd.DataFrame:
        ...
