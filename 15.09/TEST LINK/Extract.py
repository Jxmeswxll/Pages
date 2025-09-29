# file: auto_fps_extractor.py
# Fully automated: discovery -> timestamp probing -> OCR -> parsing -> JSON
# Note: First run may take time due to sampling and OCR.

import os
import re
import json
import math
import time
import random
import asyncio
import tempfile
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlencode

import requests
from dateutil import parser as dateparser
from PIL import Image, ImageOps, ImageFilter
import numpy as np
import cv2
import pytesseract
from playwright.async_api import async_playwright

# -------------- Config --------------

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")

GPUS = [
    "RTX 5090",
    "RTX 5080",
    "RTX 5060 Ti",
]
GAMES = [
    "League of Legends",
    "Counter-Strike 2",
    "Apex Legends",
]
RESOLUTIONS = ["1080p", "1440p", "4K"]

# Channel whitelist improves quality. Add/remove as you learn.
CHANNEL_WHITELIST = {
    # Add known benchmark-focused channels. Use exact channelTitle from API.
    "Hardware Unboxed",
    "GamersNexus",
    "TechPowerUp",
    "Digital Foundry",
    "Framefather",
    "QualityTechSG",
    "ShadowSeven",
    "RigPlay",
    "TechStressTesters",
    "GameTest Hub",
}

# Exclude Shorts/build guides/laptops if you want desktop-only
TITLE_BLACKLIST_PATTERNS = [
    r"\bshorts\b",
    r"\blaptop\b",
    r"\bbuild\b",
    r"\bguide\b",
    r"\bhow to\b",
    r"vs\.",  # comparisons often not single-GPU runs
]

PUBLISHED_AFTER_ISO = "2024-10-01T00:00:00Z"
MAX_RESULTS_PER_QUERY = 8
MAX_VIDEOS_PER_COMBO = 3  # process up to N candidate videos per GPU/game/res

# Probing frames
SAMPLE_INTERVAL_S = 15  # sample every 15s if no chapters
MAX_SAMPLE_DURATION_S = 15 * 60  # scan first 15 min max

# Browser/Render
VIEWPORT = (2560, 1440)
WAIT_AFTER_SEEK_MS = 1800

# OCR crops to try (ltrb in percent)
CROPS = [
    (0.75, 0.02, 0.98, 0.18),  # top-right
    (0.02, 0.02, 0.28, 0.18),  # top-left
    (0.02, 0.78, 0.30, 0.96),  # bottom-left
    (0.70, 0.78, 0.98, 0.96),  # bottom-right
]

TESSERACT_CONFIG = "--oem 1 --psm 6 -c tessedit_char_whitelist=0123456789.FPSavg%kp "

# -------------- Helpers --------------

def log(msg: str):
    print(msg, flush=True)

def http_get(url: str, params: dict) -> dict:
    r = requests.get(url, params=params, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text}")
    return r.json()

def yt_search(query: str, max_results: int) -> List[dict]:
    if not YOUTUBE_API_KEY:
        raise RuntimeError("Missing YOUTUBE_API_KEY")
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "publishedAfter": PUBLISHED_AFTER_ISO,
        "order": "date",
        "key": YOUTUBE_API_KEY,
    }
    data = http_get("https://www.googleapis.com/youtube/v3/search", params)
    out = []
    for it in data.get("items", []):
        out.append(
            {
                "videoId": it["id"]["videoId"],
                "title": it["snippet"]["title"],
                "channelTitle": it["snippet"]["channelTitle"],
                "publishedAt": it["snippet"]["publishedAt"],
                "url": f"https://www.youtube.com/watch?v={it['id']['videoId']}",
            }
        )
    return out

def is_whitelisted_channel(ch: str) -> bool:
    if not CHANNEL_WHITELIST:
        return True
    return ch in CHANNEL_WHITELIST

def is_blacklisted_title(title: str) -> bool:
    t = title.lower()
    return any(re.search(p, t) for p in TITLE_BLACKLIST_PATTERNS)

def aliases_for_game(game: str) -> List[str]:
    g = game.lower()
    if g == "league of legends":
        return ["league of legends", "lol"]
    if g == "counter-strike 2":
        return ["counter-strike 2", "cs2", "counter strike 2"]
    if g == "apex legends":
        return ["apex legends", "apex"]
    return [g]

def resolution_tokens(res: str) -> List[str]:
    if res == "1080p":
        return ["1080p", "1920x1080"]
    if res == "1440p":
        return ["1440p", "2560x1440", "2k"]
    if res == "4K":
        return ["4k", "2160p", "3840x2160", "uhd"]
    return [res.lower()]

def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(img)
    gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=160, threshold=3))
    arr = np.array(gray)
    arr = cv2.adaptiveThreshold(
        arr, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 7
    )
    return Image.fromarray(arr)

def crop_rel(img: Image.Image, rel: Tuple[float, float, float, float]) -> Image.Image:
    w, h = img.size
    l = int(w * rel[0]); t = int(h * rel[1])
    r = int(w * rel[2]); b = int(h * rel[3])
    l = max(0, min(l, w - 1)); t = max(0, min(t, h - 1))
    r = max(l + 1, min(r, w)); b = max(t + 1, min(b, h))
    return img.crop((l, t, r, b))

FPS_PATTERNS = [
    r"(\d{2,4})\s*FPS\b",
    r"\bFPS\s*[:\-]?\s*(\d{2,4})",
    r"avg\s*(\d{2,4})",
    r"(\d{2,4})\s*avg",
]
LOW1_PATTERNS = [
    r"1%[ ]?low\s*[:\-]?\s*(\d{1,4})",
    r"1%\s*low\s*(\d{1,4})",
    r"(\d{1,4})\s*1%[ ]?low",
]

def parse_fps_text(text: str) -> Tuple[Optional[float], Optional[float]]:
    avg = None; low1 = None
    for pat in FPS_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                avg = float(m.group(1)); break
            except: pass
    for pat in LOW1_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                low1 = float(m.group(1)); break
            except: pass
    return avg, low1

def mentions_any(text: str, tokens: List[str]) -> bool:
    t = text.lower()
    return any(tok.lower() in t for tok in tokens)

def has_upscaler_terms(text: str) -> bool:
    t = text.lower()
    return any(x in t for x in ["dlss", "fsr", "frame gen", "framegen", "fg", "mfg"])

# -------------- Browser --------------

async def capture_frame(video_url: str, ts: int) -> Image.Image:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True, args=["--disable-gpu", "--no-sandbox"]
        )
        ctx = await browser.new_context(
            viewport={"width": VIEWPORT[0], "height": VIEWPORT[1]},
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
        page = await ctx.new_page()
        await page.goto(video_url, wait_until="domcontentloaded")
        await page.wait_for_selector("video", timeout=25000)
        await page.evaluate("document.querySelector('video').play()")
        await page.wait_for_timeout(1000)
        await page.evaluate(f"document.querySelector('video').currentTime = {ts}")
        await page.wait_for_timeout(WAIT_AFTER_SEEK_MS)
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
        await page.wait_for_timeout(200)
        out_path = os.path.join(tempfile.gettempdir(), f"frame_{ts}.png")
        try:
            player = await page.query_selector(".html5-video-player")
            if player: await player.screenshot(path=out_path)
            else: await page.screenshot(path=out_path, full_page=False)
        except:
            await page.screenshot(path=out_path, full_page=False)
        await browser.close()
        return Image.open(out_path)

# -------------- Logic --------------

@dataclass
class ExtractedRow:
    gpu: str
    game: str
    resolution: str
    avg_fps: Optional[float]
    low_1p: Optional[float]
    source_url: str
    channel: str
    video_id: str
    published_at: Optional[str]
    timestamp_s: int
    upscaler: Optional[str]
    notes: Optional[str]

async def probe_video_for_combo(video: dict, gpu: str, game: str, res: str) -> Optional[ExtractedRow]:
    url = video["url"]; vid = video["videoId"]; channel = video["channelTitle"]
    published_at = video.get("publishedAt")
    game_alias = aliases_for_game(game)
    res_tokens = resolution_tokens(res)

    # Candidate timestamps list:
    candidates: List[int] = []

    # 1) Parse chapters/timestamps from description (YouTube search API doesn’t give description directly)
    # Use Videos API to get description
    try:
        vd = http_get(
            "https://www.googleapis.com/youtube/v3/videos",
            {"part": "snippet,contentDetails", "id": vid, "key": YOUTUBE_API_KEY},
        )
        items = vd.get("items", [])
        description = items[0]["snippet"].get("description", "") if items else ""
        duration_iso = items[0]["contentDetails"].get("duration", "PT0S") if items else "PT0S"
    except Exception:
        description = ""
        duration_iso = "PT0S"

    # Extract timestamps like 12:34 or 1:02:03
    ts_matches = re.findall(r"(\d{1,2}:\d{2}(?::\d{2})?)", description)
    # Basic mapping: if line with timestamp mentions the game alias, keep it
    lines = description.splitlines()
    for line in lines:
        ts_match = re.search(r"(\d{1,2}:\d{2}(?::\d{2})?)", line)
        if ts_match:
            ts_text = ts_match.group(1)
            if mentions_any(line, game_alias):
                # convert to seconds
                parts = [int(x) for x in ts_text.split(":")]
                seconds = parts[-1] + (parts[-2] * 60 if len(parts) >= 2 else 0) + (parts[-3] * 3600 if len(parts) == 3 else 0)
                candidates.append(seconds)

    # 2) If no candidates, sample every N sec up to MAX_SAMPLE_DURATION_S
    if not candidates:
        for s in range(60, MAX_SAMPLE_DURATION_S + 1, SAMPLE_INTERVAL_S):
            candidates.append(s)

    best_score = -999
    best_row: Optional[ExtractedRow] = None
    window_samples: List[Tuple[int, float, Optional[float], str]] = []

    for ts in candidates[:200]:  # safety cap
        try:
            img = await capture_frame(url, ts)
        except Exception as e:
            continue

        texts_to_check = []

        # Try multiple crops first
        found_any = False
        for rel in CROPS:
            region = crop_rel(img, rel)
            proc = preprocess_for_ocr(region)
            txt = pytesseract.image_to_string(proc, config=TESSERACT_CONFIG)
            texts_to_check.append(txt)
            avg, low1 = parse_fps_text(txt)
            if avg is not None:
                found_any = True
                # compute score
                score = 0
                if mentions_any(txt, game_alias): score += 2
                if mentions_any(txt, res_tokens): score += 2
                if "fps" in txt.lower(): score += 2
                if has_upscaler_terms(txt): score -= 2
                # record candidate
                if score > best_score:
                    best_score = score
                    best_row = ExtractedRow(
                        gpu=gpu, game=game, resolution=res,
                        avg_fps=avg, low_1p=low1, source_url=url,
                        channel=channel, video_id=vid,
                        published_at=published_at, timestamp_s=ts,
                        upscaler=("DLSS/FSR/FG" if has_upscaler_terms(txt) else "off"),
                        notes=None,
                    )
                window_samples.append((ts, avg, low1, "crop"))
        # Fallback: whole-frame OCR once if nothing found
        if not found_any:
            proc_full = preprocess_for_ocr(img)
            txt_full = pytesseract.image_to_string(proc_full, config=TESSERACT_CONFIG)
            texts_to_check.append(txt_full)
            avg, low1 = parse_fps_text(txt_full)
            if avg is not None:
                score = 0
                if mentions_any(txt_full, game_alias): score += 2
                if mentions_any(txt_full, res_tokens): score += 2
                if "fps" in txt_full.lower(): score += 2
                if has_upscaler_terms(txt_full): score -= 2
                if score > best_score:
                    best_score = score
                    best_row = ExtractedRow(
                        gpu=gpu, game=game, resolution=res,
                        avg_fps=avg, low_1p=low1, source_url=url,
                        channel=channel, video_id=vid,
                        published_at=published_at, timestamp_s=ts,
                        upscaler=("DLSS/FSR/FG" if has_upscaler_terms(txt_full) else "off"),
                        notes="whole-frame",
                    )
                window_samples.append((ts, avg, low1, "full"))

        # polite delay to avoid hammering
        await asyncio.sleep(random.uniform(0.6, 1.2))

    # Optional: refine with median around best timestamp
    if best_row:
        center = best_row.timestamp_s
        neighborhood = [s for s, a, l, kind in window_samples if abs(s - center) <= 10 and a is not None]
        if neighborhood:
            avgs = [a for s, a, l, kind in window_samples if abs(s - center) <= 10 and a is not None]
            med = float(np.median(avgs)) if avgs else best_row.avg_fps
            best_row.avg_fps = med

    return best_row

async def run_full():
    results: List[ExtractedRow] = []

    for gpu in GPUS:
        for game in GAMES:
            for res in RESOLUTIONS:
                query = f'{gpu} {game} {res} benchmark -dlss -fsr -framegen 2025'
                log(f"\n[Search] {query}")
                try:
                    vids = yt_search(query, MAX_RESULTS_PER_QUERY)
                except Exception as e:
                    log(f"Search error: {e}")
                    continue
                # Filter
                vids = [
                    v for v in vids
                    if not is_blacklisted_title(v["title"])
                    and is_whitelisted_channel(v["channelTitle"])
                ]
                vids = vids[:MAX_VIDEOS_PER_COMBO]
                log(f"Candidates: {[v['title'] for v in vids]}")
                for v in vids:
                    row = await probe_video_for_combo(v, gpu, game, res)
                    if row and row.avg_fps is not None:
                        results.append(row)
                        log(
                            f"Found: {row.gpu} | {row.game} | {row.resolution} "
                            f"= {row.avg_fps} avg (1% {row.low_1p}) "
                            f"at {row.channel} {row.video_id} t={row.timestamp_s}s"
                        )
                        # one good hit per video per combo is enough
                        break

    # Emit JSON
    out = [
        {
            "gpu": r.gpu,
            "game": r.game,
            "resolution": r.resolution,
            "avg_fps": r.avg_fps,
            "one_percent_low": r.low_1p,
            "upscaler": r.upscaler,
            "source_url": r.source_url,
            "channel": r.channel,
            "video_id": r.video_id,
            "published_at": r.published_at,
            "timestamp_s": r.timestamp_s,
            "captured_at": datetime.utcnow().isoformat() + "Z",
            "notes": r.notes,
        }
        for r in results
    ]
    print("\nJSON results:")
    print(json.dumps(out, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(run_full())