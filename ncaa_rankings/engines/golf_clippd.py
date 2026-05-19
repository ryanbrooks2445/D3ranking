from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from ncaa_rankings.golf import rank_golf_players


@dataclass(frozen=True)
class ClippdGolfEngine:
    min_stroke_play_rounds: int = 6

    def rank(self, players: pd.DataFrame) -> pd.DataFrame:
        return rank_golf_players(
            players,
            min_stroke_play_rounds=self.min_stroke_play_rounds,
        )
