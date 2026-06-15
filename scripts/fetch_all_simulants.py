#!/usr/bin/env python3
"""
Comprehensive fetch: searches OpenAlex + Semantic Scholar for all SRT simulants.
Adds new papers to src/data/papers.json without duplicating existing ones.
"""
import json, re, sys, time, uuid
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote
from urllib.error import URLError
from datetime import date

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"
EMAIL = "cacndela@gmail.com"

# ── Search queries ─────────────────────────────────────────────────────────────
QUERIES = [
    # LHS-1 family
    "LHS-1 lunar highland simulant",
    '"LHS-1" regolith simulant',
    '"LHS-1E" lunar simulant',
    '"LHS-1D" lunar dust simulant',
    '"LHS-1-25A" simulant',
    # LMS family
    '"LMS-1" lunar mare simulant',
    '"LMS-1E" lunar simulant',
    '"LMS-1D" lunar dust',
    '"LMS-2" lunar simulant',
    # LSP
    '"LSP-2" lunar south pole simulant',
    '"LSP-2" simulant',
    # MGS
    '"MGS-1" Mars global simulant',
    '"MGS-1C" Mars clay simulant',
    '"MGS-1S" Mars sulfate simulant',
    # JEZ
    '"JEZ-1" Jezero simulant',
    '"JEZ-1" Mars simulant',
    # Asteroid
    '"CI-E" carbonaceous chondrite simulant',
    '"CM-E" carbonaceous chondrite simulant',
    '"CI-E" asteroid simulant',
    '"CM-E" asteroid simulant',
    # Exolith Lab generic
    "Exolith Lab lunar simulant",
    "Exolith Lab Mars simulant",
    "Exolith Lab asteroid simulant",
    "CLASS lunar simulant LHS",
    "Exolith simulant regolith",
    # Broader Exolith/SRT
    "lunar regolith simulant Exolith",
    "Mars regolith simulant Exolith",
    # Catch extra simulants from older searches
    "LHS-1 regolith construction",
    "LMS-1 regolith geotechnical",
    "MGS-1 Mars regolith characterization",
    "JEZ-1 Jezero delta regolith",
]

SIMULANT_IDS = [
    "LHS-1-25A","LHS-1E","LHS-1D","LHS-1",
    "LMS-1E","LMS-1D","LMS-1","LMS-2",
    "LSP-2","LHS-2",
    "MGS-1C","MGS-1S","MGS-1","JEZ-1",
    "MMS-1","MMS-2",
    "CI-E","CM-E",
]
LUNAR_SIMS = {"LHS-1","LHS-2","LHS-1E","LHS-1D","LHS-1-25A","LSP-2","LMS-1","LMS-2","LMS-1E","LMS-1D"}
MART_SIMS  = {"MGS-1","MGS-1C","MGS-1S","JEZ-1","MMS-1","MMS-2"}
AST_SIMS   = {"CI-E","CM-E"}

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_json(url):
    try:
        req = Request(url, headers={"User-Agent": f"SRT-Database/1.0 (mailto:{EMAIL})"})
        with urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  [warn] {e}", file=sys.stderr)
        return None

def detect_simulants(text: str) -> list[str]:
    found = []
    for s in SIMULANT_IDS:
        if re.search(r'\b' + re.escape(s) + r'\b', text, re.IGNORECASE):
            if s not in found:
                found.append(s)
    # Also catch "Exolith" mentions and map to specific simulants where possible
    return found

def detect_category(text: str, simulants: list[str]) -> str:
    sim_set = set(simulants)
    cats = [c for c, g in [("lunar", sim_set & LUNAR_SIMS),
                            ("martian", sim_set & MART_SIMS),
                            ("asteroid", sim_set & AST_SIMS)] if g]
    if len(cats) == 1: return cats[0]
    if len(cats) > 1:  return "multi"
    t = text.lower()
    if any(w in t for w in ["lunar","moon","luna","lhs","lms","lsp"]): return "lunar"
    if any(w in t for w in ["mars","martian","mgs","jez"]):            return "martian"
    if any(w in t for w in ["asteroid","chondrite","ci-e","cm-e"]):    return "asteroid"
    return "general"

def norm_url(url: str) -> str:
    return url.lower().rstrip("/").replace("https://", "http://")

# ── Semantic Scholar ──────────────────────────────────────────────────────────
def semantic_scholar(query: str, limit=25) -> list[dict]:
    params = urlencode({"query": query,
                        "fields": "title,authors,year,externalIds,abstract",
                        "limit": limit})
    data = get_json(f"https://api.semanticscholar.org/graph/v1/paper/search?{params}")
    time.sleep(0.6)
    return (data or {}).get("data", [])

def ss_url(paper: dict) -> str | None:
    ext = paper.get("externalIds") or {}
    if doi := ext.get("DOI"):   return f"https://doi.org/{doi}"
    if arx := ext.get("ArXiv"): return f"https://arxiv.org/abs/{arx}"
    if pm  := ext.get("PubMed"):return f"https://pubmed.ncbi.nlm.nih.gov/{pm}/"
    return None

# ── OpenAlex ──────────────────────────────────────────────────────────────────
def reconstruct_abstract(idx):
    if not idx: return ""
    words = {}
    for word, positions in idx.items():
        for pos in positions:
            words[pos] = word
    return " ".join(words[i] for i in sorted(words))

def openalex_search(query: str, per_page=25) -> list[dict]:
    params = urlencode({"search": query, "per-page": per_page,
                        "select": "id,doi,title,authorships,publication_year,abstract_inverted_index,keywords,primary_location",
                        "mailto": EMAIL})
    data = get_json(f"https://api.openalex.org/works?{params}")
    time.sleep(0.4)
    return (data or {}).get("results", [])

def parse_oa_work(w: dict) -> dict | None:
    title = w.get("title") or ""
    if not title: return None

    doi = (w.get("doi") or "").replace("https://doi.org/", "")
    url = f"https://doi.org/{doi}" if doi else (
          (w.get("primary_location") or {}).get("landing_page_url") or "")
    if not url: return None

    authors_raw = w.get("authorships", [])
    names = [a.get("author", {}).get("display_name", "") for a in authors_raw[:3]]
    authors = ", ".join(n for n in names if n)
    if len(authors_raw) > 3: authors += " et al."

    abstract = reconstruct_abstract(w.get("abstract_inverted_index"))
    year = w.get("publication_year")
    keywords = [k.get("display_name","") for k in (w.get("keywords") or [])[:12]]

    return {"title": title, "authors": authors or None, "year": year,
            "url": url, "abstract": abstract, "keywords": keywords}

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    papers = json.loads(PAPERS_FILE.read_text())
    existing_urls = {norm_url(p["url"]) for p in papers}
    new_count = 0
    today = date.today().isoformat()

    def try_add(title, authors, year, url, abstract, keywords):
        nonlocal new_count
        if not url: return
        nu = norm_url(url)
        if nu in existing_urls: return

        blob = f"{title} {abstract}"
        simulants = detect_simulants(blob)
        category  = detect_category(blob, simulants)

        papers.append({
            "id":        str(uuid.uuid4()),
            "title":     title or None,
            "authors":   authors or None,
            "year":      year,
            "url":       url,
            "keywords":  keywords or [],
            "simulants": simulants,
            "category":  category,
            "source":    "auto-fetch",
            "added_at":  today,
        })
        existing_urls.add(nu)
        new_count += 1
        sim_str = f" [{','.join(simulants)}]" if simulants else ""
        print(f"  + {(title or url)[:75]}{sim_str}", file=sys.stderr)

    for i, query in enumerate(QUERIES):
        print(f"\n[{i+1}/{len(QUERIES)}] OpenAlex: {query}", file=sys.stderr)
        for w in openalex_search(query):
            parsed = parse_oa_work(w)
            if parsed:
                try_add(**parsed)

        print(f"[{i+1}/{len(QUERIES)}] SemanticScholar: {query}", file=sys.stderr)
        for r in semantic_scholar(query):
            url = ss_url(r)
            if not url: continue
            title    = r.get("title") or ""
            abstract = r.get("abstract") or ""
            a_list   = r.get("authors") or []
            authors  = ", ".join(a.get("name","") for a in a_list[:3])
            if len(a_list) > 3: authors += " et al."
            try_add(title, authors or None, r.get("year"), url, abstract, [])

        # Save every 5 queries
        if (i+1) % 5 == 0:
            papers.sort(key=lambda p: (p["title"] is None, -(p.get("year") or 0)))
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
            print(f"  [checkpoint saved — {new_count} new so far]", file=sys.stderr)

    papers.sort(key=lambda p: (p["title"] is None, -(p.get("year") or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
    print(f"\nDone. Added {new_count} new papers. Total: {len(papers)}", file=sys.stderr)

if __name__ == "__main__":
    main()
