from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from ncaa_rankings.basketball import CompositeWeights, rank_mbb_players


@dataclass(frozen=True)
class MbbEngine:
    min_gp: int = 10
    min_mpg: float = 10.0
    weights: CompositeWeights | None = None

    def rank(self, players: pd.DataFrame) -> pd.DataFrame:
        return rank_mbb_players(
            players,
            min_gp=self.min_gp,
            min_mpg=self.min_mpg,
            weights=self.weights,
        )
