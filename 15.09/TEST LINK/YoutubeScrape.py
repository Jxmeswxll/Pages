# file: fps_extractor_quickstart.py

import re
import os
import json
import time
import random
import asyncio
import tempfile
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import requests
from PIL import Image, ImageOps, ImageFilter
import cv2
import numpy as np
import pytesseract
from playwright.async_api import async_playwright

# ---------------- Config (hardcoded for quick test) ----------------

YOUTUBE_API_KEY = "AIzaSyBROz-IcvM39HPvwsM6USfjKN9BHrgX2o4"  # <-- replace with your key

GPUS = ["RTX 5090", "RTX 5080", "RTX 5060 Ti"]
GAMES = ["League of Legends", "Counter-Strike 2", "Apex Legends"]
RESOLUTIONS = ["1080p", "1440p", "4K"]

TESSERACT_CONFIG = "--oem 1 --psm 6 -c tessedit_char_whitelist=0123456789.kFPS "
OVERLAY_CROP = (0.75, 0.02, 0.98, 0.18)  # top-right overlay typical

# Example target to prove end-to-end flow; replace with a real video/timestamp
# Key format: "GPU|Game|Resolution"
TARGETS: Dict[str, Dict] = {
    # "RTX 5090|Apex Legends|4K": {
    #     "url": "https://www.youtube.com/watch?v=REPLACE_ME",
    #     "ts": 735,  # seconds
    #     "channel": "Some Channel",
    #     "video_id": "REPLACE_ME",
    # }
}


# ---------------- Data structures ----------------

@dataclass
class ExtractedResult:
    gpu: str
    game: str
    resolution: str
    avg_fps: Optional[float]
    low_1p: Optional[float]
    source_url: str
    channel: Optional[str]
    video_id: Optional[str]
    timestamp_s: Optional[int]
    notes: Optional[str] = None


# ---------------- YouTube discovery ----------------

def yt_search(
    query: str,
    published_after_iso: str = "2024-10-01T00:00:00Z",
    max_results: int = 5,
) -> List[Dict]:
    if not YOUTUBE_API_KEY:
        print("WARN: No API key set.")
        return []
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "publishedAfter": published_after_iso,
        "order": "date",
        "key": YOUTUBE_API_KEY,
    }
    resp = requests.get(
        "https://www.googleapis.com/youtube/v3/search",
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    out = []
    for item in data.get("items", []):
        out.append(
            {
                "videoId": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channelTitle": item["snippet"]["channelTitle"],
                "publishedAt": item["snippet"]["publishedAt"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            }
        )
    return out


# ---------------- Playwright snapshot ----------------

async def snapshot_video_frame(
    video_url: str,
    seconds: int,
    viewport: Tuple[int, int] = (1920, 1080),
    wait_after_seek_ms: int = 1200,
) -> Image.Image:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": viewport[0], "height": viewport[1]},
            user_agent=random.choice(
                [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/16.5 Safari/605.1.15",
                ]
            ),
        )
        page = await context.new_page()
        await page.goto(video_url, wait_until="domcontentloaded")
        await page.wait_for_selector("video", timeout=20000)
        await page.evaluate("document.querySelector('video').play()")
        await page.wait_for_timeout(1000)
        await page.evaluate(
            f"document.querySelector('video').currentTime = {seconds}"
        )
        await page.wait_for_timeout(wait_after_seek_ms)
        await page.evaluate("document.querySelector('video').pause()")
        await page.wait_for_timeout(250)
        await page.evaluate(
            """
            const style = document.createElement('style');
            style.innerHTML = `
              .ytp-chrome-bottom, .ytp-gradient-bottom,
              .ytp-chrome-top, .ytp-gradient-top,
              .ytp-ce-element, .ytp-spinner { display: none !important; }
            `;
            document.head.appendChild(style);
            """
        )
        await page.wait_for_timeout(250)

        out_path = os.path.join(tempfile.gettempdir(), "frame.png")
        try:
            player = await page.query_selector(".html5-video-player")
            if player:
                await player.screenshot(path=out_path)
            else:
                await page.screenshot(path=out_path, full_page=False)
        except Exception:
            await page.screenshot(path=out_path, full_page=False)

        await browser.close()
        return Image.open(out_path)


# ---------------- OCR and parsing ----------------

def crop_overlay(img: Image.Image) -> Image.Image:
    w, h = img.size
    l = int(w * OVERLAY_CROP[0])
    t = int(h * OVERLAY_CROP[1])
    r = int(w * OVERLAY_CROP[2])
    b = int(h * OVERLAY_CROP[3])
    l = max(0, min(l, w - 1))
    t = max(0, min(t, h - 1))
    r = max(l + 1, min(r, w))
    b = max(t + 1, min(b, h))
    return img.crop((l, t, r, b))


def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(img)
    gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    arr = np.array(gray)
    arr = cv2.adaptiveThreshold(
        arr,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        7,
    )
    return Image.fromarray(arr)


FPS_PATTERNS = [
    r"(\d{2,4})\s*FPS",
    r"FPS\s*[:\-]?\s*(\d{2,4})",
    r"(\d{2,4})\s*avg",
    r"avg\s*(\d{2,4})",
]
LOW1_PATTERNS = [
    r"1%[ ]?low\s*[:\-]?\s*(\d{1,4})",
    r"1%\s*low\s*(\d{1,4})",
    r"(\d{1,4})\s*1%[ ]?low",
]


def parse_fps_text(text: str):
    avg = None
    low1 = None
    for pat in FPS_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                avg = float(m.group(1))
                break
            except Exception:
                pass
    for pat in LOW1_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                low1 = float(m.group(1))
                break
            except Exception:
                pass
    return avg, low1


def ocr_extract_fps(img: Image.Image):
    region = crop_overlay(img)
    proc = preprocess_for_ocr(region)
    text = pytesseract.image_to_string(proc, config=TESSERACT_CONFIG)
    avg, low1 = parse_fps_text(text)
    return avg, low1, text


# ---------------- Orchestration ----------------

async def extract_from_video_timestamp(
    video_url: str,
    ts_seconds: int,
    gpu: str,
    game: str,
    resolution: str,
    channel: Optional[str] = None,
    video_id: Optional[str] = None,
) -> ExtractedResult:
    img = await snapshot_video_frame(video_url, ts_seconds)
    avg, low1, raw_text = ocr_extract_fps(img)
    notes = None if avg is not None else f"OCR text: {raw_text[:200]}"
    return ExtractedResult(
        gpu=gpu,
        game=game,
        resolution=resolution,
        avg_fps=avg,
        low_1p=low1,
        source_url=video_url,
        channel=channel,
        video_id=video_id,
        timestamp_s=ts_seconds,
        notes=notes,
    )


def build_queries() -> List[str]:
    queries = []
    for gpu in GPUS:
        for game in GAMES:
            for res in RESOLUTIONS:
                queries.append(
                    f'{gpu} {game} {res} benchmark -dlss -fsr -framegen 2025'
                )
    return queries


async def main():
    # 1) Discovery preview (optional)
    for q in build_queries():
        try:
            results = yt_search(q, max_results=3)
            print(f"\nSearch: {q}")
            for it in results:
                print(
                    f" - {it['title']} | {it['channelTitle']} | "
                    f"{it['publishedAt']} | {it['url']}"
                )
        except Exception as e:
            print(f"Search error: {e}")
        time.sleep(random.uniform(0.7, 1.4))

    # 2) Extraction from hardcoded targets
    if not TARGETS:
        print(
            "\nNo TARGETS set yet. Edit TARGETS dict with real video URLs and "
            "timestamps, then rerun."
        )
        return

    results: List[ExtractedResult] = []
    for key, meta in TARGETS.items():
        gpu, game, resolution = key.split("|")
        url = meta["url"]
        ts = int(meta["ts"])
        channel = meta.get("channel")
        vid = meta.get("video_id")
        try:
            er = await extract_from_video_timestamp(
                url, ts, gpu, game, resolution, channel, vid
            )
            results.append(er)
            await asyncio.sleep(random.uniform(1.5, 3.0))
        except Exception as e:
            results.append(
                ExtractedResult(
                    gpu=gpu,
                    game=game,
                    resolution=resolution,
                    avg_fps=None,
                    low_1p=None,
                    source_url=url,
                    channel=channel,
                    video_id=vid,
                    timestamp_s=ts,
                    notes=f"Error: {e}",
                )
            )

    print("\nJSON results:")
    print(json.dumps([r.__dict__ for r in results], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())