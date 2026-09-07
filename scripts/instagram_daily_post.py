#!/usr/bin/env python3
"""Generate a daily D3Rank JPEG and optionally publish it to Instagram @d3rank.

Publishing uses Instagram Graph API content publishing:
  POST /{ig-user-id}/media  → poll status_code → POST /{ig-user-id}/media_publish

Images must be a public HTTPS JPEG. After the workflow pushes
artifacts/instagram/daily-rankings.jpg, the default URL is GitHub raw for that
commit. Override with IG_IMAGE_PUBLIC_URL if Instagram cannot fetch GitHub.

Secrets (never committed):
  IG_USER_ID, IG_ACCESS_TOKEN
  optional IG_IMAGE_PUBLIC_URL, IG_GRAPH_API_BASE, IG_GRAPH_API_VERSION
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "artifacts" / "instagram"
IMAGE_NAME = "daily-rankings.jpg"
CAPTION_NAME = "caption.txt"

SITE_URL = "https://d3rank.com"
DEFAULT_GRAPH_BASE = "https://graph.facebook.com"
DEFAULT_GRAPH_VERSION = "v21.0"

FONT_CANDIDATES_BOLD = (
    "/usr/share/fonts/truetype/macos/Inter-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
)
FONT_CANDIDATES_REG = (
    "/usr/share/fonts/truetype/macos/Inter-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
)

BG = (10, 18, 36)
CARD = (22, 34, 58)
GOLD = (244, 193, 76)
WHITE = (245, 247, 251)
MUTED = (154, 166, 178)
LINE = (40, 56, 86)


def _font(candidates: tuple[str, ...], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in candidates:
        if Path(path).is_file():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def _today_et() -> datetime:
    try:
        return datetime.now(ZoneInfo("America/New_York"))
    except Exception:
        return datetime.now(timezone.utc)


def _mbb_rankings_path() -> Path | None:
    sport_dir = ROOT / "frontend" / "public" / "data" / "sports" / "mbb"
    season = "2026-27"
    meta = sport_dir / "meta.json"
    if meta.exists():
        try:
            season = str(json.loads(meta.read_text(encoding="utf-8")).get("season") or season)
        except (json.JSONDecodeError, OSError):
            pass
    primary = sport_dir / f"rankings_{season}.json"
    if primary.exists():
        return primary
    for fallback_name in ("rankings_2026-27.json", "rankings_2025-26.json"):
        fallback = sport_dir / fallback_name
        if fallback.exists():
            return fallback
    return None


def _load_json_rows(path: Path) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    return data if isinstance(data, list) else []


def _sport_metas() -> list[dict[str, str]]:
    root = ROOT / "frontend" / "public" / "data" / "sports"
    if not root.is_dir():
        return []
    rows: list[dict[str, str]] = []
    for child in sorted(root.iterdir()):
        meta = child / "meta.json"
        if not meta.exists():
            continue
        try:
            payload = json.loads(meta.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(payload, dict):
            continue
        rows.append(
            {
                "code": str(payload.get("sport_code") or child.name),
                "label": str(payload.get("sport_label") or child.name),
                "season": str(payload.get("season") or ""),
            }
        )
    return rows


def _display_name(row: dict[str, Any]) -> str:
    first = str(row.get("first_name") or "").strip()
    last = str(row.get("last_name") or "").strip()
    if first and last and first.lower() not in {"none", "nan"}:
        return f"{first} {last}"
    raw = str(row.get("player_name") or "").strip()
    if "," in raw:
        left, right = [p.strip() for p in raw.split(",", 1)]
        if left and right:
            return f"{right} {left}"
    return raw or "Unknown"


def _fmt_ppg(row: dict[str, Any]) -> str:
    raw = row.get("points_per_game", row.get("ppg"))
    try:
        return f"{float(raw):.1f}"
    except (TypeError, ValueError):
        return "—"


def top_mbb(n: int = 5) -> tuple[str, list[dict[str, Any]]]:
    path = _mbb_rankings_path()
    if path is None:
        return "2026-27", []
    rows = _load_json_rows(path)
    rows = sorted(rows, key=lambda r: int(r.get("global_rank") or 10**9))
    season = str(rows[0].get("season") or "2026-27") if rows else "2026-27"
    return season, rows[:n]


def build_caption(*, when: datetime | None = None) -> str:
    when = when or _today_et()
    season, leaders = top_mbb(5)
    date_label = when.strftime("%B %-d, %Y") if os.name != "nt" else when.strftime("%B %d, %Y")
    lines = [
        f"Daily D3 rankings — {date_label}",
        "",
        f"Men's Basketball top 5 ({season}):",
    ]
    if leaders:
        for row in leaders:
            rank = row.get("global_rank") or ""
            team = str(row.get("team") or "").strip()
            lines.append(f"{rank}. {_display_name(row)} ({team}) — {_fmt_ppg(row)} PPG")
    else:
        lines.append("See the full board on the site.")

    others = [m["label"] for m in _sport_metas() if m["code"] != "mbb"]
    if others:
        lines.extend(["", "Also on d3rank.com: " + ", ".join(others) + "."])

    lines.extend(
        [
            "",
            f"Full rankings: {SITE_URL}",
            "",
            "#D3 #D3Rankings #NCAAD3 #D3Basketball #D3Baseball #CollegeBasketball #SmallCollege #D3Rank",
        ]
    )
    return "\n".join(lines)


def _fit(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text
    ell = "…"
    trimmed = text
    while trimmed and draw.textlength(trimmed + ell, font=font) > max_width:
        trimmed = trimmed[:-1]
    return (trimmed + ell) if trimmed else ell


def render_graphic(*, when: datetime | None = None) -> Image.Image:
    when = when or _today_et()
    season, leaders = top_mbb(5)
    date_label = when.strftime("%b %-d, %Y").upper() if os.name != "nt" else when.strftime("%b %d, %Y").upper()

    width, height = 1080, 1350
    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)
    title_font = _font(FONT_CANDIDATES_BOLD, 72)
    sub_font = _font(FONT_CANDIDATES_BOLD, 36)
    name_font = _font(FONT_CANDIDATES_BOLD, 40)
    meta_font = _font(FONT_CANDIDATES_REG, 28)
    small_font = _font(FONT_CANDIDATES_REG, 24)
    brand_font = _font(FONT_CANDIDATES_BOLD, 42)

    draw.rectangle((0, 0, width, 12), fill=GOLD)
    draw.text((64, 48), "D3RANK", font=brand_font, fill=GOLD)
    draw.text((64, 108), "DAILY RANKINGS", font=sub_font, fill=WHITE)
    date_w = draw.textlength(date_label, font=small_font)
    draw.text((width - 64 - date_w, 58), date_label, font=small_font, fill=MUTED)

    draw.text((64, 180), "MEN'S BASKETBALL", font=title_font, fill=WHITE)
    draw.text((64, 268), f"Global top 5  ·  {season}", font=meta_font, fill=MUTED)

    card_top = 330
    row_h = 132
    for i, row in enumerate(leaders):
        y = card_top + i * (row_h + 16)
        draw.rounded_rectangle((48, y, width - 48, y + row_h), radius=18, fill=CARD)
        rank = str(row.get("global_rank") or i + 1)
        draw.text((76, y + 40), rank, font=title_font, fill=GOLD)
        name = _fit(draw, _display_name(row), name_font, 620)
        team = _fit(draw, str(row.get("team") or ""), meta_font, 620)
        draw.text((180, y + 28), name, font=name_font, fill=WHITE)
        draw.text((180, y + 78), team, font=meta_font, fill=MUTED)
        ppg = f"{_fmt_ppg(row)} PPG"
        ppg_w = draw.textlength(ppg, font=sub_font)
        draw.text((width - 80 - ppg_w, y + 46), ppg, font=sub_font, fill=WHITE)

    if not leaders:
        draw.text((64, 400), "Rankings refresh is live on d3rank.com", font=name_font, fill=WHITE)

    others = [m["label"] for m in _sport_metas() if m["code"] != "mbb"]
    footer_y = 1220
    draw.line((64, footer_y - 24, width - 64, footer_y - 24), fill=LINE, width=2)
    if others:
        extra = _fit(draw, "Also updated: " + " · ".join(others[:8]), small_font, width - 128)
        draw.text((64, footer_y), extra, font=small_font, fill=MUTED)
    draw.text((64, 1288), SITE_URL.replace("https://", ""), font=sub_font, fill=GOLD)
    return img


def write_assets(*, when: datetime | None = None) -> tuple[Path, Path]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    image_path = OUT_DIR / IMAGE_NAME
    caption_path = OUT_DIR / CAPTION_NAME
    graphic = render_graphic(when=when)
    graphic.save(image_path, format="JPEG", quality=90, optimize=True)
    caption_path.write_text(build_caption(when=when), encoding="utf-8")
    return image_path, caption_path


def jpeg_bytes_ok(path: Path) -> bool:
    data = path.read_bytes()
    return len(data) > 1000 and data[:2] == b"\xff\xd8" and data[-2:] == b"\xff\xd9"


def _graph_root() -> str:
    base = os.environ.get("IG_GRAPH_API_BASE", DEFAULT_GRAPH_BASE).rstrip("/")
    version = os.environ.get("IG_GRAPH_API_VERSION", DEFAULT_GRAPH_VERSION).strip() or DEFAULT_GRAPH_VERSION
    return f"{base}/{version}"


def wait_for_public_jpeg(url: str, *, timeout_sec: float = 90.0) -> None:
    deadline = time.monotonic() + timeout_sec
    last = "no request"
    while time.monotonic() < deadline:
        try:
            resp = requests.get(
                url,
                timeout=20,
                headers={"User-Agent": "D3RankInstagramBot/1.0"},
            )
            ctype = resp.headers.get("Content-Type", "")
            last = f"{resp.status_code} {ctype}"
            if resp.status_code == 200 and resp.content[:2] == b"\xff\xd8":
                print(f"Public JPEG reachable ({last}, {len(resp.content)} bytes)", flush=True)
                return
        except requests.RequestException as e:
            last = str(e)
        time.sleep(5)
    raise RuntimeError(f"Public JPEG not reachable at {url} ({last})")


def _graph_error(payload: Any) -> str:
    if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
        err = payload["error"]
        return f"{err.get('message')} (code={err.get('code')} type={err.get('type')})"
    return str(payload)


def publish_image(*, image_url: str, caption: str) -> str:
    user_id = os.environ.get("IG_USER_ID", "").strip()
    token = os.environ.get("IG_ACCESS_TOKEN", "").strip()
    if not user_id or not token:
        raise RuntimeError("IG_USER_ID and IG_ACCESS_TOKEN are required to publish")

    root = _graph_root()
    create = requests.post(
        f"{root}/{user_id}/media",
        data={"image_url": image_url, "caption": caption, "access_token": token},
        timeout=60,
    )
    create_json = create.json() if create.content else {}
    if create.status_code >= 400 or "id" not in create_json:
        raise RuntimeError(f"Create media container failed: {_graph_error(create_json)}")
    container_id = str(create_json["id"])
    print(f"Created media container {container_id}", flush=True)

    status = "IN_PROGRESS"
    for _ in range(20):
        poll = requests.get(
            f"{root}/{container_id}",
            params={"fields": "status_code,status", "access_token": token},
            timeout=30,
        )
        poll_json = poll.json() if poll.content else {}
        status = str(poll_json.get("status_code") or "")
        print(f"Container status: {status}", flush=True)
        if status == "FINISHED":
            break
        if status in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Container {status}: {_graph_error(poll_json)}")
        time.sleep(3)
    if status != "FINISHED":
        raise RuntimeError(f"Container did not finish processing (last status={status})")

    publish = requests.post(
        f"{root}/{user_id}/media_publish",
        data={"creation_id": container_id, "access_token": token},
        timeout=60,
    )
    publish_json = publish.json() if publish.content else {}
    if publish.status_code >= 400 or "id" not in publish_json:
        raise RuntimeError(f"media_publish failed: {_graph_error(publish_json)}")
    media_id = str(publish_json["id"])
    print(f"Published Instagram media {media_id}", flush=True)
    return media_id


def default_raw_image_url() -> str | None:
    override = os.environ.get("IG_IMAGE_PUBLIC_URL", "").strip()
    if override:
        return override
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    sha = os.environ.get("IG_IMAGE_REF", "").strip() or os.environ.get("GITHUB_SHA", "").strip()
    if not repo or not sha:
        return None
    return f"https://raw.githubusercontent.com/{repo}/{sha}/artifacts/instagram/{IMAGE_NAME}"


def run_check() -> int:
    caption = build_caption()
    if "d3rank.com" not in caption or "#D3" not in caption:
        print("Caption missing required site link or hashtags", file=sys.stderr)
        return 1
    graphic = render_graphic()
    buf = BytesIO()
    graphic.save(buf, format="JPEG", quality=90)
    data = buf.getvalue()
    if data[:2] != b"\xff\xd8":
        print("Rendered graphic is not JPEG", file=sys.stderr)
        return 1
    print(f"OK  Instagram caption ({len(caption)} chars)")
    print(f"OK  Instagram JPEG render ({len(data)} bytes, {graphic.size[0]}x{graphic.size[1]})")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate and/or publish the daily @d3rank Instagram graphic.")
    parser.add_argument("--generate", action="store_true", help="Write JPEG + caption under artifacts/instagram/")
    parser.add_argument("--publish", action="store_true", help="Publish via Instagram Graph API (requires secrets).")
    parser.add_argument("--check", action="store_true", help="Render in memory and validate caption. No network.")
    parser.add_argument(
        "--skip-if-no-secrets",
        action="store_true",
        help="Exit 0 instead of failing when IG secrets are missing.",
    )
    args = parser.parse_args()

    if args.check:
        raise SystemExit(run_check())

    if not args.generate and not args.publish:
        args.generate = True

    if args.generate:
        image_path, caption_path = write_assets()
        if not jpeg_bytes_ok(image_path):
            raise SystemExit(f"Generated file is not a valid JPEG: {image_path}")
        print(f"Wrote {image_path} ({image_path.stat().st_size} bytes)", flush=True)
        print(f"Wrote {caption_path}", flush=True)

    if not args.publish:
        return

    user_id = os.environ.get("IG_USER_ID", "").strip()
    token = os.environ.get("IG_ACCESS_TOKEN", "").strip()
    if not user_id or not token:
        msg = "IG_USER_ID / IG_ACCESS_TOKEN not set; skipping Instagram post."
        print(msg, flush=True)
        if args.skip_if_no_secrets:
            return
        raise SystemExit(1)

    image_url = default_raw_image_url()
    if not image_url:
        print(
            "No public image URL. Set IG_IMAGE_PUBLIC_URL or push artifacts/instagram/"
            "daily-rankings.jpg and pass GITHUB_REPOSITORY + IG_IMAGE_REF.",
            flush=True,
        )
        return

    caption_path = OUT_DIR / CAPTION_NAME
    caption = caption_path.read_text(encoding="utf-8") if caption_path.exists() else build_caption()
    print(f"Publishing image_url={image_url}", flush=True)
    try:
        wait_for_public_jpeg(image_url)
        media_id = publish_image(image_url=image_url, caption=caption)
        print(f"Instagram post OK ({media_id})", flush=True)
    except Exception as e:
        print(f"Instagram post failed (non-fatal): {e}", flush=True)


if __name__ == "__main__":
    main()
