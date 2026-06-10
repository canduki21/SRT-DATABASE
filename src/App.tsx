import { useState, useMemo } from 'react'
import papersRaw from './data/papers.json'
import simulantsRaw from './data/simulants.json'
import type { Paper, Simulant } from './types'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import FilterBar from './components/FilterBar'
import PaperCard from './components/PaperCard'
import Footer from './components/Footer'

const papers = papersRaw as Paper[]
const simulants = simulantsRaw as Simulant[]

export default function App() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [simulant, setSimulant] = useState<string>('all')
  const [application, setApplication] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'year' | 'added'>('year')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const filtered = useMemo(() => {
    let result = [...papers]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        (p.title?.toLowerCase().includes(q)) ||
        (p.authors?.toLowerCase().includes(q)) ||
        p.keywords.some(k => k.toLowerCase().includes(q)) ||
        p.simulants.some(s => s.toLowerCase().includes(q))
      )
    }

    if (category !== 'all')    result = result.filter(p => p.category === category)
    if (simulant !== 'all')    result = result.filter(p => p.simulants.includes(simulant))
    if (application !== 'all') result = result.filter(p => (p.applications ?? []).includes(application))

    result.sort((a, b) => {
      if (sortBy === 'year')  return (b.year ?? 0) - (a.year ?? 0)
      return (b.added_at ?? '') > (a.added_at ?? '') ? 1 : -1
    })

    setPage(1)
    return result
  }, [search, category, simulant, application, sortBy])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Header />

      {/* Hero band */}
      <div style={{ background: 'var(--color-bg-dim)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Research Publications
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
            Every published paper featuring Space Resource Technologies simulants.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <StatsBar papers={papers} simulants={simulants} />
        <FilterBar
          search={search} setSearch={setSearch}
          category={category} setCategory={setCategory}
          simulant={simulant} setSimulant={setSimulant}
          application={application} setApplication={setApplication}
          sortBy={sortBy} setSortBy={setSortBy}
          simulants={simulants}
        />

        <div className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>

        <div className="space-y-2">
          {paginated.map(paper => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
              No publications match your filters.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: page === 1 ? 'var(--color-muted)' : 'var(--color-text)',
                cursor: page === 1 ? 'default' : 'pointer',
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              ← Prev
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="w-9 h-9 rounded-lg text-sm font-semibold transition-all"
                  style={n === page
                    ? { background: 'var(--color-accent)', color: '#fff', border: '1px solid var(--color-accent)' }
                    : { background: 'var(--color-surface)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }
                  }
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: page === totalPages ? 'var(--color-muted)' : 'var(--color-text)',
                cursor: page === totalPages ? 'default' : 'pointer',
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        )}

        <div className="mt-3 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
          Page {page} of {totalPages} · showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </div>
      </main>

      <Footer papersCount={papers.length} />
    </div>
  )
}
