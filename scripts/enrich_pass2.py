#!/usr/bin/env python3
"""
Second-pass enricher targeting specific stubborn URL patterns:
ResearchGate pub IDs, ADS bibcodes, Heliyon PDFs, MDPI, ESSOar, ChemRxiv.
"""
import json, re, sys, time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import quote, urlencode
from urllib.error import URLError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"
EMAIL = "cacndela@gmail.com"

def get_json(url, timeout=14):
    try:
        req = Request(url, headers={"User-Agent": f"SRT-Database/1.0 (mailto:{EMAIL})"})
        with urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None

def get_html(url, timeout=14):
    try:
        req = Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return raw.decode("utf-8", errors="replace")
    except Exception:
        return None

def ss_by_id(pub_id: str) -> dict | None:
    """Semantic Scholar by publication ID (numeric RG IDs often match)."""
    d = get_json(f"https://api.semanticscholar.org/graph/v1/paper/{pub_id}?fields=title,authors,year")
    if d and d.get("title"):
        return _ss_parse(d)
    return None

def ss_by_url(url: str) -> dict | None:
    d = get_json(f"https://api.semanticscholar.org/graph/v1/paper/URL:{quote(url,safe='')}?fields=title,authors,year")
    if d and d.get("title"):
        return _ss_parse(d)
    return None

def _ss_parse(d):
    auths = [a.get("name","") for a in (d.get("authors") or [])[:3]]
    s = ", ".join(a for a in auths if a)
    if len(d.get("authors",[]))>3: s+=" et al."
    return {"title": d["title"], "authors": s or None, "year": d.get("year")}

def oa_by_doi(doi: str) -> dict | None:
    d = get_json(f"https://api.openalex.org/works/https://doi.org/{quote(doi)}?mailto={EMAIL}")
    if d and d.get("title"):
        auths = [a.get("author",{}).get("display_name","") for a in d.get("authorships",[])[:3]]
        s = ", ".join(a for a in auths if a)
        if len(d.get("authorships",[]))>3: s+=" et al."
        return {"title": d["title"], "authors": s or None, "year": d.get("publication_year")}
    return None

def cr_by_doi(doi: str) -> dict | None:
    d = get_json(f"https://api.crossref.org/works/{quote(doi)}")
    if not d: return None
    m = d.get("message",{})
    title = (m.get("title") or [""])[0]
    if not title: return None
    raw = m.get("author",[])
    names = [" ".join(filter(None,[a.get("given",""),a.get("family","")])) for a in raw[:3]]
    s = ", ".join(names) + (" et al." if len(raw)>3 else "")
    year = None
    try: year = m["published"]["date-parts"][0][0]
    except: pass
    return {"title": title, "authors": s or None, "year": year}

def fetch_doi(doi: str) -> dict | None:
    doi = doi.strip().rstrip(".,)")
    r = oa_by_doi(doi); time.sleep(0.2)
    if r: return r
    r = cr_by_doi(doi); time.sleep(0.2)
    if r: return r
    r = ss_by_id(f"DOI:{doi}"); time.sleep(0.3)
    return r

def parse_html_title(html: str) -> str | None:
    if not html: return None
    # JSON-LD
    m = re.search(r'"headline"\s*:\s*"([^"]{15,400})"', html)
    if m: return m.group(1)
    # og:title
    m = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']{15,})["\']', html, re.I)
    if m: return re.sub(r'\s+',' ', m.group(1)).strip()
    # <title>
    m = re.search(r'<title[^>]*>([^<]{15,400})</title>', html, re.I)
    if m:
        t = re.sub(r'\s+',' ', m.group(1)).strip()
        for sep in [' | ', ' - ', ' – ', ' — ', ' :: ']:
            if sep in t:
                parts = t.split(sep)
                t = max(parts, key=len).strip()
        if len(t) > 20: return t
    return None

# ── Per-pattern resolvers ─────────────────────────────────────────────────────

def resolve_researchgate(url: str) -> dict | None:
    # Extract numeric publication ID
    m = re.search(r"/publication/(\d{6,})", url) or re.search(r"/(\d{6,})$", url)
    if not m: return None
    pub_id = m.group(1)

    # Try Semantic Scholar URL lookup
    r = ss_by_url(url); time.sleep(0.4)
    if r: return r

    # Try RG API (unofficial, sometimes works)
    d = get_json(f"https://www.researchgate.net/publication/{pub_id}.json")
    if d:
        title = (d.get("data") or {}).get("title") or d.get("title")
        if title: return {"title": title, "authors": None, "year": None}

    # Try SS with numeric ID as "CorpusID"
    r = ss_by_id(f"CorpusID:{pub_id}"); time.sleep(0.3)
    if r: return r

    return None

def resolve_ads(url: str) -> dict | None:
    m = re.search(r"/abs/([^/?#\s]+)", url)
    if not m: return None
    bibcode = m.group(1)

    # Try the ADS API search endpoint (no token needed for simple queries)
    encoded = quote(bibcode)
    params = urlencode({
        "q": f"identifier:{bibcode}",
        "fl": "title,author,year",
        "rows": 1,
    })
    d = get_json(f"https://api.adsabs.harvard.edu/v1/search/query?{params}")
    if d:
        docs = (d.get("response") or {}).get("docs",[])
        if docs:
            doc = docs[0]
            titles = doc.get("title",[])
            authors = doc.get("author",[])
            year = doc.get("year")
            if titles:
                s = ", ".join(authors[:3]) + (" et al." if len(authors)>3 else "") if authors else None
                return {"title": titles[0], "authors": s, "year": int(year) if year else None}

    # HTML scrape of ADS page
    html = get_html(f"https://ui.adsabs.harvard.edu/abs/{encoded}/abstract"); time.sleep(0.5)
    if html:
        # ADS embeds structured data
        m2 = re.search(r'"name"\s*:\s*"([^"]{15,})"', html)
        if m2: return {"title": m2.group(1), "authors": None, "year": None}
        t = parse_html_title(html)
        if t and "NASA" not in t and "ADS" not in t:
            return {"title": t, "authors": None, "year": None}

    # Try Semantic Scholar URL lookup on the ADS page
    r = ss_by_url(url); time.sleep(0.3)
    return r

def resolve_heliyon(url: str) -> dict | None:
    # Cell Heliyon PDF: S2405-8440(YY)NNNNN-X.pdf
    m = re.search(r"S2405-8440\((\d{2})\)0*(\d+)-\w", url)
    if m:
        yy, art = m.groups()
        year = 2000 + int(yy)
        article_num = f"e{int(art):05d}"
        doi = f"10.1016/j.heliyon.{year}.{article_num}"
        r = fetch_doi(doi); time.sleep(0.2)
        if r: return r
        # Try without leading zero padding
        doi2 = f"10.1016/j.heliyon.{year}.e{art.lstrip('0') or '0'}"
        if doi2 != doi:
            r = fetch_doi(doi2); time.sleep(0.2)
            if r: return r
    return None

def resolve_mdpi(url: str) -> dict | None:
    # https://www.mdpi.com/ISSN/VOL/ISS/ART
    ISSN_MAP = {
        "2075-163X": "min", "2075-183X": "min",
        "2076-3417": "app", "2073-4360": "polymers",
        "1996-1044": "ma",  "1996-1944": "ma",
        "2227-9717": "pr",  "1996-1073": "en",
        "2072-4292": "rs",  "2072-6643": "nu",
        "2075-4701": "met", "2218-1989": "metabo",
        "2079-6382": "antibiotics",
    }
    m = re.match(r"https?://www\.mdpi\.com/(\d{4}-\d{3,4}[Xx]?)/(\d+)/(\d+)/(\d+)", url)
    if not m: return None
    issn, vol, iss, art = m.groups()
    abbr = ISSN_MAP.get(issn)
    if abbr:
        doi = f"10.3390/{abbr}{vol}{int(iss):02d}{int(art):04d}"
        r = fetch_doi(doi); time.sleep(0.2)
        if r: return r
    # Try Semantic Scholar URL
    r = ss_by_url(url); time.sleep(0.3)
    return r

def resolve_chemrxiv(url: str) -> dict | None:
    m = re.search(r"article-details/([a-f0-9]{24})", url)
    if not m: return None
    item_id = m.group(1)
    # ChemRxiv public API
    d = get_json(f"https://chemrxiv.org/engage/chemrxiv/public-api/v1/items/{item_id}")
    if d:
        title = d.get("title","").strip()
        if title:
            auths = [a.get("displayName","") for a in d.get("authors",[])[:3]]
            return {"title": title, "authors": ", ".join(a for a in auths if a) or None, "year": None}
    return None

def resolve_essoar(url: str) -> dict | None:
    doi_m = re.search(r"(10\.\d{4,}/[^\s\"&?#>]+)", url)
    if doi_m:
        doi = doi_m.group(1).rstrip(".,)")
        r = fetch_doi(doi); time.sleep(0.2)
        if r: return r
    return None

def resolve_researchsquare(url: str) -> dict | None:
    m = re.search(r"/files/(rs-\d+)/", url)
    if not m: return None
    slug = m.group(1)
    # Try v1 JSON
    d = get_json(f"https://www.researchsquare.com/article/{slug}/v1.json")
    if d:
        title = ((d.get("article") or {}).get("title") or
                 (d.get("manuscript") or {}).get("title"))
        if title: return {"title": title.strip(), "authors": None, "year": None}
    # Try HTML
    html = get_html(f"https://www.researchsquare.com/article/{slug}/v1"); time.sleep(0.3)
    t = parse_html_title(html)
    if t: return {"title": t, "authors": None, "year": None}
    return None

def resolve_geoscience(url: str) -> dict | None:
    doi_m = re.search(r"(10\.\d{4,}/[^\s\"&?#>]+)", url)
    if doi_m:
        r = fetch_doi(doi_m.group(1)); time.sleep(0.2)
        if r: return r
    r = ss_by_url(url); time.sleep(0.3)
    return r

def resolve_generic(url: str) -> dict | None:
    # Try Semantic Scholar
    r = ss_by_url(url); time.sleep(0.4)
    if r: return r
    # Try HTML scrape (skip PDFs)
    if not url.lower().endswith(".pdf"):
        html = get_html(url); time.sleep(0.4)
        t = parse_html_title(html)
        if t and len(t) > 20:
            return {"title": t, "authors": None, "year": None}
    return None

def resolve(url: str) -> dict | None:
    from urllib.parse import urlparse
    host = urlparse(url).netloc.lower()

    if "researchgate.net" in host:
        return resolve_researchgate(url)
    if "adsabs.harvard.edu" in host:
        return resolve_ads(url)
    if "heliyon" in url or ("cell.com" in host and "heliyon" in url):
        return resolve_heliyon(url)
    if "mdpi.com" in host:
        return resolve_mdpi(url)
    if "chemrxiv.org" in host:
        return resolve_chemrxiv(url)
    if "essopenarchive.org" in host:
        return resolve_essoar(url)
    if "researchsquare.com" in host:
        return resolve_researchsquare(url)
    if "geoscienceworld.org" in host:
        return resolve_geoscience(url)
    return resolve_generic(url)

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
            print(f"✓ {paper['title'][:65]}", file=sys.stderr)
        else:
            print("—", file=sys.stderr)

        if (i + 1) % 10 == 0:
            papers.sort(key=lambda p: (p.get("title") is None, -(p.get("year") or 0)))
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")

    papers.sort(key=lambda p: (p.get("title") is None, -(p.get("year") or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")

    still = len([p for p in papers if not p.get("title")])
    print(f"\nDone. +{enriched} titles. Still untitled: {still}/{len(papers)}", file=sys.stderr)

if __name__ == "__main__":
    main()
