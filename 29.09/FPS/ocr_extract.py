#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import math
import os
import re
import statistics
import sys
from typing import List, Dict, Optional, Tuple

import cv2
import numpy as np
import pandas as pd
import pytesseract


# -------------------- PREPROCESS -------------------- #
def _unsharp_mask(gray: np.ndarray, amount: float = 1.2, radius: float = 1.0) -> np.ndarray:
    blur = cv2.GaussianBlur(gray, (0, 0), radius)
    sharp = cv2.addWeighted(gray, 1 + amount, blur, -amount, 0)
    return np.clip(sharp, 0, 255).astype(np.uint8)


def _sauvola(gray: np.ndarray, win: int = 41, k: float = 0.2) -> np.ndarray:
    # Local threshold suited for light UI backgrounds
    mean = cv2.boxFilter(gray, ddepth=-1, ksize=(win, win), borderType=cv2.BORDER_REPLICATE)
    sqr = cv2.boxFilter((gray * gray).astype(np.float32), -1, (win, win), borderType=cv2.BORDER_REPLICATE)
    var = np.maximum(0, sqr - mean.astype(np.float32) ** 2)
    std = np.sqrt(var)
    R = 128.0
    thresh = mean.astype(np.float32) * (1 + k * ((std / R) - 1))
    out = (gray.astype(np.float32) > thresh).astype(np.uint8) * 255
    return out.astype(np.uint8)


def preprocess_hires(img_bgr: np.ndarray, scale: int = 2) -> Tuple[np.ndarray, np.ndarray]:
    h, w = img_bgr.shape[:2]
    up = cv2.resize(img_bgr, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(up, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, None, h=7, templateWindowSize=7, searchWindowSize=21)
    gray = _unsharp_mask(gray, amount=0.8, radius=0.8)
    soft_bin = _sauvola(gray, win=41, k=0.15)
    return gray, soft_bin


def preprocess_fallback(img_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    h, w = img_bgr.shape[:2]
    scale = 2 if max(h, w) < 1400 else 1
    up = cv2.resize(img_bgr, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(up, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    gray = _unsharp_mask(gray, amount=0.8, radius=0.8)
    soft_bin = _sauvola(gray, win=31, k=0.18)
    return gray, soft_bin


def preprocess_for_ocr(img_bgr: np.ndarray, debug_name: Optional[str] = None) -> Tuple[np.ndarray, np.ndarray]:
    h, w = img_bgr.shape[:2]
    if max(h, w) >= 1200:
        gray, soft_bin = preprocess_hires(img_bgr, scale=2)
    else:
        gray, soft_bin = preprocess_fallback(img_bgr)

    if debug_name:
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"results_pre_{debug_name}.png")
        cv2.imwrite(out, soft_bin)
    # Return grayscale for OCR; soft_bin is for band extraction/preview
    return gray, soft_bin


# -------------------- OCR CORE -------------------- #
def ocr_tsv(pre_img: np.ndarray, lang: str = "eng", psm: int = 11) -> List[Dict]:
    config = (
        f"--oem 3 --psm {psm} "
        "tessedit_char_blacklist=()[]{}|/\\ "
        "tessedit_write_images=true "
    )
    tsv = pytesseract.image_to_data(
        pre_img, lang=lang, config=config, output_type=pytesseract.Output.DATAFRAME
    )
    rows = []
    if tsv is None or tsv.empty:
        return rows
    tsv = tsv.dropna(subset=["text"])
    for _, r in tsv.iterrows():
        text = str(r["text"]).strip()
        if not text:
            continue
        rows.append(
            {
                "file": None,
                "page": 1,
                "conf": float(r["conf"]) if str(r["conf"]).replace(".", "", 1).isdigit() else None,
                "text": text,
                "left": int(r["left"]),
                "top": int(r["top"]),
                "width": int(r["width"]),
                "height": int(r["height"]),
                "line_num": int(r.get("line_num", 0) or 0),
                "block_num": int(r.get("block_num", 0) or 0),
                "par_num": int(r.get("par_num", 0) or 0),
                "word_num": int(r.get("word_num", 0) or 0),
            }
        )
    return rows


def ocr_image(image_path: str, lang: str = "eng") -> Dict:
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"File not found: {image_path}")

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        raise ValueError(f"Unable to read image: {image_path}")

    gray, soft_bin = preprocess_for_ocr(img_bgr, debug_name=os.path.basename(image_path))

    # Try multiple PSMs and keep the richer result
    tokens = ocr_tsv(gray, lang=lang, psm=6)
    tokens_b = ocr_tsv(gray, lang=lang, psm=11)
    if len(tokens_b) > len(tokens):
        tokens = tokens_b

    if len(tokens) < 50:
        gray2, _ = preprocess_fallback(img_bgr)
        tokens2 = ocr_tsv(gray2, lang=lang, psm=7)
        if len(tokens2) > len(tokens):
            tokens = tokens2

    for t in tokens:
        t["file"] = os.path.basename(image_path)

    full_text = "\n".join(_group_lines(tokens))
    return {"file": os.path.basename(image_path), "full_text": full_text, "tokens": tokens, "pre": soft_bin}


def _group_lines(rows: List[Dict]) -> List[str]:
    if not rows:
        return []
    rows_sorted = sorted(rows, key=lambda r: (r["block_num"], r["par_num"], r["line_num"], r["left"]))
    lines = []
    current_key = None
    current_words = []
    for r in rows_sorted:
        key = (r["block_num"], r["par_num"], r["line_num"])
        if key != current_key and current_words:
            lines.append(" ".join(current_words))
            current_words = []
        current_key = key
        current_words.append(r["text"])
    if current_words:
        lines.append(" ".join(current_words))
    return lines


# -------------------- PARSER -------------------- #
def _norm(t: str) -> str:
    t = t.strip()
    t = (
        t.replace("RTIX", "RTX")
        .replace("RIX", "RTX")
        .replace("RX.", "RX ")
        .replace("RTX.", "RTX ")
        .replace("T1", "Ti")
        .replace("T|", "Ti")
    )
    t = (
        t.replace("Supefjiz", "Super")
        .replace("Super,i2", "Super 12")
        .replace("Super,16", "Super 16")
        .replace("Supe", "Super")
        .replace("FE.", "FE ")
        .replace("FE ,", "FE ")
        .replace("FE,", "FE")
    )
    t = (
        t.replace("FPS|", "FPS")
        .replace("FPS@", "FPS")
        .replace("FPS®", "FPS")
        .replace("FRS", "FPS")
        .replace("FES", "FPS")
        .replace("GF", "GB")
        .replace("GD", "GB")
    )
    t = t.replace("GB::", "GB").replace("GB:", "GB").replace("GB!", "GB")
    t = t.replace(",", ".")
    t = re.sub(r"[{}|;]+", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t


def _resolution_from_tokens(tokens: List[Dict]) -> Optional[str]:
    for tk in tokens[:400]:
        m = re.search(r"\b(\d{3,5})x(\d{3,5})\b", tk["text"])
        if m:
            return f"{m.group(1)}x{m.group(2)}"
    return None


def _cluster_rows(tokens: List[Dict]) -> List[List[Dict]]:
    toks = sorted(tokens, key=lambda r: (r["top"], r["left"]))
    if not toks:
        return []
    heights = [t["height"] for t in toks if t["height"] > 0]
    h_med = statistics.median(heights) if heights else 16
    y_gap = int(h_med * 2.8)

    rows: List[List[Dict]] = [[toks[0]]]
    for t in toks[1:]:
        prev = rows[-1][-1]
        if abs((t["top"] + t["height"] // 2) - (prev["top"] + prev["height"] // 2)) > y_gap:
            rows.append([t])
        else:
            rows[-1].append(t)
    return rows


def _parse_row_text(r: List[Dict]) -> str:
    parts = [_norm(t["text"]) for t in sorted(r, key=lambda x: x["left"]) if _norm(t["text"])]
    return " ".join(parts)


def _extract_gpu(line: str) -> Optional[str]:
    # Search the left part where labels live
    left_seg = line[: max(20, int(len(line) * 0.8))]

    # Strong patterns that include the number to avoid "RTX FE"
    patterns = [
        r"\bRTX\s*(\d{3,4})\s*(Ti)?\s*(Super)?\s*(FE)?\b",
        r"\bRTX\s*(\d{3,4})\s*FE\s*(\d{2})\s*GB\b",
        r"\bGTX\s*(\d{3,4})\s*(Ti)?\s*(Super)?\b",
        r"\bRX\s*(\d{4,5})\s*(XTX|XT|GRE|XT\s*20)?\b",
        r"\bArc\s*A(\d{3})\b",
    ]
    for pat in patterns:
        m = re.search(pat, left_seg, re.IGNORECASE)
        if m:
            s = m.group(0)
            s = re.sub(r"\s+", " ", s).strip()
            s = s.replace("XT 20", "XT 20")
            return s

    # Rescue: build from tokens but require a number directly after family
    toks = [x for x in re.split(r"\s+", left_seg) if x]
    out = []
    i = 0
    while i < len(toks):
        tk = toks[i]
        if re.match(r"^(RTX|GTX|RX)$", tk, re.IGNORECASE):
            if i + 1 < len(toks) and re.match(r"^\d{3,5}$", toks[i + 1]):
                out = [tk, toks[i + 1]]
                i += 2
                while i < len(toks) and re.match(r"^(Ti|Super|FE|XTX|XT|GRE)$", toks[i], re.IGNORECASE):
                    out.append(toks[i])
                    i += 1
                break
        elif re.match(r"^Arc$", tk, re.IGNORECASE):
            if i + 1 < len(toks) and re.match(r"^A\d{3}$", toks[i + 1], re.IGNORECASE):
                out = [tk, toks[i + 1]]
                i += 2
                break
        i += 1

    if out:
        return re.sub(r"\s+", " ", " ".join(out)).strip()
    return None


def _extract_vram(line: str) -> Optional[int]:
    m = re.search(r"\b(\d{1,2})\s*GB\b", line, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            pass
    return None


def _extract_fps(line: str) -> Optional[float]:
    m = re.search(r"\b(\d{2,3}(?:\.\d)?)\s*FPS\b", line, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m2 = re.search(r"\bGB\b\s*[: ]\s*(\d{2,3}(?:\.\d)?)\b", line, re.IGNORECASE)
    if m2:
        try:
            return float(m2.group(1))
        except Exception:
            pass
    candidates = re.findall(r"\b(\d{2,3}(?:\.\d)?)\b", line)
    for val in reversed(candidates):
        try:
            f = float(val)
            if f >= 20:
                return f
        except Exception:
            pass
    return None


def parse_chart(tokens: List[Dict]) -> List[Dict]:
    toks = [t for t in tokens if (t["conf"] is None or t["conf"] >= 5) and (t["text"] or "").strip()]
    rows_tok = _cluster_rows(toks)
    resolution = _resolution_from_tokens(toks)

    parsed = []
    for r in rows_tok:
        line = _parse_row_text(r)
        if not re.search(r"\b(RTX|RX|Arc|GTX)\b", line, re.IGNORECASE):
            continue
        if "GB" not in line and "FPS" not in line:
            continue

        gpu = _extract_gpu(line)
        fps = _extract_fps(line)
        vram = _extract_vram(line)
        if gpu and fps is not None:
            parsed.append({"gpu": gpu, "vram_gb": vram, "fps": fps, "resolution": resolution, "file": None})

    uniq = {}
    for p in parsed:
        key = (p["gpu"], p["resolution"])
        if key not in uniq or p["fps"] > uniq[key]["fps"]:
            uniq[key] = p
    return list(uniq.values())


# --------- Fallback band-based extraction for stubborn images --------- #
def band_extract(pre_img: np.ndarray) -> List[Tuple[int, int, int, int]]:
    inv = 255 - pre_img
    contours, _ = cv2.findContours(inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = [cv2.boundingRect(c) for c in contours]
    if not boxes:
        return []
    boxes = sorted(boxes, key=lambda b: (b[1], b[0]))

    merged = []
    for x, y, w, h in boxes:
        if not merged:
            merged.append([x, y, w, h])
            continue
        mx, my, mw, mh = merged[-1]
        if abs(y - my) < int(max(h, mh) * 0.6):
            nx = min(mx, x)
            ny = min(my, y)
            nmaxx = max(mx + mw, x + w)
            nmaxy = max(my + mh, y + h)
            merged[-1] = [nx, ny, nmaxx - nx, nmaxy - ny]
        else:
            merged.append([x, y, w, h])

    H, W = pre_img.shape[:2]
    bands = [b for b in merged if b[2] > 0.3 * W and 12 < b[3] < 0.2 * H]
    return bands


def parse_chart_with_bands(pre_img: np.ndarray, lang: str = "eng") -> List[Dict]:
    bands = band_extract(pre_img)
    if not bands:
        return []

    rows = []
    H, W = pre_img.shape[:2]
    for (x, y, w, h) in bands:
        pad_y = max(4, h // 6)
        pad_x = max(8, w // 10)
        y0 = max(0, y - pad_y)
        y1 = min(H, y + h + pad_y)
        x0 = max(0, x - pad_x)
        x1 = min(W, x + w + pad_x)
        crop = pre_img[y0:y1, x0:x1]

        config = "--oem 3 --psm 7 tessedit_char_blacklist=()[]{}|/\\ "
        text = pytesseract.image_to_string(crop, lang=lang, config=config) or ""
        line = _norm(text)

        gpu = _extract_gpu(line)
        fps = _extract_fps(line)
        vram = _extract_vram(line)
        if gpu and fps is not None:
            rows.append({"gpu": gpu, "vram_gb": vram, "fps": fps})

    unique = {}
    for r in rows:
        k = r["gpu"]
        if k not in unique or r["fps"] > unique[k]["fps"]:
            unique[k] = r
    return list(unique.values())


# -------------------- IO -------------------- #
def save_as_json(obj, out_path: str):
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def save_tokens_csv(results: List[Dict], out_path: str):
    all_rows = []
    for r in results:
        for t in r["tokens"]:
            all_rows.append(t)
    pd.DataFrame(all_rows).to_csv(out_path, index=False, encoding="utf-8")


def save_dicts_csv(dict_rows: List[Dict], out_path: str):
    pd.DataFrame(dict_rows).to_csv(out_path, index=False, encoding="utf-8")


# -------------------- CLI -------------------- #
def main():
    parser = argparse.ArgumentParser(
        description="Parse TechPowerUp-style FPS charts into clean GPU/FPS tables."
    )
    parser.add_argument("images", nargs="+", help="Path(s) to image files.")
    parser.add_argument("--format", choices=["json", "csv"], default="csv")
    parser.add_argument("--mode", choices=["raw", "table"], default="table")
    parser.add_argument("--lang", default="eng")
    parser.add_argument("--show-text", action="store_true")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, f"results.{ 'json' if args.format=='json' else 'csv'}")

    final_rows: List[Dict] = []

    for img in args.images:
        try:
            res = ocr_image(img, lang=args.lang)
        except Exception as e:
            print(f"Error processing {img}: {e}", file=sys.stderr)
            continue

        if args.show_text:
            print(f"----- {res['file']} -----\n{res['full_text']}\n")

        if args.mode == "raw":
            final_rows.append({"__RAW__": res})
            continue

        parsed = parse_chart(res["tokens"])

        if not parsed:
            band_rows = parse_chart_with_bands(res["pre"], lang=args.lang)
            if band_rows:
                resolution = _resolution_from_tokens(res["tokens"])
                for r in band_rows:
                    r["resolution"] = resolution
                    r["file"] = res["file"]
                final_rows.extend(band_rows)
                continue

        if parsed:
            resolution = _resolution_from_tokens(res["tokens"])
            for r in parsed:
                r["file"] = res["file"]
                r["resolution"] = resolution
            final_rows.extend(parsed)

    if not final_rows:
        print("Parsed 0 rows. Check results_pre_*.png for legibility.", file=sys.stderr)
        sys.exit(2)

    if args.mode == "raw":
        all_rows = []
        for item in final_rows:
            res = item["__RAW__"]
            for t in res["tokens"]:
                all_rows.append(t)
        pd.DataFrame(all_rows).to_csv(out_path, index=False, encoding="utf-8")
    else:
        pd.DataFrame(final_rows).to_csv(out_path, index=False, encoding="utf-8")

    print(f"Saved parsed table to: {out_path}")


if __name__ == "__main__":
    # Update this path to your Tesseract install if needed
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    main()