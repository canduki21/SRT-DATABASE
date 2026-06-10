#!/usr/bin/env python3
"""
Final title enrichment pass:
- CrossRef API for DOIs
- NASA NTRS API
- ADS (NASA Astrophysics Data System) API
- ChemRxiv API
- MDPI / ESSOAr / ResearchGate direct HTML fetch
- Removes confirmed broken/truncated URLs
"""
import json, re, time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote
from urllib.error import URLError, HTTPError

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"

BROKEN_PATTERNS = [
    r'^https?://[^/]+/?$',                        # just domain
    r'sciencedirect\.com/science/a$',
    r'sciencedirect\.com/sc$',
    r'sciencedirect\.com/science$',
    r'sciencedirect\.com/scienc$',
    r'sciencedirect\.com/scien$',
    r'sciencedirect\.com/s$',
    r'sciencedirect\.co$',
    r'sciencedirect\.com/science66',              # garbled
    r'sciencedirect\.com/science/article/abs$',
    r'sciencedirect\.com/science/article/abs/pi$',
    r'ntrs\.nasa\.gov/citati$',
    r'ntrs\.nasa\.gov/api/citations/\d+/downloads/\w{1,8}$',  # truncated filename
    r'meetingorganizer\.cope$',
    r'cambridge\.org/core/journals/in$',
    r'pubs\.acs\.org/doi/full/10\.10$',
    r'elib\.dlr\.de/\d+/1/MA$',
    r'elib\.dlr\.de/\d+/1/LIBS2022$',
    r'cdn\.shopify\.com/s/files/1/0$',
    r'researchgate\.net/public$',
    r'researchgate\.net/publication/3624$',       # truncated ID
    r'papers\.ssrn\.com/.*\?abstract$',
    r'proquest\.com/docvie$',
    r'spiedigitallibrary\.org/conference-proceeding$',
    r'pubs\.aip\.org/aip/a$',
    r'ascelibrary\.org/doi/abs/10\.1061/%28A$',
]

def is_broken(url):
    for pat in BROKEN_PATTERNS:
        if re.search(pat, url):
            return True
    return False

# ── API helpers ────────────────────────────────────────────────────────────────

def get_json(url, headers=None):
    h = {"User-Agent": "SRT-Database/1.0 (mailto:cacndela@gmail.com)"}
    if headers: h.update(headers)
    try:
        with urlopen(Request(url, headers=h), timeout=12) as r:
            return json.loads(r.read())
    except Exception:
        return None

def fetch_html(url, timeout=10):
    h = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
         "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9"}
    try:
        with urlopen(Request(url, headers=h), timeout=timeout) as r:
            return r.read(12288).decode('utf-8', errors='ignore')
    except Exception:
        return None

JUNK = re.compile(
    r'^(access denied|just a moment|403|404|error|cloudflare|please wait|'
    r'captcha|login|sign in|sciencedirect$|elsevier|springer|scopus|'
    r'researchgate.*academia|cookie|redirect)',
    re.I
)

def clean_title(raw):
    if not raw: return None
    t = re.sub(r'\s+', ' ', raw).strip()
    # Strip site name suffixes
    t = re.sub(
        r'\s*[|\-–—:]\s*(ScienceDirect|Elsevier|PubMed|Springer|IEEE Xplore|'
        r'ResearchGate|NASA Technical Reports|ACS Publications|Nature|IOPscience|'
        r'MDPI|Wiley|Taylor.*Francis|arXiv|ESSOAr|ChemRxiv|ProQuest).*$',
        '', t, flags=re.I
    ).strip()
    if len(t) < 10 or len(t) > 300 or JUNK.search(t):
        return None
    return t

def html_title(url):
    html = fetch_html(url)
    if not html: return None
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
    return clean_title(m.group(1)) if m else None

# CrossRef
def crossref(doi):
    d = get_json(f"https://api.crossref.org/works/{quote(doi)}")
    if not d: return None
    msg = d.get('message', {})
    titles = msg.get('title') or []
    if not titles: return None
    authors = msg.get('author', [])
    auth_str = None
    if authors:
        names = [f"{a.get('given','')} {a.get('family','')}".strip() for a in authors[:3]]
        auth_str = ', '.join(names) + (' et al.' if len(authors) > 3 else '')
    year = None
    if msg.get('published'):
        parts = msg['published'].get('date-parts', [[]])[0]
        if parts: year = parts[0]
    return {'title': titles[0], 'authors': auth_str, 'year': year}

def doi_from_url(url):
    m = re.search(r'(10\.\d{4,}/[^\s"&?#]+)', url)
    return m.group(1).rstrip('.,)') if m else None

# NASA NTRS
def ntrs(url):
    m = re.search(r'/citations?/(\d+)', url)
    if not m: return None
    d = get_json(f"https://ntrs.nasa.gov/api/citations/{m.group(1)}")
    if not d: return None
    return {'title': d.get('title'), 'authors': None, 'year': None}

# ADS
def ads(url):
    m = re.search(r'abs/([^/\s]+)', url)
    if not m: return None
    bibcode = m.group(1)
    d = get_json(f"https://api.adsabs.harvard.edu/v1/search/query?q=bibcode:{quote(bibcode)}&fl=title,author,year",
                 headers={"Authorization": "Bearer anonymous"})
    if not d: return None
    docs = d.get('response', {}).get('docs', [])
    if not docs: return None
    doc = docs[0]
    titles = doc.get('title', [])
    authors = doc.get('author', [])
    return {
        'title': titles[0] if titles else None,
        'authors': ', '.join(authors[:3]) + (' et al.' if len(authors) > 3 else '') if authors else None,
        'year': doc.get('year'),
    }

# ChemRxiv
def chemrxiv(url):
    m = re.search(r'article-details/([a-f0-9]+)', url)
    if not m: return None
    d = get_json(f"https://chemrxiv.org/engage/chemrxiv/public-api/v1/items/{m.group(1)}")
    if not d: return None
    return {'title': d.get('title'), 'authors': None, 'year': None}

# MDPI
def mdpi(url):
    return {'title': html_title(url), 'authors': None, 'year': None}

# ResearchGate
def researchgate(url):
    m = re.search(r'/publication/(\d+)_([^/\s?]+)', url)
    if not m: return None
    slug = m.group(2).replace('_', ' ')
    # Capitalise first letter of each word
    title = ' '.join(w.capitalize() for w in slug.split('_'))
    if len(title) > 15:
        return {'title': title, 'authors': None, 'year': None}
    return None

# ESSOAr
def essoar(url):
    doi = doi_from_url(url)
    if doi: return crossref(doi)
    return {'title': html_title(url), 'authors': None, 'year': None}

def resolve(paper):
    url = paper['url']

    # Try DOI → CrossRef first (most reliable)
    doi = doi_from_url(url)
    if doi:
        r = crossref(doi)
        time.sleep(0.3)
        if r and r.get('title'): return r

    # Domain-specific APIs
    if 'ntrs.nasa.gov' in url:
        r = ntrs(url); time.sleep(0.3)
        if r and r.get('title'): return r

    if 'ui.adsabs.harvard.edu' in url or 'adsabs' in url:
        r = ads(url); time.sleep(0.4)
        if r and r.get('title'): return r

    if 'chemrxiv.org' in url:
        r = chemrxiv(url); time.sleep(0.3)
        if r and r.get('title'): return r

    if 'researchgate.net/publication/' in url:
        r = researchgate(url)
        if r and r.get('title'): return r

    if 'essopenarchive.org' in url:
        r = essoar(url); time.sleep(0.3)
        if r and r.get('title'): return r

    # Generic HTML fetch
    t = html_title(url); time.sleep(0.3)
    if t: return {'title': t, 'authors': None, 'year': None}

    return None


def main():
    papers = json.loads(PAPERS_FILE.read_text())

    # Step 1: remove broken URLs
    before = len(papers)
    papers = [p for p in papers if not is_broken(p['url'])]
    removed = before - len(papers)
    print(f"Removed {removed} broken/truncated URLs. Remaining: {len(papers)}")

    # Step 2: enrich remaining untitled
    untitled = [p for p in papers if not p.get('title')]
    print(f"Still missing titles: {len(untitled)}")

    enriched = 0
    for i, paper in enumerate(untitled):
        result = resolve(paper)
        if result and result.get('title'):
            paper['title'] = result['title']
            if not paper.get('authors') and result.get('authors'):
                paper['authors'] = result['authors']
            if not paper.get('year') and result.get('year'):
                try: paper['year'] = int(result['year'])
                except: pass
            enriched += 1
            print(f"  [{i+1}/{len(untitled)}] ✓ {paper['title'][:75]}")
        else:
            print(f"  [{i+1}/{len(untitled)}] — {paper['url'][:65]}")

        if (i + 1) % 20 == 0:
            PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")
            print(f"  [saved at {i+1}]")

    papers.sort(key=lambda p: (p.get('title') is None, -(p.get('year') or 0)))
    PAPERS_FILE.write_text(json.dumps(papers, indent=2, ensure_ascii=False) + "\n")

    final_untitled = len([p for p in papers if not p.get('title')])
    print(f"\nDone. +{enriched} titles. Removed {removed} broken URLs.")
    print(f"Total: {len(papers)} papers, {final_untitled} still untitled.")

if __name__ == "__main__":
    main()
