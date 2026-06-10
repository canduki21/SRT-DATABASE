#!/usr/bin/env python3
"""
Generate a weekly newsletter draft from papers added in the last 7 days.
No API key required — produces a clean formatted digest ready to paste into email.
Output: newsletters/YYYY-MM-DD.md
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict

PAPERS_FILE = Path(__file__).parent.parent / "src" / "data" / "papers.json"
OUT_DIR     = Path(__file__).parent.parent / "newsletters"
OUT_DIR.mkdir(exist_ok=True)

papers = json.loads(PAPERS_FILE.read_text())
cutoff = datetime.now(timezone.utc) - timedelta(days=7)

recent = [
    p for p in papers
    if p.get("added_at")
    and datetime.fromisoformat(p["added_at"].rstrip("Z")).replace(tzinfo=timezone.utc) >= cutoff
]

today     = datetime.now().strftime("%Y-%m-%d")
today_fmt = datetime.now().strftime("%B %d, %Y")
out_path  = OUT_DIR / f"{today}.md"

# Group by simulant
groups: dict[str, list] = defaultdict(list)
seen = set()
for p in sorted(recent, key=lambda x: x.get("year") or 0, reverse=True):
    sims = p.get("simulants") or []
    if sims:
        for s in sims:
            if p["id"] not in seen:
                groups[s].append(p)
                seen.add(p["id"])
    else:
        groups["General"].append(p)
        seen.add(p["id"])

lines = [
    f"# SRT Research Digest — {today_fmt}",
    f"**{len(recent)} new publication{'s' if len(recent) != 1 else ''} added this week**",
    "",
    "---",
    "",
]

if not recent:
    lines.append("No new papers were added to the database this week.")
else:
    for sim in sorted(groups.keys()):
        plist = groups[sim]
        lines.append(f"## {sim}  ({len(plist)} paper{'s' if len(plist) != 1 else ''})")
        lines.append("")
        for p in plist:
            title   = p.get("title") or "(Untitled)"
            authors = p.get("authors") or ""
            year    = p.get("year") or ""
            url     = p.get("url", "")
            ref     = ", ".join(str(x) for x in [authors.split(",")[0] if authors else "", year] if x)
            lines.append(f"**{title}**")
            if ref:
                lines.append(f"*{ref}*")
            lines.append(url)
            lines.append("")

lines += [
    "---",
    f"*Digest generated {today_fmt} · SRT Research Database*",
    f"*View full database: https://canduki21.github.io/SRT-DATABASE/*",
]

out_path.write_text("\n".join(lines) + "\n")
print(f"Newsletter draft written to {out_path} ({len(recent)} papers)")
