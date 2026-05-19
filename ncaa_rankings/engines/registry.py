from __future__ import annotations

from ncaa_rankings.composites import SIDEARM_COMPOSITES
from ncaa_rankings.engines.base import SportRankingEngine
from ncaa_rankings.engines.baseball_engine import BaseballEngine
from ncaa_rankings.engines.composite import CompositeEngine
from ncaa_rankings.engines.golf_clippd import ClippdGolfEngine
from ncaa_rankings.engines.mbb import MbbEngine

ENGINES: dict[str, SportRankingEngine] = {
    "mbb": MbbEngine(min_gp=10, min_mpg=10),
    "baseball": BaseballEngine(),
    "mgolf": ClippdGolfEngine(min_stroke_play_rounds=6),
    "wgolf": ClippdGolfEngine(min_stroke_play_rounds=6),
    "default": CompositeEngine(SIDEARM_COMPOSITES),
}


def get_engine(sport_code: str) -> SportRankingEngine:
    return ENGINES.get(sport_code, ENGINES["default"])
