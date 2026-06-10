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

    return result
  }, [search, category, simulant, application, sortBy])

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
          {filtered.map(paper => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
              No publications match your filters.
            </div>
          )}
        </div>
      </main>

      <Footer papersCount={papers.length} />
    </div>
  )
}
