#!/usr/bin/env python3
"""
Use OpenAlex API (free, comprehensive) to find titles for remaining untitled papers.
OpenAlex indexes ~250M works including most Elsevier/ScienceDirect papers.
"""
import json, re, time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import quote, urlencode
from urllib.error import URLError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"
EMAIL = "cacndela@gmail.com"   # polite pool = faster rate limit

def get_json(url):
    try:
        req = Request(url, headers={"User-Agent": f"SRT-Database/1.0 (mailto:{EMAIL})"})
        with urlopen(req, timeout=12) as r:
            return json.loads(r.read())
    except Exception:
        return None

def pii_from_url(url):
    m = re.search(r"/pii/(S\w+)", url, re.I)
    return m.group(1) if m else None

def doi_from_url(url):
    m = re.search(r"(10\.\d{4,}/[^\s\"&?#]+)", url)
    return m.group(1).rstrip(".,)") if m else None

def openalex_by_doi(doi):
    d = get_json(f"https://api.openalex.org/works/https://doi.org/{quote(doi)}?mailto={EMAIL}")
    return _parse_oa(d)

def openalex_by_pii(pii):
    # OpenAlex stores Elsevier PIIs as alternate IDs
    d = get_json(f"https://api.openalex.org/works?filter=ids.pii:{quote(pii)}&mailto={EMAIL}")
    if d and d.get("results"):
        return _parse_oa(d["results"][0])
    return None

def openalex_by_url(url):
    # Try searching by the full URL as a location
    clean = re.sub(r'\?.*', '', url).rstrip('/')
    d = get_json(f"https://api.openalex.org/works?filter=locations.landing_page_url:{quote(clean)}&mailto={EMAIL}")
    if d and d.get("results"):
        return _parse_oa(d["results"][0])
    return None

def _parse_oa(d):
    if not d or not d.get("title"):
        return None
    authors = d.get("authorships", [])
    auth_names = [a.get("author", {}).get("display_name", "") for a in authors[:3]]
    auth_str = ", ".join(auth_names) + (" et al." if len(authors) > 3 else "") if auth_names else None
    year = d.get("publication_year")
    return {"title": d["title"], "authors": auth_str, "year": year}

def ads_search(bibcode):
    """ADS search via public endpoint — no auth needed for title lookup."""
    encoded = quote(bibcode)
    d = get_json(
        f"https://api.adsabs.harvard.edu/v1/search/query"
        f"?q=bibcode%3A{encoded}&fl=title%2Cauthor%2Cyear&rows=1"
    )
    if d:
        docs = d.get("response", {}).get("docs", [])
        if docs:
            doc = docs[0]
            titles = doc.get("title", [])
            authors = doc.get("author", [])
            return {
                "title": titles[0] if titles else None,
                "authors": ", ".join(authors[:3]) + (" et al." if len(authors) > 3 else "") if authors else None,
                "year": doc.get("year"),
            }
    return None

def ntrs_api(url):
    m = re.search(r"/citations?/(\d+)", url) or re.search(r"R=(\d+)", url)
    if not m: return None
    d = get_json(f"https://ntrs.nasa.gov/api/citations/{m.group(1)}")
    if not d: return None
    return {"title": d.get("title"), "authors": None, "year": None}

def resolve(url):
    # 1. DOI → OpenAlex (covers most journal articles)
    doi = doi_from_url(url)
    if doi:
        r = openalex_by_doi(doi); time.sleep(0.15)
        if r and r.get("title"): return r

    # 2. ScienceDirect PII → OpenAlex
    pii = pii_from_url(url)
    if pii:
        r = openalex_by_pii(pii); time.sleep(0.15)
        if r and r.get("title"): return r

    # 3. URL-based OpenAlex location search
    r = openalex_by_url(url); time.sleep(0.15)
    if r and r.get("title"): return r

    # 4. ADS for adsabs URLs
    if "adsabs" in url:
        m = re.search(r"abs/([^\s/]+)", url)
        if m:
            r = ads_search(m.group(1)); time.sleep(0.25)
            if r and r.get("title"): return r

    # 5. NTRS
    if "ntrs.nasa.gov" in url:
        r = ntrs_api(url); time.sleep(0.2)
        if r and r.get("title"): return r

    return None


def main():
    papers = json.loads(PAPERS_FILE.read_text())
    untitled = [p for p in papers if not p.get("title")]
    print(f"Untitled: {len(untitled)}")

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
            print(f"  [{i+1}/{len(untitled)}] ✓ {paper['title'][:80]}")
        else:
            print(f"  [{i+1}/{len(untitled)}] — {paper['url'][:70]}")

        if (i+1) % 25 == 0:
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
            print(f"  [saved at {i+1}]")

    papers.sort(key=lambda p: (p.get("title") is None, -(p.get("year") or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")

    final = len([p for p in papers if not p.get("title")])
    print(f"\nDone. +{enriched} titles. Still untitled: {final}/{len(papers)}")

if __name__ == "__main__":
    main()
