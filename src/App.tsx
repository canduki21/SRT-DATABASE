import { useState, useMemo } from 'react'
import papersRaw from './data/papers.json'
import simulantsRaw from './data/simulants.json'
import characterizationRaw from './data/characterization.json'
import type { Paper, Simulant, Measurement } from './types'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import FilterBar from './components/FilterBar'
import PaperCard from './components/PaperCard'
import AISearch from './components/AISearch'
import PropertiesDB from './components/PropertiesDB'
import Footer from './components/Footer'
import SubmitPaperForm from './components/SubmitPaperForm'

const papers = papersRaw as Paper[]
const simulants = simulantsRaw as Simulant[]
const measurements = characterizationRaw as Measurement[]

type Tab = 'publications' | 'properties'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'publications', label: 'Publications', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'properties',   label: 'Properties',   icon: 'M3 10h18M3 14h18M10 3v18' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('publications')

  // Publications state
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
      if (sortBy === 'year') return (b.year ?? 0) - (a.year ?? 0)
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
            Research Database
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
            Publications, characterization data, and research digest for all SRT simulants.
          </p>

          {/* Disclaimer */}
          <div className="mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <p style={{ color: 'var(--color-muted)' }}>
              There's <span className="font-semibold" style={{ color: 'var(--color-text)' }}>800+ peer-reviewed publications</span> referencing SRT simulants.
              All listed research is publicly available — access full papers through your institution's library or open-access repositories such as NASA ADS, arXiv, or Google Scholar.
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-5 rounded-lg p-1 self-start inline-flex" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all"
                style={activeTab === tab.id
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { color: 'var(--color-muted)' }
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── PUBLICATIONS TAB ── */}
        {activeTab === 'publications' && (
          <>
            <AISearch papers={papers} />
            <StatsBar papers={papers} simulants={simulants} />
            <FilterBar
              search={search} setSearch={setSearch}
              category={category} setCategory={setCategory}
              simulant={simulant} setSimulant={setSimulant}
              application={application} setApplication={setApplication}
              sortBy={sortBy} setSortBy={setSortBy}
              simulants={simulants}
            />

            <SubmitPaperForm simulants={simulants} papers={papers} />

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
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
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
                      className="w-9 h-9 rounded-lg text-sm font-semibold"
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
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
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

            {totalPages > 1 && (
              <div className="mt-3 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                Page {page} of {totalPages} · showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </div>
            )}

          </>
        )}

        {/* ── PROPERTIES TAB ── */}
        {activeTab === 'properties' && (
          <PropertiesDB measurements={measurements} papers={papers} />
        )}


      </main>

      <Footer papersCount={papers.length} />
    </div>
  )
}

