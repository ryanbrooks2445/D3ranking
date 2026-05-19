"""Sport ranking engine registry (thin adapters over existing rankers)."""

from .registry import ENGINES, get_engine

__all__ = ["ENGINES", "get_engine"]
