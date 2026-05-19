from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

import pandas as pd

from ncaa_rankings.ranking import rank_by_composite


@dataclass(frozen=True)
class CompositeEngine:
    weights: Mapping[str, float]

    def rank(self, players: pd.DataFrame) -> pd.DataFrame:
        return rank_by_composite(players, weights=dict(self.weights))
