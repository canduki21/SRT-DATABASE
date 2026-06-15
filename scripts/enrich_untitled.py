#!/usr/bin/env python3
"""
Aggressive title enrichment for stubborn untitled papers.
Handles: MDPI, ESSOar, preprints.org, ADS bibcodes, Heliyon/Cell PDFs,
         ResearchGate, USRA/LPSC PDFs, repository URLs, ChemRxiv, etc.
"""
import json, re, sys, time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote, urlparse
from urllib.error import URLError, HTTPError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"
EMAIL = "cacndela@gmail.com"

def get_json(url, timeout=12):
    try:
        req = Request(url, headers={"User-Agent": f"SRT-Database/1.0 (mailto:{EMAIL})"})
        with urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None

def get_html(url, timeout=12):
    try:
        req = Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; SRT-Database/1.0)",
            "Accept": "text/html,application/xhtml+xml",
        })
        with urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception:
        return None

# ── DOI helpers ───────────────────────────────────────────────────────────────
def fetch_by_doi(doi: str) -> dict | None:
    doi = doi.strip().rstrip(".,)")
    # OpenAlex
    d = get_json(f"https://api.openalex.org/works/https://doi.org/{quote(doi)}?mailto={EMAIL}")
    if d and d.get("title"):
        return parse_oa(d)
    time.sleep(0.2)
    # CrossRef
    d = get_json(f"https://api.crossref.org/works/{quote(doi)}")
    if d:
        m = d.get("message", {})
        title = (m.get("title") or [""])[0]
        if title:
            authors = parse_cr_authors(m)
            return {"title": title, "authors": authors, "year": cr_year(m)}
    return None

def doi_from_url(url: str) -> str | None:
    m = re.search(r"(10\.\d{4,}/[^\s\"&?#>]+)", url)
    return m.group(1).rstrip(".,)") if m else None

def parse_oa(d: dict) -> dict | None:
    if not d or not d.get("title"): return None
    auths = [a.get("author", {}).get("display_name", "") for a in d.get("authorships", [])[:3]]
    auth_str = ", ".join(a for a in auths if a)
    if len(d.get("authorships", [])) > 3: auth_str += " et al."
    return {"title": d["title"], "authors": auth_str or None, "year": d.get("publication_year")}

def parse_cr_authors(m: dict) -> str | None:
    raw = m.get("author", [])
    names = [" ".join(filter(None,[a.get("given",""), a.get("family","")])) for a in raw[:3]]
    if not names: return None
    s = ", ".join(names)
    return s + (" et al." if len(raw) > 3 else "")

def cr_year(m: dict) -> int | None:
    try: return m["published"]["date-parts"][0][0]
    except Exception: return None

# ── Semantic Scholar ──────────────────────────────────────────────────────────
def ss_by_doi(doi: str) -> dict | None:
    d = get_json(f"https://api.semanticscholar.org/graph/v1/paper/DOI:{quote(doi)}?fields=title,authors,year")
    if d and d.get("title"):
        auths = [a.get("name","") for a in (d.get("authors") or [])[:3]]
        auth_str = ", ".join(auths) + (" et al." if len(d.get("authors",[])) > 3 else "")
        return {"title": d["title"], "authors": auth_str or None, "year": d.get("year")}
    return None

def ss_by_url(url: str) -> dict | None:
    d = get_json(f"https://api.semanticscholar.org/graph/v1/paper/URL:{quote(url)}?fields=title,authors,year")
    if d and d.get("title"):
        auths = [a.get("name","") for a in (d.get("authors") or [])[:3]]
        auth_str = ", ".join(auths) + (" et al." if len(d.get("authors",[])) > 3 else "")
        return {"title": d["title"], "authors": auth_str or None, "year": d.get("year")}
    return None

# ── HTML title scrape ─────────────────────────────────────────────────────────
def scrape_title(url: str) -> str | None:
    html = get_html(url)
    if not html: return None
    # <title> tag
    m = re.search(r'<title[^>]*>([^<]{10,300})</title>', html, re.I)
    if m:
        t = re.sub(r'\s+', ' ', m.group(1)).strip()
        # Strip site suffixes
        for sep in [' | ', ' - ', ' – ', ' :: ', ' — ']:
            if sep in t:
                parts = t.split(sep)
                t = max(parts, key=len).strip()
        if len(t) > 15:
            return t
    # og:title
    m2 = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']{10,})["\']', html, re.I)
    if m2: return re.sub(r'\s+',' ',m2.group(1)).strip()
    return None

# ── MDPI DOI constructor ──────────────────────────────────────────────────────
MDPI_ISSN_TO_ABBR = {
    "2075-183X": "min", "2075-4701": "met", "2076-3417": "app",
    "1996-1944": "ma",  "2073-4360": "polymers", "2227-9717": "pr",
    "1996-1073": "en",  "2072-4292": "rs",  "2072-6643": "nu",
    "2218-1989": "metabo", "2079-6382": "antibiotics", "2075-4418": "diagnostics",
    "2073-4344": "catal", "2079-3197": "computation",
}

def mdpi_doi(url: str) -> str | None:
    # https://www.mdpi.com/2075-183X/13/1/79
    m = re.match(r"https?://www\.mdpi\.com/(\d{4}-\d{3,4}[Xx]?)/(\d+)/(\d+)/(\d+)", url)
    if not m:
        # https://www.mdpi.com/journal/minerals/articles/...
        return None
    issn, vol, iss, art = m.groups()
    abbr = MDPI_ISSN_TO_ABBR.get(issn)
    if abbr:
        return f"10.3390/{abbr}{vol}{int(iss):02d}{int(art):04d}"
    # Generic MDPI DOI — try CrossRef URL resolution
    return None

# ── URL-specific resolvers ────────────────────────────────────────────────────
def resolve(url: str) -> dict | None:
    parsed = urlparse(url)
    host = parsed.netloc.lower()

    # 1. DOI in URL (catches doi.org, essopenarchive, many publishers)
    doi = doi_from_url(url)
    if doi:
        r = fetch_by_doi(doi); time.sleep(0.2)
        if r: return r
        r = ss_by_doi(doi); time.sleep(0.2)
        if r: return r

    # 2. MDPI — construct DOI from URL structure
    if "mdpi.com" in host:
        doi = mdpi_doi(url)
        if doi:
            r = fetch_by_doi(doi); time.sleep(0.2)
            if r: return r

    # 3. preprints.org  → doi pattern 10.20944/preprints{YYYYMM}.{NNNN}.v{N}
    if "preprints.org" in host:
        m = re.search(r"/manuscript/(\d{6}\.\d+)/v(\d+)", url)
        if m:
            doi = f"10.20944/preprints{m.group(1)}.v{m.group(2)}"
            r = fetch_by_doi(doi); time.sleep(0.2)
            if r: return r

    # 4. ChemRxiv
    if "chemrxiv.org" in host:
        m = re.search(r"article-details/([a-f0-9]+)", url)
        if m:
            d = get_json(f"https://chemrxiv.org/engage/chemrxiv/public-api/v1/items/{m.group(1)}")
            if d:
                title = d.get("title","").strip()
                if title:
                    auths = [a.get("displayName","") for a in d.get("authors",[])[:3]]
                    return {"title": title, "authors": ", ".join(a for a in auths if a) or None,
                            "year": None}

    # 5. ADS (adsabs.harvard.edu) — use public search, no auth required for title
    if "adsabs.harvard.edu" in host:
        m = re.search(r"/abs/([^/\s?#]+)", url)
        if m:
            bibcode = m.group(1)
            r = _ads_search(bibcode); time.sleep(0.3)
            if r: return r

    # 6. Semantic Scholar URL lookup
    r = ss_by_url(url); time.sleep(0.4)
    if r: return r

    # 7. Cell/Heliyon PDF — extract PII and try OpenAlex
    if "heliyon" in host or "cell.com" in url:
        m = re.search(r"(S\d{4}-\d{4}\(\d{2}\)\d{5}-\w)", url)
        if m:
            pii = m.group(1)
            d = get_json(f"https://api.openalex.org/works?filter=ids.pii:{quote(pii)}&mailto={EMAIL}")
            if d and d.get("results"):
                r = parse_oa(d["results"][0])
                if r: return r

    # 8. Research Square
    if "researchsquare.com" in host:
        m = re.search(r"/files/(rs-\d+)/", url)
        if m:
            slug = m.group(1)
            d = get_json(f"https://www.researchsquare.com/article/{slug}/v1.json")
            if d:
                title = (d.get("article") or {}).get("title") or (d.get("manuscript") or {}).get("title")
                if title:
                    return {"title": title.strip(), "authors": None, "year": None}

    # 9. HTML scrape as last resort (skip large PDFs)
    if not url.endswith(".pdf"):
        title = scrape_title(url); time.sleep(0.5)
        if title and len(title) > 20:
            return {"title": title, "authors": None, "year": None}

    return None

def _ads_search(bibcode: str) -> dict | None:
    # Public NASA ADS — use the UI search API (no token needed for basic fields)
    encoded = quote(bibcode)
    url = f"https://ui.adsabs.harvard.edu/v1/search/query?q=bibcode%3A{encoded}&fl=title%2Cauthor%2Cyear&rows=1"
    d = get_json(url)
    if d:
        docs = (d.get("response") or {}).get("docs", [])
        if docs:
            doc = docs[0]
            titles = doc.get("title", [])
            authors = doc.get("author", [])
            year_raw = doc.get("year")
            auth_str = ", ".join(authors[:3]) + (" et al." if len(authors) > 3 else "") if authors else None
            return {
                "title": titles[0] if titles else None,
                "authors": auth_str,
                "year": int(year_raw) if year_raw else None,
            }
    # Fallback: HTML scrape of ADS abstract page
    html = get_html(f"https://ui.adsabs.harvard.edu/abs/{quote(bibcode)}/abstract")
    if html:
        m = re.search(r'"title"\s*:\s*\["([^"]{10,})"\]', html)
        if m: return {"title": m.group(1), "authors": None, "year": None}
    return None

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    papers = json.loads(PAPERS_FILE.read_text())
    untitled = [p for p in papers if not p.get("title")]
    print(f"Untitled: {len(untitled)}", file=sys.stderr)

    enriched = 0
    for i, paper in enumerate(untitled):
        url = paper["url"]
        print(f"  [{i+1}/{len(untitled)}] {url[:70]}", end="  ", file=sys.stderr)
        sys.stderr.flush()

        result = resolve(url)
        if result and result.get("title"):
            paper["title"] = result["title"].strip()
            if not paper.get("authors") and result.get("authors"):
                paper["authors"] = result["authors"]
            if not paper.get("year") and result.get("year"):
                try: paper["year"] = int(result["year"])
                except: pass
            enriched += 1
            print(f"✓ {paper['title'][:60]}", file=sys.stderr)
        else:
            print("—", file=sys.stderr)

        if (i + 1) % 10 == 0:
            papers.sort(key=lambda p: (p.get("title") is None, -(p.get("year") or 0)))
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
            print(f"  [saved at {i+1}]", file=sys.stderr)

    papers.sort(key=lambda p: (p.get("title") is None, -(p.get("year") or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")

    still = len([p for p in papers if not p.get("title")])
    print(f"\nDone. +{enriched} titles resolved. Still untitled: {still}/{len(papers)}", file=sys.stderr)

if __name__ == "__main__":
    main()
