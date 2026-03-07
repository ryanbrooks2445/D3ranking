from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

_conferences_path = Path(__file__).resolve().parent / "conferences.json"


@dataclass
class Conference:
    code: str
    name: str
    base_url: str
    platform: str = "sidearm"


def load_conferences() -> list[Conference]:
    raw = json.loads(_conferences_path.read_text(encoding="utf-8"))
    return [
        Conference(
            code=str(c["code"]),
            name=str(c["name"]),
            base_url=str(c["base_url"]).rstrip("/"),
            platform=str(c.get("platform", "sidearm")),
        )
        for c in raw
    ]
