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
]

export default function FilterBar({
  search, setSearch,
  category, setCategory,
  simulant, setSimulant,
  sortBy, setSortBy,
  simulants,
}: Props) {
  return (
    <div className="space-y-3 mb-5">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, author, keyword, or simulant…"
          className="w-full rounded-lg pl-10 pr-4 py-3 text-sm outline-none transition"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {/* Category tabs */}
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all"
              style={category === c.value
                ? { background: 'var(--color-accent)', color: '#fff' }
                : { color: 'var(--color-muted)' }
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Product select */}
        <select
          value={simulant}
          onChange={e => setSimulant(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
          }}
        >
          <option value="all">All Products</option>
          <optgroup label="── Lunar">
            {simulants.filter(s => s.category === 'lunar').map(s => (
              <option key={s.id} value={s.id}>{s.abbr} — {s.name}</option>
            ))}
          </optgroup>
          <optgroup label="── Martian">
            {simulants.filter(s => s.category === 'martian').map(s => (
              <option key={s.id} value={s.id}>{s.abbr} — {s.name}</option>
            ))}
          </optgroup>
          <optgroup label="── Asteroid">
            {simulants.filter(s => s.category === 'asteroid').map(s => (
              <option key={s.id} value={s.id}>{s.abbr} — {s.name}</option>
            ))}
          </optgroup>
        </select>

        {/* Sort — pushed right */}
        <div className="flex gap-1 rounded-lg p-1 ml-auto" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {(['year', 'added'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all"
              style={sortBy === s
                ? { background: 'rgba(200,122,65,0.25)', color: 'var(--color-accent)' }
                : { color: 'var(--color-muted)' }
              }
            >
              {s === 'year' ? 'By Year' : 'Recent'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
