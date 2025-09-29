#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import sys
from typing import List, Dict

import cv2
import numpy as np
import pandas as pd
import pytesseract
from PIL import Image

def preprocess_for_ocr(img_bgr: np.ndarray) -> np.ndarray:
    # Convert to grayscale
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold to handle mixed backgrounds
    th = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )

    # Slight dilation to connect thin characters, then erosion to clean
    kernel = np.ones((1, 1), np.uint8)
    morph = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)

    # Optional: upscale if image is small
    h, w = morph.shape[:2]
    scale = 2 if max(h, w) < 1200 else 1
    if scale != 1:
        morph = cv2.resize(morph, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)

    return morph

def ocr_image(image_path: str, lang: str = "eng") -> Dict:
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"File not found: {image_path}")

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        raise ValueError(f"Unable to read image: {image_path}")

    pre = preprocess_for_ocr(img_bgr)

    # Get detailed OCR with bounding boxes
    data = pytesseract.image_to_data(
        pre, lang=lang, output_type=pytesseract.Output.DICT
    )

    # Build entries for non-empty words
    rows = []
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        if not text:
            continue
        rows.append(
            {
                "file": os.path.basename(image_path),
                "page": 1,  # single image = one page
                "conf": _try_float(data["conf"][i]),
                "text": text,
                "left": int(data["left"][i]),
                "top": int(data["top"][i]),
                "width": int(data["width"][i]),
                "height": int(data["height"][i]),
                "line_num": int(data["line_num"][i]),
                "block_num": int(data["block_num"][i]),
                "par_num": int(data["par_num"][i]),
                "word_num": int(data["word_num"][i]),
            }
        )

    # Also provide a full-text concatenation (by line, roughly)
    full_text = "\n".join(_group_lines(rows))
    return {"file": os.path.basename(image_path), "full_text": full_text, "tokens": rows}

def _group_lines(rows: List[Dict]) -> List[str]:
    # Group by block->par->line and join words to approximate original lines
    if not rows:
        return []
    rows_sorted = sorted(
        rows, key=lambda r: (r["block_num"], r["par_num"], r["line_num"], r["left"])
    )
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

def _try_float(x):
    try:
        return float(x)
    except Exception:
        return None

def save_as_json(results: List[Dict], out_path: str):
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

def save_as_csv(results: List[Dict], out_path: str):
    # Flatten token rows from all files
    all_rows = []
    for r in results:
        for t in r["tokens"]:
            all_rows.append(t)
    df = pd.DataFrame(all_rows)
    df.to_csv(out_path, index=False, encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(
        description="Extract text from images and output CSV or JSON."
    )
    parser.add_argument(
        "images",
        nargs="+",
        help="Path(s) to image files (PNG, JPG, etc.).",
    )
    parser.add_argument(
        "--format",
        choices=["json", "csv"],
        default="json",
        help="Output format (default: json).",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="Output file path. If omitted, will derive from first image name.",
    )
    parser.add_argument(
        "--lang",
        default="eng",
        help="Tesseract language code (default: eng).",
    )
    parser.add_argument(
        "--show-text",
        action="store_true",
        help="Print concatenated full text to stdout.",
    )
    args = parser.parse_args()

    results = []
    for img in args.images:
        try:
            res = ocr_image(img, lang=args.lang)
            results.append(res)
            if args.show_text:
                print(f"----- {res['file']} -----")
                print(res["full_text"])
                print()
        except Exception as e:
            print(f"Error processing {img}: {e}", file=sys.stderr)

    if not results:
        print("No results to save.", file=sys.stderr)
        sys.exit(1)

    if args.out is None:
        base = os.path.splitext(os.path.basename(args.images[0]))[0]
        args.out = f"{base}.{'json' if args.format=='json' else 'csv'}"

    if args.format == "json":
        save_as_json(results, args.out)
    else:
        save_as_csv(results, args.out)

    print(f"Saved output to: {args.out}")

if __name__ == "__main__":
    # If Tesseract isn't in PATH on Windows, uncomment and adjust:
    # pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    main()