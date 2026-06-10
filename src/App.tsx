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
  const [sortBy, setSortBy] = useState<'year' | 'added'>('year')

  const filtered = useMemo(() => {
    let result = [...papers]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        (p.title?.toLowerCase().includes(q)) ||
        (p.authors?.toLowerCase().includes(q)) ||
        p.keywords.some(k => k.toLowerCase().includes(q)) ||
        p.simulants.some(s => s.toLowerCase().includes(q)) ||
        p.url.toLowerCase().includes(q)
      )
    }

    if (category !== 'all') {
      result = result.filter(p => p.category === category)
    }

    if (simulant !== 'all') {
      result = result.filter(p => p.simulants.includes(simulant))
    }

    result.sort((a, b) => {
      if (sortBy === 'year') return (b.year ?? 0) - (a.year ?? 0)
      return (b.added_at ?? '') > (a.added_at ?? '') ? 1 : -1
    })

    return result
  }, [search, category, simulant, sortBy])

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <StatsBar papers={papers} simulants={simulants} />
        <FilterBar
          search={search} setSearch={setSearch}
          category={category} setCategory={setCategory}
          simulant={simulant} setSimulant={setSimulant}
          sortBy={sortBy} setSortBy={setSortBy}
          simulants={simulants}
        />
        <div className="mt-2 mb-4 text-sm text-slate-400">
          {filtered.length} paper{filtered.length !== 1 ? 's' : ''} found
        </div>
        <div className="space-y-3">
          {filtered.map(paper => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              No papers match your filters.
            </div>
          )}
        </div>
      </main>
      <Footer papersCount={papers.length} />
    </div>
  )
}
