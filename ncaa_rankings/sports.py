from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Sport:
    code: str
    label: str
    sidearm_path: str | None


SPORTS: list[Sport] = [
    Sport(code="wbb", label="Women's Basketball", sidearm_path="wbball"),
    Sport(code="mvb", label="Men's Volleyball", sidearm_path="mvball"),
    Sport(code="wvb", label="Women's Volleyball", sidearm_path="wvball"),
    Sport(code="baseball", label="Baseball", sidearm_path="baseball"),
    Sport(code="softball", label="Softball", sidearm_path="softball"),
    Sport(code="mhky", label="Men's Hockey", sidearm_path="mhockey"),
    Sport(code="whky", label="Women's Hockey", sidearm_path="whockey"),
    Sport(code="mlax", label="Men's Lacrosse", sidearm_path="mlax"),
    Sport(code="wlax", label="Women's Lacrosse", sidearm_path="wlax"),
    Sport(code="msoc", label="Men's Soccer", sidearm_path="msoc"),
    Sport(code="wsoc", label="Women's Soccer", sidearm_path="wsoc"),
    Sport(code="football", label="Football", sidearm_path="football"),
    Sport(code="mgolf", label="Men's Golf", sidearm_path="mgolf"),
    Sport(code="wgolf", label="Women's Golf", sidearm_path="wgolf"),
    Sport(code="mten", label="Men's Tennis", sidearm_path="mten"),
    Sport(code="wten", label="Women's Tennis", sidearm_path="wten"),
]
