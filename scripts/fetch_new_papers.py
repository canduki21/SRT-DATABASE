#!/usr/bin/env python3
"""
Weekly auto-fetch: queries Semantic Scholar for papers mentioning SRT products.
Adds new papers to src/data/papers.json without duplicating existing ones.
Run by GitHub Actions every Monday.
"""
import json
import re
import sys
import time
import uuid
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError
from urllib.parse import urlencode, quote

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"

# Search terms — SRT product names that should appear in papers
SEARCH_QUERIES = [
    "LHS-1 lunar regolith simulant",
    "LMS-1 lunar mare simulant",
    "LHS-1D lunar dust simulant",
    "LMS-1D lunar dust simulant",
    "LSP-2 lunar south pole simulant",
    "MGS-1 Mars global simulant",
    "JEZ-1 Jezero delta simulant",
    "MGS-1C Mars clay simulant",
    "MGS-1S Mars sulfate simulant",
    "CI-E carbonaceous chondrite simulant",
    "CM-E carbonaceous chondrite simulant",
    "Exolith Lab simulant LHS",
    "Exolith Lab simulant LMS",
    "CLASS lunar simulant LHS-1",
]

SIMULANT_IDS = [
    "LHS-1-25A","LHS-1E","LHS-1D","LHS-1","LMS-1E","LMS-1D","LMS-1",
    "LSP-2","LHS-2","LMS-2","MGS-1C","MGS-1S","MGS-1","JEZ-1","CI-E","CM-E","MMS-1","MMS-2",
]
LUNAR_SIMS  = {"LHS-1","LHS-2","LHS-1E","LHS-1D","LHS-1-25A","LSP-2","LMS-1","LMS-2","LMS-1E","LMS-1D"}
MART_SIMS   = {"MGS-1","MGS-1C","MGS-1S","JEZ-1","MMS-1","MMS-2"}
AST_SIMS    = {"CI-E","CM-E"}


def detect_simulants(text: str) -> list[str]:
    found = []
    for s in SIMULANT_IDS:
        if re.search(r'\b' + re.escape(s) + r'\b', text, re.IGNORECASE):
            if s not in found:
                found.append(s)
    return found


def detect_category(text: str, simulants: list[str]) -> str:
    sim_set = set(simulants)
    cats = [c for c, g in [("lunar", sim_set & LUNAR_SIMS), ("martian", sim_set & MART_SIMS), ("asteroid", sim_set & AST_SIMS)] if g]
    if len(cats) == 1: return cats[0]
    if len(cats) > 1:  return "multi"
    t = text.lower()
    if "lunar" in t or "moon" in t:   return "lunar"
    if "mars" in t or "martian" in t: return "martian"
    if "asteroid" in t:               return "asteroid"
    return "general"


def semantic_scholar_search(query: str, limit: int = 20) -> list[dict]:
    params = urlencode({
        "query": query,
        "fields": "title,authors,year,externalIds,abstract",
        "limit": limit,
    })
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?{params}"
    req = Request(url, headers={"User-Agent": "SRT-Database/1.0"})
    try:
        with urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())["data"]
    except (URLError, KeyError, json.JSONDecodeError) as e:
        print(f"  Warning: query failed ({e})", file=sys.stderr)
        return []


def paper_url(paper: dict) -> str | None:
    ext = paper.get("externalIds") or {}
    if doi := ext.get("DOI"):
        return f"https://doi.org/{doi}"
    if arxiv := ext.get("ArXiv"):
        return f"https://arxiv.org/abs/{arxiv}"
    if pmid := ext.get("PubMed"):
        return f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
    return None


def main():
    papers = json.loads(PAPERS_FILE.read_text())
    existing_urls = {p["url"].lower().rstrip("/") for p in papers}
    new_count = 0

    for query in SEARCH_QUERIES:
        print(f"Searching: {query}", file=sys.stderr)
        results = semantic_scholar_search(query)
        time.sleep(0.5)  # polite rate limit

        for r in results:
            url = paper_url(r)
            if not url:
                continue
            norm = url.lower().rstrip("/")
            if norm in existing_urls:
                continue

            title  = r.get("title") or ""
            abstract = r.get("abstract") or ""
            blob   = title + " " + abstract
            simulants = detect_simulants(blob)
            category  = detect_category(blob, simulants)

            authors_list = r.get("authors") or []
            authors = ", ".join(a.get("name","") for a in authors_list[:3])
            if len(authors_list) > 3:
                authors += " et al."

            papers.append({
                "id":       str(uuid.uuid4()),
                "title":    title or None,
                "authors":  authors or None,
                "year":     r.get("year"),
                "url":      url,
                "keywords": [],
                "simulants": simulants,
                "category": category,
                "source":   "auto-fetch",
                "added_at": __import__("datetime").date.today().isoformat(),
            })
            existing_urls.add(norm)
            new_count += 1
            print(f"  + {title[:70]}", file=sys.stderr)

    papers.sort(key=lambda p: (p["title"] is None, -(p["year"] or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
    print(f"Done. Added {new_count} new papers. Total: {len(papers)}", file=sys.stderr)

    # Output summary for GitHub Actions step summary
    print(f"new={new_count}")
    print(f"total={len(papers)}")


if __name__ == "__main__":
    main()
