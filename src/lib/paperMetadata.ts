export interface PaperMetadata {
  title: string
  authors: string
  year: number | null
  abstract: string
  keywords: string[]
  doi: string | null
}

function extractDOI(url: string): string | null {
  const m1 = url.match(/doi\.org\/(10\.[^?#\s]+)/)
  if (m1) return decodeURIComponent(m1[1])
  const m2 = url.match(/(10\.\d{4,9}\/[^?#\s]+)/)
  if (m2) return m2[1]
  return null
}

function reconstructAbstract(idx: Record<string, number[]> | null | undefined): string {
  if (!idx) return ''
  const words: string[] = []
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) words[pos] = word
  }
  return words.filter(Boolean).join(' ')
}

function parseOpenAlexWork(w: Record<string, unknown>): PaperMetadata {
  const authorships = (w.authorships as { author?: { display_name?: string } }[]) ?? []
  const authors = authorships
    .map(a => a.author?.display_name)
    .filter(Boolean)
    .join(', ')

  const kwList = (w.keywords as { display_name?: string }[] | undefined) ?? []
  const conceptList = (w.concepts as { display_name?: string }[] | undefined) ?? []
  const keywords = [
    ...kwList.map(k => k.display_name ?? ''),
    ...conceptList.slice(0, 8).map(c => c.display_name ?? ''),
  ].filter(Boolean).slice(0, 15)

  const doiRaw = w.doi as string | undefined
  const doi = doiRaw ? doiRaw.replace('https://doi.org/', '') : null

  return {
    title: (w.title as string) ?? '',
    authors,
    year: (w.publication_year as number) ?? null,
    abstract: reconstructAbstract(w.abstract_inverted_index as Record<string, number[]> | null),
    keywords,
    doi,
  }
}

async function tryOpenAlexDOI(doi: string): Promise<PaperMetadata | null> {
  try {
    const res = await fetch(
      `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`
    )
    if (!res.ok) return null
    return parseOpenAlexWork(await res.json())
  } catch { return null }
}

async function tryCrossRefDOI(doi: string): Promise<PaperMetadata | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
    if (!res.ok) return null
    const m = (await res.json()).message
    const authors = (m.author ?? [])
      .map((a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(' '))
      .join(', ')
    return {
      title: Array.isArray(m.title) ? m.title[0] : (m.title ?? ''),
      authors,
      year: m.published?.['date-parts']?.[0]?.[0] ?? null,
      abstract: (m.abstract ?? '').replace(/<[^>]+>/g, ''),
      keywords: (m.subject ?? []),
      doi,
    }
  } catch { return null }
}

async function tryOpenAlexSearch(query: string): Promise<PaperMetadata | null> {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.results?.length > 0) return parseOpenAlexWork(data.results[0])
    return null
  } catch { return null }
}

/** Fetch full metadata for a URL or DOI (for the submit form). */
export async function fetchPaperMetadata(urlOrDoi: string): Promise<PaperMetadata | null> {
  const doi = extractDOI(urlOrDoi)

  if (doi) {
    const oa = await tryOpenAlexDOI(doi)
    if (oa) return oa
    const cr = await tryCrossRefDOI(doi)
    if (cr) return cr
  }

  // Try URL-based OpenAlex search
  try {
    const res = await fetch(
      `https://api.openalex.org/works?filter=primary_location.landing_page_url:${encodeURIComponent(urlOrDoi)}&per-page=1`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.results?.length > 0) return parseOpenAlexWork(data.results[0])
    }
  } catch { /* fallthrough */ }

  return null
}

/** Fetch only the abstract for an existing paper (used in PaperCard). */
export async function fetchAbstractOnly(url: string, title: string | null): Promise<string> {
  const doi = extractDOI(url)

  if (doi) {
    try {
      const res = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`)
      if (res.ok) {
        const data = await res.json()
        const abs = reconstructAbstract(data.abstract_inverted_index)
        if (abs) return abs
      }
    } catch { /* fallthrough */ }

    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
      if (res.ok) {
        const abs = ((await res.json()).message.abstract ?? '').replace(/<[^>]+>/g, '')
        if (abs) return abs
      }
    } catch { /* fallthrough */ }
  }

  if (title) {
    const result = await tryOpenAlexSearch(title)
    if (result?.abstract) return result.abstract
  }

  return ''
}
