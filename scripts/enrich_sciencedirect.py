#!/usr/bin/env python3
"""
Targeted enrichment for ScienceDirect, MDPI, NASA NTRS, ADS, and ResearchGate
papers that couldn't be fetched earlier.
"""
import json, re, time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import quote, urlencode
from urllib.error import URLError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"

def get_json(url, headers=None):
    h = {"User-Agent": "SRT-Database/1.0 (mailto:cacndela@gmail.com)"}
    if headers: h.update(headers)
    try:
        with urlopen(Request(url, headers=h), timeout=12) as r:
            return json.loads(r.read())
    except Exception:
        return None

def clean(t):
    if not t: return None
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'\s*[|\-–—]\s*(ScienceDirect|Elsevier|MDPI|Springer|IEEE|Nature|IOPscience|ResearchGate|NASA).*$', '', t, re.I).strip()
    if len(t) < 10 or re.search(r'^(access denied|just a moment|403|404|sign in|login|error|cookie)', t, re.I):
        return None
    return t or None

# ── Semantic Scholar by URL (most reliable for SD) ────────────────────────────
def ss_by_url(url):
    params = urlencode({"url": url, "fields": "title,authors,year"})
    d = get_json(f"https://api.semanticscholar.org/graph/v1/paper/URL:{quote(url, safe='')}?fields=title,authors,year")
    if d and d.get("title"):
        authors = [a.get("name","") for a in (d.get("authors") or [])[:3]]
        auth_str = ", ".join(authors) + (" et al." if len(d.get("authors",[]))>3 else "") if authors else None
        return {"title": d["title"], "authors": auth_str, "year": d.get("year")}
    return None

# ── CrossRef by DOI ───────────────────────────────────────────────────────────
def crossref(doi):
    d = get_json(f"https://api.crossref.org/works/{quote(doi)}")
    if not d: return None
    msg = d.get("message", {})
    titles = msg.get("title") or []
    if not titles: return None
    authors = msg.get("author", [])
    auth_str = None
    if authors:
        names = [f"{a.get('given','')} {a.get('family','')}".strip() for a in authors[:3]]
        auth_str = ", ".join(names) + (" et al." if len(authors)>3 else "")
    year = None
    if msg.get("published"):
        parts = msg["published"].get("date-parts",[[]])[0]
        if parts: year = parts[0]
    return {"title": titles[0], "authors": auth_str, "year": year}

def doi_from_url(url):
    m = re.search(r"(10\.\d{4,}/[^\s\"&?#]+)", url)
    return m.group(1).rstrip(".,)") if m else None

# ── Unpaywall (finds open-access metadata for any DOI) ───────────────────────
def unpaywall(doi):
    d = get_json(f"https://api.unpaywall.org/v2/{quote(doi)}?email=cacndela@gmail.com")
    if not d: return None
    title = d.get("title")
    year  = d.get("year")
    return {"title": title, "authors": None, "year": year} if title else None

# ── NASA NTRS ─────────────────────────────────────────────────────────────────
def ntrs(url):
    m = re.search(r"/citations?/(\d+)", url) or re.search(r"R=(\d+)", url)
    if not m: return None
    d = get_json(f"https://ntrs.nasa.gov/api/citations/{m.group(1)}")
    return {"title": d.get("title"), "authors": None, "year": None} if d and d.get("title") else None

# ── ADS ───────────────────────────────────────────────────────────────────────
def ads(url):
    m = re.search(r"abs/([^\s/]+)", url)
    if not m: return None
    bibcode = m.group(1)
    # ADS public API — no token needed for basic queries
    d = get_json(f"https://ui.adsabs.harvard.edu/abs/{bibcode}/abstract",
                 headers={"Accept": "application/json"})
    # Fallback: search endpoint
    d2 = get_json(
        f"https://api.adsabs.harvard.edu/v1/search/query?"
        f"q=identifier:{quote(bibcode)}&fl=title,author,year&rows=1"
    )
    if d2:
        docs = d2.get("response", {}).get("docs", [])
        if docs:
            doc = docs[0]
            titles = doc.get("title", [])
            authors = doc.get("author", [])
            return {
                "title": titles[0] if titles else None,
                "authors": ", ".join(authors[:3]) + (" et al." if len(authors)>3 else "") if authors else None,
                "year": doc.get("year"),
            }
    return None

# ── MDPI ──────────────────────────────────────────────────────────────────────
def mdpi_fetch(url):
    # MDPI DOIs follow pattern 10.3390/...
    doi = doi_from_url(url)
    if doi:
        r = crossref(doi)
        if r and r.get("title"): return r
    # Parse DOI from MDPI URL pattern: /2075-163X/13/1/79 → 10.3390/min13010079
    m = re.search(r"mdpi\.com/(\d{4}-\d{4}[A-Z]?)/(\d+)/(\d+)/(\d+)", url)
    if m:
        # MDPI DOI: 10.3390/{short_journal}{vol}{zeroed_issue}{zeroed_art}
        # Just try fetching the page with html title
        pass
    try:
        h = {"User-Agent": "Mozilla/5.0 (compatible; bot)","Accept": "text/html"}
        with urlopen(Request(url, headers=h), timeout=10) as r:
            html = r.read(8192).decode("utf-8", errors="ignore")
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I|re.S)
        return {"title": clean(m.group(1)), "authors": None, "year": None} if m else None
    except Exception:
        return None

# ── ResearchGate ──────────────────────────────────────────────────────────────
def rg_from_url(url):
    m = re.search(r"/publication/(\d+)_([^/?#\s]+)", url)
    if not m: return None
    slug = m.group(2).replace("_", " ").replace("-", " ")
    # Title from slug: capitalize meaningful words
    title = " ".join(w.capitalize() for w in slug.split())
    return {"title": title, "authors": None, "year": None} if len(title) > 20 else None

# ── Dispatch ──────────────────────────────────────────────────────────────────
def resolve(url):
    results = []

    # 1. CrossRef (best quality)
    doi = doi_from_url(url)
    if doi:
        r = crossref(doi); time.sleep(0.25)
        if r and r.get("title"): results.append(r)

    # 2. Unpaywall (great for SD/Elsevier)
    if doi and not results:
        r = unpaywall(doi); time.sleep(0.25)
        if r and r.get("title"): results.append(r)

    # 3. Semantic Scholar URL lookup
    if not results:
        r = ss_by_url(url); time.sleep(0.35)
        if r and r.get("title"): results.append(r)

    # 4. Domain-specific
    if not results:
        if "ntrs.nasa.gov" in url:
            r = ntrs(url); time.sleep(0.3)
            if r and r.get("title"): results.append(r)
        elif "adsabs" in url or "ui.adsabs" in url:
            r = ads(url); time.sleep(0.4)
            if r and r.get("title"): results.append(r)
        elif "mdpi.com" in url:
            r = mdpi_fetch(url); time.sleep(0.3)
            if r and r.get("title"): results.append(r)
        elif "researchgate.net/publication/" in url:
            r = rg_from_url(url)
            if r and r.get("title"): results.append(r)

    return results[0] if results else None


def main():
    papers = json.loads(PAPERS_FILE.read_text())
    untitled = [p for p in papers if not p.get("title")]
    print(f"Untitled papers: {len(untitled)}")

    enriched = 0
    for i, paper in enumerate(untitled):
        result = resolve(paper["url"])
        if result and result.get("title"):
            paper["title"] = result["title"]
            if not paper.get("authors") and result.get("authors"):
                paper["authors"] = result["authors"]
            if not paper.get("year") and result.get("year"):
                try: paper["year"] = int(result["year"])
                except: pass
            enriched += 1
            print(f"  [{i+1}/{len(untitled)}] ✓ {paper['title'][:75]}")
        else:
            print(f"  [{i+1}/{len(untitled)}] — {paper['url'][:70]}")

        if (i+1) % 20 == 0:
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False)+"\n")
            print(f"  [saved at {i+1}]")

    papers.sort(key=lambda p: (p.get("title") is None, -(p.get("year") or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False)+"\n")

    final_untitled = len([p for p in papers if not p.get("title")])
    print(f"\nDone. +{enriched} titles. Still untitled: {final_untitled}/{len(papers)}")

if __name__ == "__main__":
    main()
