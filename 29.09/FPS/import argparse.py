import argparse
import re
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
import pandas as pd
from tqdm import tqdm

UA = "TPU-FPS-DOM-Scraper/1.0 (+research; polite)"
HEADERS = {"User-Agent": UA}
RES_RE = re.compile(r"(\d{3,4}x\d{3,4})", re.I)

def get_html(url: str, session: requests.Session) -> str:
    r = session.get(url, headers=HEADERS, timeout=40)
    r.raise_for_status()
    return r.text

def find_review_links(listing_html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(listing_html, "lxml")
    links = set()
    for a in soup.select("a[href]"):
        absu = urljoin(base_url, a["href"])
        if "/review/" in absu and "/reviewdb/" not in absu:
            links.add(absu.split("#")[0])
    return sorted(links)

def discover_section_pages(article_url: str, html: str) -> list[tuple[int, str]]:
    soup = BeautifulSoup(html, "lxml")
    nums = []
    for opt in soup.select("select option"):
        txt = (opt.get_text() or "").strip()
        m = re.match(r"^(\d+)\s*[-–]", txt)
        if m:
            nums.append(int(m.group(1)))
    if not nums:
        nums = [1]
    pages = []
    for n in sorted(set(nums)):
        pages.append((n, article_url if n == 1 else article_url.rstrip("/") + f"/{n}.html"))
    return pages

def text(el) -> str:
    return " ".join(el.stripped_strings)

def guess_game_name(soup: BeautifulSoup) -> str:
    for sel in ["h1", "h2", "h3"]:
        h = soup.select_one(sel)
        if h:
            t = text(h)
            if t:
                return t
    return "Unknown Game"

def find_resolution_near(node) -> str | None:
    # Search siblings and preceding headers for 1920x1080 etc.
    # node is a Tag; walk up and inspect nearby text
    cur = node
    for _ in range(3):
        if not cur:
            break
        # check node text
        m = RES_RE.search(" ".join(cur.stripped_strings))
        if m:
            return m.group(1)
        # check previous headers
        prev = cur.find_previous(["h3", "h4", "p"])
        if prev:
            m = RES_RE.search(" ".join(prev.stripped_strings))
            if m:
                return m.group(1)
        cur = cur.parent
    return None

def parse_charts_from_page(page_url: str, html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")

    game = guess_game_name(soup)
    rows = []

    # Strategy:
    # - Identify chart containers (divs with many child rows/bars).
    # - Inside each, each row contains GPU label + FPS value text.
    containers = soup.select(
        ".review-graph, .review-graphs, .review-graph-container, .chart, .charts, .content"
    )
    if not containers:
        containers = [soup.body or soup]

    for cont in containers:
        # Collect potential "row" elements in the chart
        items = cont.select(
            ".review-graph-bar, .bar, .row, li, .review-graph-legend-item, tr"
        )
        if not items:
            continue

        # Heuristic: only keep containers that actually contain FPS-looking text
        if not re.search(r"\bFPS\b|\b\d{2,3}\.\d\b", text(cont), re.I):
            continue

        res = find_resolution_near(cont) or "unknown"
        rank = 0

        for it in items:
            # Build a text line
            t = text(it)
            if not t:
                continue
            # Must contain GPU family token
            if not re.search(r"\b(RTX|GTX|RX|Arc)\b", t, re.I):
                continue
            # Extract FPS: prefer “… xx.x FPS”
            m = re.search(r"(\d+(?:\.\d+)?)\s*FPS\b", t, re.I)
            if not m:
                # fallback: last number in the string
                nums = re.findall(r"(\d+(?:\.\d+)?)", t)
                if nums:
                    m = re.match(r".*", t)  # dummy
                    fps = float(nums[-1])
                else:
                    continue
                fps_val = fps
            else:
                fps_val = float(m.group(1))

            # GPU label: remove trailing FPS number/token
            gpu = re.sub(r"(\d+(?:\.\d+)?)\s*FPS\b.*$", "", t, flags=re.I).strip()
            # Clean common noise
            gpu = re.sub(r"\s{2,}", " ", gpu)
            # Short sanity: requires a product number after family
            if not re.search(r"\b(RTX|GTX|RX)\s*\d", gpu, re.I) and not re.search(r"\bArc\s*A\d", gpu, re.I):
                continue

            rank += 1
            rows.append(
                {
                    "page_url": page_url,
                    "game": game,
                    "resolution": res,
                    "gpu": gpu,
                    "fps": fps_val,
                    "chart_rank": rank,
                }
            )

    return rows

def run(start_urls: list[str], delay: float = 0.5, limit_articles: int | None = None) -> list[dict]:
    session = requests.Session()
    # 1) collect article URLs
    article_urls = set()
    for s in start_urls:
        html = get_html(s, session)
        for u in find_review_links(html, s):
            article_urls.add(u)
        time.sleep(delay)
    articles = sorted(article_urls)
    if limit_articles:
        articles = articles[:limit_articles]

    all_rows = []
    # 2) visit each article and its numbered pages
    for art in tqdm(articles, desc="Articles"):
        ahtml = get_html(art, session)
        pages = discover_section_pages(art, ahtml)
        for n, p in pages:
            phtml = get_html(p, session)
            rows = parse_charts_from_page(p, phtml)
            for r in rows:
                r["article_url"] = art
                r["page_no"] = n
            all_rows.extend(rows)
            time.sleep(delay)
    return all_rows

def main():
    ap = argparse.ArgumentParser("TechPowerUp FPS scraper (DOM, no OCR)")
    ap.add_argument("--out", default="tpu_fps.csv")
    ap.add_argument("--delay", type=float, default=0.5)
    ap.add_argument("--limit-articles", type=int, default=None)
    ap.add_argument("--starts", nargs="+", default=[
        "https://www.techpowerup.com/reviewdb/Graphics-Cards/",
        "https://www.techpowerup.com/reviewdb/Graphics-Cards/NVIDIA/",
        "https://www.techpowerup.com/reviewdb/Graphics-Cards/NVIDIA/RTX-5060-Ti/",
    ])
    ap.add_argument("--include-gpu", nargs="*", default=None, help="Filter GPU substrings")
    ap.add_argument("--include-game", nargs="*", default=None, help="Filter game substrings")
    ap.add_argument("--include-res", nargs="*", default=None, help="Filter resolutions, e.g. 1920x1080 2560x1440")
    args = ap.parse_args()

    rows = run(args.starts, delay=args.delay, limit_articles=args.limit_articles)

    df = pd.DataFrame(rows)

    # Optional filters
    if args.include_gpu:
        mask = False
        for s in args.include_gpu:
            mask = mask | df["gpu"].str.contains(s, case=False, na=False)
        df = df[mask]
    if args.include_game:
        mask = False
        for s in args.include_game:
            mask = mask | df["game"].str.contains(s, case=False, na=False)
        df = df[mask]
    if args.include_res:
        df = df[df["resolution"].isin(args.include_res)]

    df = df.drop_duplicates(subset=["article_url", "page_no", "game", "resolution", "gpu"], keep="last")
    df = df.sort_values(["article_url", "page_no", "game", "resolution", "chart_rank"], ignore_index=True)

    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} rows -> {args.out}")

if __name__ == "__main__":
    main()