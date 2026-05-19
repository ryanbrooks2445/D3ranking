from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from ncaa_rankings.baseball import rank_baseball_players


@dataclass(frozen=True)
class BaseballEngine:
    def rank(self, players: pd.DataFrame) -> pd.DataFrame:
        return rank_baseball_players(players)
