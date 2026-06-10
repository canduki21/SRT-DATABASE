#!/usr/bin/env python3
"""
Enrich papers missing titles by querying Semantic Scholar.
Tries to resolve DOI/URL → title, authors, year.
"""
import json
import re
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote
from urllib.error import URLError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"

def doi_from_url(url: str) -> str | None:
    m = re.search(r'10\.\d{4,}/[^\s"&?]+', url)
    return m.group(0).rstrip('.,)') if m else None

def ss_by_doi(doi: str) -> dict | None:
    url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{quote(doi)}?fields=title,authors,year"
    req = Request(url, headers={"User-Agent": "SRT-Database/1.0"})
    try:
        with urlopen(req, timeout=10) as r:
            d = json.loads(r.read())
            return d if d.get("title") else None
    except Exception:
        return None

def ss_by_url(paper_url: str) -> dict | None:
    # Search by URL as query
    clean = re.sub(r'https?://(www\.)?', '', paper_url).rstrip('/')
    params = urlencode({"query": clean[:120], "fields": "title,authors,year", "limit": 3})
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?{params}"
    req = Request(url, headers={"User-Agent": "SRT-Database/1.0"})
    try:
        with urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            results = data.get("data", [])
            return results[0] if results and results[0].get("title") else None
    except Exception:
        return None

def format_authors(authors_list: list) -> str | None:
    if not authors_list:
        return None
    names = [a.get("name", "") for a in authors_list[:3]]
    s = ", ".join(names)
    if len(authors_list) > 3:
        s += " et al."
    return s or None

def main():
    papers = json.loads(PAPERS_FILE.read_text())
    untitled = [p for p in papers if not p.get("title")]
    print(f"Papers without titles: {len(untitled)} / {len(papers)}")

    enriched = 0
    for i, paper in enumerate(untitled):
        url = paper["url"]
        result = None

        # Try DOI first (most reliable)
        doi = doi_from_url(url)
        if doi:
            result = ss_by_doi(doi)
            time.sleep(0.3)

        # Fall back to URL search
        if not result:
            result = ss_by_url(url)
            time.sleep(0.4)

        if result and result.get("title"):
            paper["title"] = result["title"]
            if not paper.get("authors") and result.get("authors"):
                paper["authors"] = format_authors(result["authors"])
            if not paper.get("year") and result.get("year"):
                paper["year"] = result["year"]
            enriched += 1
            print(f"  [{i+1}/{len(untitled)}] ✓ {result['title'][:70]}")
        else:
            print(f"  [{i+1}/{len(untitled)}] — no title found for {url[:60]}")

        if (i + 1) % 20 == 0:
            # Save progress periodically
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
            print(f"  [saved progress at {i+1}]")

    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
    print(f"\nDone. Enriched {enriched} / {len(untitled)} untitled papers.")

if __name__ == "__main__":
    main()
