import re
import time
import requests
import pandas as pd
from bs4 import BeautifulSoup

ARTICLE = "https://www.techpowerup.com/review/gainward-geforce-rtx-5060-ti-8-gb/"
UA = "TPU-FPS-DOM-Scraper/1.0 (+research; polite)"
HEADERS = {"User-Agent": UA}
RES_RE = re.compile(r"(\d{3,4}x\d{3,4})", re.I)

def get_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=40)
    # We deliberately don't raise here to let caller handle 404 gracefully
    if r.status_code == 404:
        raise requests.HTTPError("404", response=r)
    r.raise_for_status()
    return r.text

def discover_section_pages(article_url: str, html: str):
    soup = BeautifulSoup(html, "lxml")
    nums = []
    # Parse the dropdown like "1- Introduction", "7- Alan Wake 2", etc.
    for opt in soup.select("select option"):
        txt = (opt.get_text() or "").strip()
        m = re.match(r"^(\d+)\s*[-–]", txt)
        if m:
            nums.append(int(m.group(1)))
    if not nums:
        nums = [1]
    pages = []
    for n in sorted(set(nums)):
        url = article_url if n == 1 else article_url.rstrip("/") + f"/{n}.html"
        pages.append((n, url))
    return pages

def text(el) -> str:
    return " ".join(el.stripped_strings)

def guess_game_name(soup: BeautifulSoup) -> str:
    # First heading usually contains the section/game title
    for sel in ["h1", "h2", "h3"]:
        h = soup.select_one(sel)
        if h:
            t = text(h)
            if t:
                return t
    return "Unknown Game"

def find_resolution_near(node) -> str | None:
    # Try to find 1920x1080, 2560x1440, 3840x2160 near the chart container
    cur = node
    for _ in range(3):
        if not cur:
            break
        m = RES_RE.search(" ".join(cur.stripped_strings))
        if m:
            return m.group(1)
        prev = cur.find_previous(["h3", "h4", "p"])
        if prev:
            m = RES_RE.search(" ".join(prev.stripped_strings))
            if m:
                return m.group(1)
        cur = cur.parent
    return None

def parse_charts_from_page(page_url: str, html: str):
    soup = BeautifulSoup(html, "lxml")
    game = guess_game_name(soup)
    rows = []

    # Likely containers for charts
    containers = soup.select(
        ".review-graph, .review-graphs, .review-graph-container, .chart, .charts, .content"
    )
    if not containers:
        containers = [soup.body or soup]

    for cont in containers:
        # Must look like an FPS chart region
        if not re.search(r"\bFPS\b|\b\d{2,3}\.\d\b", text(cont), re.I):
            continue

        res = find_resolution_near(cont) or "unknown"
        items = cont.select(
            ".review-graph-bar, .bar, .row, li, .review-graph-legend-item, tr"
        )
        if not items:
            continue

        rank = 0
        for it in items:
            t = text(it)
            if not t:
                continue
            # Keep only lines that include a GPU family token
            if not re.search(r"\b(RTX|GTX|RX|Arc)\b", t, re.I):
                continue

            # Extract FPS value
            m = re.search(r"(\d+(?:\.\d+)?)\s*FPS\b", t, re.I)
            if m:
                fps_val = float(m.group(1))
            else:
                nums = re.findall(r"(\d+(?:\.\d+)?)", t)
                if not nums:
                    continue
                fps_val = float(nums[-1])

            # Extract GPU label (text before FPS)
            gpu = re.sub(r"(\d+(?:\.\d+)?)\s*FPS\b.*$", "", t, flags=re.I).strip()
            gpu = re.sub(r"\s{2,}", " ", gpu)

            # Require a product number after family to avoid spurious rows
            if not re.search(r"\b(RTX|GTX|RX)\s*\d", gpu, re.I) and not re.search(r"\bArc\s*A\d", gpu, re.I):
                continue

            rank += 1
            rows.append(
                {
                    "article_url": ARTICLE,
                    "page_url": page_url,
                    "page_no": None,  # filled by caller
                    "game": game,
                    "resolution": res,
                    "gpu": gpu,
                    "fps": fps_val,
                    "chart_rank": rank,
                }
            )

    return rows

def main():
    ahtml = get_html(ARTICLE)
    pages = discover_section_pages(ARTICLE, ahtml)

    all_rows = []
    for n, p in pages:
        try:
            phtml = get_html(p)  # may 404 for some section numbers
        except requests.HTTPError as e:
            # Skip missing subpages; some sections are on main page only
            if getattr(e, "response", None) is not None and e.response.status_code == 404:
                # print(f"Skip 404: {p}")
                continue
            else:
                raise
        rows = parse_charts_from_page(p, phtml)
        for r in rows:
            r["page_no"] = n
        all_rows.extend(rows)
        time.sleep(0.2)  # be polite

    df = pd.DataFrame(all_rows)
    if df.empty:
        print("No rows parsed.")
        return

    # Deduplicate and sort
    df = df.drop_duplicates(
        subset=["page_url", "resolution", "gpu"], keep="last"
    ).sort_values(
        ["page_no", "game", "resolution", "chart_rank"], ignore_index=True
    )

    out = "gainward_rtx_5060_ti_fps.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows -> {out}")

if __name__ == "__main__":
    main()