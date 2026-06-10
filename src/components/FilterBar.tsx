import type { Simulant } from '../types'

interface Props {
  search: string
  setSearch: (v: string) => void
  category: string
  setCategory: (v: string) => void
  simulant: string
  setSimulant: (v: string) => void
  sortBy: 'year' | 'added'
  setSortBy: (v: 'year' | 'added') => void
  simulants: Simulant[]
}

const CATEGORIES = [
  { value: 'all',      label: 'All' },
  { value: 'lunar',    label: 'Lunar' },
  { value: 'martian',  label: 'Martian' },
  { value: 'asteroid', label: 'Asteroid' },
  { value: 'multi',    label: 'Multi' },
  { value: 'general',  label: 'General' },
]

export default function FilterBar({
  search, setSearch,
  category, setCategory,
  simulant, setSimulant,
  sortBy, setSortBy,
  simulants,
}: Props) {
  return (
    <div className="space-y-3 mb-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by title, author, keyword, or simulant…"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
      />

      <div className="flex flex-wrap gap-2">
        {/* Category tabs */}
        <div className="flex gap-1 bg-slate-800/70 rounded-lg p-1 border border-slate-700/50">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                category === c.value
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Simulant select */}
        <select
          value={simulant}
          onChange={e => setSimulant(e.target.value)}
          className="bg-slate-800 border border-slate-700/50 text-slate-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="all">All products</option>
          <optgroup label="Lunar">
            {simulants.filter(s => s.category === 'lunar').map(s => (
              <option key={s.id} value={s.id}>{s.abbr}</option>
            ))}
          </optgroup>
          <optgroup label="Martian">
            {simulants.filter(s => s.category === 'martian').map(s => (
              <option key={s.id} value={s.id}>{s.abbr}</option>
            ))}
          </optgroup>
          <optgroup label="Asteroid">
            {simulants.filter(s => s.category === 'asteroid').map(s => (
              <option key={s.id} value={s.id}>{s.abbr}</option>
            ))}
          </optgroup>
        </select>

        {/* Sort */}
        <div className="flex gap-1 bg-slate-800/70 rounded-lg p-1 border border-slate-700/50 ml-auto">
          <button
            onClick={() => setSortBy('year')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === 'year' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            By Year
          </button>
          <button
            onClick={() => setSortBy('added')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === 'added' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Recently Added
          </button>
        </div>
      </div>
    </div>
  )
}
