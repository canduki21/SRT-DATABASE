#!/usr/bin/env python3
"""Parse research papers from SRT Google Sheets export and output JSON."""
import json
import re
import sys
import uuid

INPUT_FILE = "/Users/canduki21/.claude/projects/-Users-canduki21/6f20d6a6-a100-4986-8135-e74fc8b9255d/tool-results/mcp-claude_ai_Google_Drive-read_file_content-1781102161937.txt"

SIMULANT_IDS = [
    "LHS-1-25A", "LHS-1E", "LHS-1D", "LHS-1",
    "LMS-1E", "LMS-1D", "LMS-1",
    "LSP-2", "LHS-2", "LMS-2",
    "MGS-1C", "MGS-1S", "MGS-1",
    "JEZ-1", "CI-E", "CM-E",
    "MMS-1", "MMS-2",
]

LUNAR_SIMS  = {"LHS-1","LHS-2","LHS-1E","LHS-1D","LHS-1-25A","LSP-2","LMS-1","LMS-2","LMS-1E","LMS-1D"}
MART_SIMS   = {"MGS-1","MGS-1C","MGS-1S","JEZ-1","MMS-1","MMS-2"}
AST_SIMS    = {"CI-E","CM-E"}


def clean_url(url):
    url = url.strip().rstrip('\\,."\'')
    if "google.com/url" in url:
        m = re.search(r'q=(https?://[^&\\]+)', url)
        if m:
            url = m.group(1)
    return url


def is_valid_url(url):
    if not url.startswith("http"):
        return False
    if len(url) < 25:
        return False
    # Must end with something real
    bad_ends = ('.', ',', '(', '[', 'https', 'http', '/science', '/sci', '/pub', '/ar', 'S00', 'S027288')
    for b in bad_ends:
        if url.endswith(b):
            return False
    return True


def detect_simulants(text):
    found = []
    for s in SIMULANT_IDS:
        if re.search(r'\b' + re.escape(s) + r'\b', text, re.IGNORECASE):
            if s not in found:
                found.append(s)
    return found


def detect_category(text, simulants):
    sim_set = set(simulants)
    has_lunar   = bool(sim_set & LUNAR_SIMS)
    has_martian = bool(sim_set & MART_SIMS)
    has_ast     = bool(sim_set & AST_SIMS)
    categories  = [c for c, f in [("lunar", has_lunar), ("martian", has_martian), ("asteroid", has_ast)] if f]
    if len(categories) == 1:
        return categories[0]
    if len(categories) > 1:
        return "multi"
    t = text.lower()
    if "lunar" in t or "moon" in t: return "lunar"
    if "mars" in t or "martian" in t: return "martian"
    if "asteroid" in t or "chondrite" in t: return "asteroid"
    return "general"


def extract_keywords(text):
    # Pull capitalized multi-word phrases that look like topic keywords
    candidates = re.findall(r'\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,3}\b', text)
    # Filter noise
    stop = {"The","And","For","With","From","This","That","Into","About","Based","Using","DONE","REVIEW"}
    kws = [c for c in candidates if c not in stop and len(c) > 4]
    return list(dict.fromkeys(kws))[:12]


def main():
    with open(INPUT_FILE) as f:
        data = json.load(f)
    content = data["fileContent"]

    papers = []
    seen_urls = set()

    # ── Pass 1: Structured Asteroid section ──────────────────────────────────
    asteroid_start = content.find("ASTEROID Asteroid")
    if asteroid_start >= 0:
        ast_text = content[asteroid_start:]
        # Title,,,,,,,Author,Year,URL
        structured = re.findall(
            r'([A-Z][^\n]{15,150}?)\*?,,+\s*([A-Za-z][^\n,]{2,40}?)\s*,\s*(\d{4})\s*,\s*(https?://[^\s,"\\]+)',
            ast_text
        )
        for raw_title, authors, year, url in structured:
            url = clean_url(url)
            if not is_valid_url(url) or url in seen_urls:
                continue
            seen_urls.add(url)
            title = re.sub(r'^[^A-Z]*', '', raw_title).strip().strip("*\\")
            simulants = detect_simulants(title + " " + authors)
            papers.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "authors": authors.strip(),
                "year": int(year),
                "url": url,
                "keywords": [],
                "simulants": simulants,
                "category": "asteroid",
                "source": "spreadsheet",
            })

    # ── Pass 2: URL + surrounding context (Lunar / Martian / General) ────────
    url_re = re.compile(r'(https?://[^\s,"\\]+)')
    parts = url_re.split(content)

    for i, part in enumerate(parts):
        if not url_re.match(part):
            continue
        url = clean_url(part)
        if not is_valid_url(url) or url in seen_urls:
            continue
        seen_urls.add(url)

        before = parts[i-1][-700:] if i > 0 else ""
        after  = parts[i+1][:300] if i+1 < len(parts) else ""
        ctx = before + " " + after

        simulants = detect_simulants(ctx)
        category  = detect_category(ctx, simulants)
        keywords  = extract_keywords(ctx)

        papers.append({
            "id": str(uuid.uuid4()),
            "title": None,
            "authors": None,
            "year": None,
            "url": url,
            "keywords": keywords,
            "simulants": simulants,
            "category": category,
            "source": "spreadsheet",
        })

    # ── Deduplicate by normalised URL ────────────────────────────────────────
    final, seen_norm = [], set()
    for p in papers:
        norm = p["url"].lower().rstrip("/")
        if norm not in seen_norm:
            seen_norm.add(norm)
            final.append(p)

    # Sort: titled entries first, then by year desc
    final.sort(key=lambda p: (p["title"] is None, -(p["year"] or 0)))

    print(json.dumps(final, indent=2, ensure_ascii=False))
    sys.stderr.write(f"Extracted {len(final)} unique papers\n")
    cats = {}
    for p in final:
        cats[p["category"]] = cats.get(p["category"], 0) + 1
    sys.stderr.write(f"By category: {cats}\n")


if __name__ == "__main__":
    main()
