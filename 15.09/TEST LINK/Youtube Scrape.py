# file: fps_extractor.py
# Prettier style: 80-char width

import os
import re
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

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# You can set YT_API_KEY in environment or .env (if you use python-dotenv)
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")

# Target entities
GPUS = ["RTX 5090", "RTX 5080", "RTX 5060 Ti"]
GAMES = ["League of Legends", "Counter-Strike 2", "Apex Legends"]
RESOLUTIONS = ["1080p", "1440p", "4K"]

# OCR settings: tweak for your target channels
TESSERACT_CONFIG = (
    "--oem 1 --psm 6 -c tessedit_char_whitelist=0123456789.kFPS "
)

# Optional: crop region as a percentage of frame to look for overlay FPS
# (left, top, right, bottom) in 0..1. Adjust per channel if needed.
OVERLAY_CROP = (0.75, 0.02, 0.98, 0.18)  # top-right overlay typical


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class BenchQuery:
    gpu: str
    game: str
    resolution: str
    # Optional hints to improve search
    keywords: Optional[str] = None


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


# ---------------------------------------------------------------------------
# YouTube discovery (optional but helpful)
# ---------------------------------------------------------------------------

def yt_search(
    query: str,
    published_after_iso: str = "2024-10-01T00:00:00Z",
    max_results: int = 10,
) -> List[Dict]:
    """Search YouTube for candidate videos."""
    if not YOUTUBE_API_KEY:
        print("WARN: YOUTUBE_API_KEY not set. Skipping discovery.")
        return []

    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "publishedAfter": published_after_iso,
        "order": "date",
        "key": AIzaSyDjFXTGu52MA7Mz6A4xs84d0aoizBe4lWE,
    }
    url = "https://www.googleapis.com/youtube/v3/search"
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get("items", []):
        results.append(
            {
                "videoId": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channelTitle": item["snippet"]["channelTitle"],
                "publishedAt": item["snippet"]["publishedAt"],
            }
        )
    return results


# ---------------------------------------------------------------------------
# Playwright utilities
# ---------------------------------------------------------------------------

async def snapshot_video_frame(
    video_url: str,
    seconds: int,
    viewport: Tuple[int, int] = (1920, 1080),
    wait_after_seek_ms: int = 1200,
) -> Image.Image:
    """Open a YouTube video, seek to `seconds`, pause, and screenshot frame."""
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

        # Ensure playback starts to buffer frames
        await page.evaluate("document.querySelector('video').play()")
        await page.wait_for_timeout(1000)

        # Seek
        await page.evaluate(
            f"document.querySelector('video').currentTime = {seconds}"
        )
        await page.wait_for_timeout(wait_after_seek_ms)

        # Pause frame
        await page.evaluate("document.querySelector('video').pause()")
        await page.wait_for_timeout(250)

        # Hide UI overlays (attempt)
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

        # Screenshot the player area if possible
        # Fallback: full-page
        path = os.path.join(tempfile.gettempdir(), "frame.png")
        try:
            player = await page.query_selector(".html5-video-player")
            if player:
                await player.screenshot(path=path)
            else:
                await page.screenshot(path=path, full_page=False)
        except Exception:
            await page.screenshot(path=path, full_page=False)

        await browser.close()
        return Image.open(path)


# ---------------------------------------------------------------------------
# OCR pipeline
# ---------------------------------------------------------------------------

def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    """Basic preprocessing to enhance text contrast."""
    gray = ImageOps.grayscale(img)
    # Slight sharpen and contrast boost
    gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    np_img = np.array(gray)
    # Adaptive threshold
    np_img = cv2.adaptiveThreshold(
        np_img,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        7,
    )
    return Image.fromarray(np_img)


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


FPS_PATTERNS = [
    r"(\d{2,4})\s*FPS",
    r"FPS\s*[:\-]?\s*(\d{2,4})",
    r"(\d{2,4})\s*avg",  # some overlays
    r"avg\s*(\d{2,4})",
]

LOW1_PATTERNS = [
    r"1%[ ]?low\s*[:\-]?\s*(\d{1,4})",
    r"1%\s*low\s*(\d{1,4})",
    r"(\d{1,4})\s*1%[ ]?low",
]


def parse_fps_text(text: str) -> Tuple[Optional[float], Optional[float]]:
    """Extract avg FPS and 1% low if present."""
    avg = None
    low1 = None

    for pat in FPS_PATTERNS:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            try:
                avg = float(m.group(1))
                break
            except Exception:
                pass

    for pat in LOW1_PATTERNS:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            try:
                low1 = float(m.group(1))
                break
            except Exception:
                pass

    return avg, low1


def ocr_extract_fps(img: Image.Image) -> Tuple[Optional[float], Optional[float], str]:
    """Run OCR and parse FPS numbers."""
    cropped = crop_overlay(img)
    proc = preprocess_for_ocr(cropped)
    text = pytesseract.image_to_string(proc, config=TESSERACT_CONFIG)
    avg, low1 = parse_fps_text(text)
    return avg, low1, text


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

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
    notes = None
    if avg is None:
        notes = f"No FPS parsed. OCR text: {raw_text[:200]}"

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


def build_queries() -> List[BenchQuery]:
    queries: List[BenchQuery] = []
    for gpu in GPUS:
        for game in GAMES:
            for res in RESOLUTIONS:
                kw = f'{gpu} {game} {res} benchmark -dlss -fsr -framegen 2025'
                queries.append(BenchQuery(gpu=gpu, game=game, resolution=res, keywords=kw))
    return queries


async def main():
    # Step 1 (optional): Discover candidate videos for each query.
    # You will likely want to review the search results and hand-pick URLs and
    # timestamps. Automated timestamp finding is unreliable.
    bench_queries = build_queries()

    discovery: Dict[str, List[Dict]] = {}
    for q in bench_queries:
        query = q.keywords or f"{q.gpu} {q.game} {q.resolution} benchmark"
        print(f"Searching: {query}")
        try:
            results = yt_search(query, max_results=5)
        except Exception as e:
            print(f"Search error: {e}")
            results = []
        discovery_key = f"{q.gpu}|{q.game}|{q.resolution}"
        discovery[discovery_key] = results
        time.sleep(random.uniform(0.7, 1.5))

    # Print discovery preview
    print("\nDiscovery preview:")
    for k, items in discovery.items():
        print(k)
        for it in items:
            print(f" - {it['title']} ({it['channelTitle']}) id={it['videoId']}")

    # Step 2: Provide a mapping from (gpu, game, resolution) -> video_url, ts
    # For best results, review discovery and fill this map with precise moments
    # where the overlay/graph shows FPS clearly.
    # Example entries below are placeholders; replace with real URLs/timestamps.
    # Timestamp can be an integer (seconds).
    targets: Dict[str, Dict] = {
        # "RTX 5090|Apex Legends|4K": {
        #     "url": "https://www.youtube.com/watch?v=VIDEO_ID",
        #     "ts": 735,
        #     "channel": "Hardware Unboxed",
        #     "video_id": "VIDEO_ID",
        # }
    }

    # Step 3: Extract
    results: List[ExtractedResult] = []
    for key, meta in targets.items():
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
            # politeness delay
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

    # Step 4: Print JSON
    print("\nResults:")
    print(
        json.dumps(
            [er.__dict__ for er in results],
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())