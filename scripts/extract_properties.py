#!/usr/bin/env python3
"""
AI-powered characterization data extractor.
Pass a DOI or paper URL; Claude reads the abstract/text and extracts
structured property values into characterization.json.

Usage:
  ANTHROPIC_API_KEY=sk-... python3 scripts/extract_properties.py --doi 10.1234/example
  ANTHROPIC_API_KEY=sk-... python3 scripts/extract_properties.py --paper-id <uuid>

Requires: pip install anthropic requests
"""
import argparse, json, os, re, sys, uuid
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import quote

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"
CHAR_FILE   = Path(__file__).parent.parent / "src" / "data" / "characterization.json"

SRT_SIMULANTS = [
    "LHS-1","LHS-1E","LHS-1D","LHS-1-25A",
    "LMS-1","LMS-1E","LMS-1D","LSP-2",
    "MGS-1","MGS-1C","MGS-1S","JEZ-1",
    "CI-E","CM-E"
]

SYSTEM_PROMPT = """You are a scientific data extractor specializing in regolith simulant characterization.
Given paper text, extract all measured numerical property values for Space Resource Technologies (SRT) simulants.

SRT simulants: LHS-1, LHS-1E, LHS-1D, LHS-1-25A, LMS-1, LMS-1E, LMS-1D, LSP-2,
               MGS-1, MGS-1C, MGS-1S, JEZ-1, CI-E, CM-E

Property categories:
- physical: bulk density, grain density, particle size (D10/D50/D90), BET surface area, porosity, void ratio, aspect ratio, sphericity
- mechanical: friction angle, cohesion, compressive strength, tensile strength, hardness, wear rate
- thermal: thermal conductivity, heat capacity, emissivity, thermal diffusivity, thermal expansion
- optical: reflectance, albedo, refractive index, absorption coefficient
- electrical: electrical conductivity, dielectric constant (ε'), loss tangent (tan δ), permittivity
- mineralogy: mineral composition percentages (plagioclase, pyroxene, olivine, etc.)

Respond ONLY with a JSON array of extracted measurements. Each object:
{
  "simulant": "LHS-1",            // exact SRT simulant name
  "category": "physical",         // one of the 6 categories above
  "property": "Bulk Density",     // human-readable property name
  "value": 1.57,                  // number (or string for ranges like "45-50")
  "unit": "g/cm³",                // unit string
  "condition": "loose-poured"     // measurement conditions or null
}

Only include measurements that are explicitly stated with numbers. Do not infer or estimate."""


def fetch_abstract(doi: str) -> str | None:
    """Try CrossRef, then Unpaywall for abstract text."""
    url = f"https://api.crossref.org/works/{quote(doi)}"
    try:
        req = Request(url, headers={"User-Agent": "SRT-Database/1.0 (mailto:cacndela@gmail.com)"})
        d = json.loads(urlopen(req, timeout=12).read())
        msg = d.get("message", {})
        abstract = msg.get("abstract", "")
        title = (msg.get("title") or [""])[0]
        return f"Title: {title}\n\nAbstract: {abstract}" if abstract else f"Title: {title}"
    except Exception:
        return None


def extract_with_claude(text: str, paper_ref: str) -> list[dict]:
    try:
        import anthropic
    except ImportError:
        print("Install anthropic: pip install anthropic", file=sys.stderr)
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Set ANTHROPIC_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Paper: {paper_ref}\n\n{text}"}]
    )

    raw = msg.content[0].text.strip()
    # Strip markdown code fences if present
    raw = re.sub(r'^```(?:json)?\n?', '', raw).rstrip('`').strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print(f"Failed to parse Claude response:\n{raw}", file=sys.stderr)
        return []


def main():
    parser = argparse.ArgumentParser(description="Extract characterization data from a paper using AI.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--doi", help="DOI of the paper")
    group.add_argument("--paper-id", help="ID from papers.json")
    group.add_argument("--text", help="Path to a text/markdown file with paper content")
    args = parser.parse_args()

    papers = json.loads(PAPERS_FILE.read_text())
    char   = json.loads(CHAR_FILE.read_text())
    existing_ids = {c["id"] for c in char}

    doi = None
    paper_id = None
    paper_ref = ""

    if args.paper_id:
        paper = next((p for p in papers if p["id"] == args.paper_id), None)
        if not paper:
            print(f"Paper {args.paper_id} not found in papers.json", file=sys.stderr)
            sys.exit(1)
        paper_id = paper["id"]
        paper_ref = paper.get("title") or paper["url"]
        doi = re.search(r'(10\.\d{4,}/[^\s"&?#]+)', paper["url"])
        doi = doi.group(1).rstrip(".,)") if doi else None

    elif args.doi:
        doi = args.doi
        paper = next((p for p in papers if doi in p.get("url", "")), None)
        paper_id = paper["id"] if paper else None
        paper_ref = doi

    if args.text:
        content = Path(args.text).read_text()
    elif doi:
        print(f"Fetching abstract for DOI: {doi}")
        content = fetch_abstract(doi)
        if not content:
            print("Could not fetch abstract. Provide --text with paper content.", file=sys.stderr)
            sys.exit(1)
    else:
        print("No DOI found and no --text provided.", file=sys.stderr)
        sys.exit(1)

    print(f"Extracting properties from: {paper_ref[:80]}")
    extracted = extract_with_claude(content, paper_ref)

    if not extracted:
        print("No measurements extracted.")
        return

    added = 0
    for item in extracted:
        if item.get("simulant") not in SRT_SIMULANTS:
            continue
        new_id = f"c{str(uuid.uuid4())[:8]}"
        record = {
            "id":        new_id,
            "simulant":  item["simulant"],
            "category":  item.get("category", "physical"),
            "property":  item["property"],
            "value":     item["value"],
            "unit":      item.get("unit", ""),
            "condition": item.get("condition"),
            "paper_id":  paper_id,
            "year":      next((p["year"] for p in papers if p["id"] == paper_id), None) if paper_id else None,
        }
        char.append(record)
        added += 1
        print(f"  + {record['simulant']} | {record['property']} = {record['value']} {record['unit']}")

    if added:
        CHAR_FILE.write_text(json.dumps(char, indent=2, ensure_ascii=False) + "\n")
        print(f"\nAdded {added} measurements to characterization.json")
    else:
        print("No SRT simulant measurements found in this paper.")


if __name__ == "__main__":
    main()
