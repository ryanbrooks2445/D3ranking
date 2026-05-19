#!/usr/bin/env python3
"""Sync rankings JSON into PostgreSQL via the frontend Prisma script."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def main() -> None:
    script = FRONTEND / "scripts" / "sync-rankings-to-db.ts"
    if not script.exists():
        raise SystemExit(f"Missing {script}")

    cmd = ["npx", "tsx", str(script)]
    print("Running:", " ".join(cmd), flush=True)
    result = subprocess.run(cmd, cwd=str(FRONTEND), check=False)
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
