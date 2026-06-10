#!/usr/bin/env python3
"""
Enrich remaining untitled papers by fetching <title> from the actual page.
Falls back to extracting a readable title from the URL slug.
"""
import json
import re
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"

JUNK_TITLE_PATTERNS = [
    r'^access denied', r'^just a moment', r'^403', r'^404', r'^error',
    r'cloudflare', r'please wait', r'robot', r'captcha', r'login required',
    r'^sciencedirect$', r'^elsevier', r'^springer',
    r'scopus', r'researchgate.*academia', r'sign in',
]

def is_junk_title(title: str) -> bool:
    t = title.lower().strip()
    if len(t) < 10 or len(t) > 300:
        return True
    return any(re.search(p, t) for p in JUNK_TITLE_PATTERNS)

def title_from_url_slug(url: str) -> str | None:
    """Extract readable title from URL path slug."""
    path = re.sub(r'https?://[^/]+', '', url)
    # Find longest hyphen-separated segment
    parts = re.findall(r'/([a-z][a-z0-9-]{15,})', path, re.IGNORECASE)
    if not parts:
        return None
    longest = max(parts, key=len)
    # Convert slug to title
    words = longest.replace('-', ' ').replace('_', ' ').split()
    if len(words) < 3:
        return None
    return ' '.join(w.capitalize() for w in words)

def fetch_html_title(url: str, timeout: int = 8) -> str | None:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; SRT-Database/1.0)",
        "Accept": "text/html",
    }
    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=timeout) as resp:
            # Only read first 8KB to find <title>
            chunk = resp.read(8192).decode('utf-8', errors='ignore')
    except (URLError, HTTPError, Exception):
        return None

    m = re.search(r'<title[^>]*>(.*?)</title>', chunk, re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    title = re.sub(r'\s+', ' ', m.group(1)).strip()
    # Remove site name suffixes like " | ScienceDirect", " - PubMed", etc.
    title = re.sub(r'\s*[|\-–—]\s*(ScienceDirect|Elsevier|PubMed|Springer|IEEE|ResearchGate|NASA|ACS|Nature|IOPscience|MDPI|Wiley|Taylor|arXiv).*$', '', title, flags=re.IGNORECASE).strip()
    if is_junk_title(title):
        return None
    return title or None

def main():
    papers = json.loads(PAPERS_FILE.read_text())
    untitled = [p for p in papers if not p.get("title")]
    print(f"Remaining untitled: {len(untitled)}")

    enriched = 0
    for i, paper in enumerate(untitled):
        url = paper["url"]

        # Skip obviously truncated/bad URLs
        if any(url.endswith(s) for s in ['/science', '/sci', '/ar', '/pub', '/a', 'S00', 'S027', 'S009']):
            title = title_from_url_slug(url)
            if title:
                paper["title"] = title
                enriched += 1
                print(f"  [{i+1}] slug → {title[:60]}")
            continue

        # Try fetching the HTML page
        title = fetch_html_title(url)
        if title:
            paper["title"] = title
            enriched += 1
            print(f"  [{i+1}] html → {title[:70]}")
        else:
            # Fall back to URL slug
            slug_title = title_from_url_slug(url)
            if slug_title:
                paper["title"] = slug_title
                enriched += 1
                print(f"  [{i+1}] slug → {slug_title[:60]}")
            else:
                print(f"  [{i+1}] — {url[:60]}")

        time.sleep(0.2)

        if (i + 1) % 25 == 0:
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
            print(f"  [saved at {i+1}]")

    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
    total_titled = len([p for p in papers if p.get("title")])
    print(f"\nDone. Enriched +{enriched}. Total with title: {total_titled}/{len(papers)}")

if __name__ == "__main__":
    main()
