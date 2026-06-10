import { useState, useMemo } from 'react'
import type { Measurement, Paper } from '../types'

interface Props {
  measurements: Measurement[]
  papers: Paper[]
}

const CATEGORIES = [
  { value: 'all',        label: 'All' },
  { value: 'physical',   label: 'Physical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'thermal',    label: 'Thermal' },
  { value: 'optical',    label: 'Optical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'mineralogy', label: 'Mineralogy' },
]

const CAT_COLOR: Record<string, { bg: string; color: string }> = {
  physical:   { bg: 'rgba(59,130,246,0.12)',  color: '#7db5f5' },
  mechanical: { bg: 'rgba(239,68,68,0.12)',   color: '#f97474' },
  thermal:    { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c' },
  optical:    { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  electrical: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc' },
  mineralogy: { bg: 'rgba(250,204,21,0.12)', color: '#facc15' },
}

function formatValue(v: number | string): string {
  if (typeof v === 'string') return v
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2)
  if (Number.isInteger(v)) return String(v)
  return v.toPrecision(4).replace(/\.?0+$/, '')
}

export default function PropertiesDB({ measurements, papers }: Props) {
  const [search, setSearch] = useState('')
  const [simulant, setSimulant] = useState('all')
  const [category, setCategory] = useState('all')

  const paperMap = useMemo(() => {
    const m: Record<string, Paper> = {}
    for (const p of papers) m[p.id] = p
    return m
  }, [papers])

  const allSimulants = useMemo(() =>
    ['all', ...Array.from(new Set(measurements.map(m => m.simulant))).sort()],
    [measurements]
  )

  const filtered = useMemo(() => {
    let result = [...measurements]
    if (simulant !== 'all') result = result.filter(m => m.simulant === simulant)
    if (category !== 'all') result = result.filter(m => m.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.property.toLowerCase().includes(q) ||
        m.simulant.toLowerCase().includes(q) ||
        (m.condition ?? '').toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => a.simulant.localeCompare(b.simulant) || a.property.localeCompare(b.property))
  }, [measurements, simulant, category, search])

  return (
    <div>
      {/* Info banner */}
      <div
        className="rounded-lg px-5 py-4 mb-6 text-sm"
        style={{ background: 'rgba(200,122,65,0.08)', border: '1px solid rgba(200,122,65,0.25)', color: 'var(--color-muted)' }}
      >
        Characterization values extracted from published literature. Each entry links to its source paper.
        Values may vary with measurement conditions — always refer to the original publication for full context.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search property, e.g. "conductivity" or "friction angle"…'
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'inherit' }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </div>

        {/* Simulant */}
        <select
          value={simulant}
          onChange={e => setSimulant(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'inherit' }}
        >
          {allSimulants.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Simulants' : s}</option>
          ))}
        </select>

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
      </div>

      <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
        {filtered.length} measurement{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {/* Header */}
        <div
          className="grid text-xs font-bold uppercase tracking-widest px-4 py-3"
          style={{
            gridTemplateColumns: '7rem 1fr 6rem 5rem 10rem 7rem',
            background: 'var(--color-bg-dim)',
            color: 'var(--color-muted)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span>Simulant</span>
          <span>Property</span>
          <span>Value</span>
          <span>Unit</span>
          <span>Condition</span>
          <span>Source</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--color-muted)', background: 'var(--color-surface)' }}>
            No measurements match your filters.
          </div>
        ) : (
          filtered.map((m, i) => {
            const paper = m.paper_id ? paperMap[m.paper_id] : null
            const catStyle = CAT_COLOR[m.category] ?? CAT_COLOR.physical
            return (
              <div
                key={m.id}
                className="grid items-center px-4 py-3 text-sm transition-colors"
                style={{
                  gridTemplateColumns: '7rem 1fr 6rem 5rem 10rem 7rem',
                  background: i % 2 === 0 ? 'var(--color-surface)' : 'rgba(2,46,75,0.5)',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {/* Simulant */}
                <span className="font-mono font-bold text-xs" style={{ color: 'var(--color-accent)' }}>
                  {m.simulant}
                </span>

                {/* Property + category badge */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{m.property}</span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded self-start"
                    style={{ background: catStyle.bg, color: catStyle.color }}
                  >
                    {m.category}
                  </span>
                </div>

                {/* Value */}
                <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                  {formatValue(m.value)}
                </span>

                {/* Unit */}
                <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                  {m.unit}
                </span>

                {/* Condition */}
                <span className="text-xs leading-tight" style={{ color: 'var(--color-muted)' }}>
                  {m.condition ?? '—'}
                </span>

                {/* Source */}
                {paper ? (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold transition-colors hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                    title={paper.title ?? paper.url}
                  >
                    {paper.year ?? paper.authors?.split(',')[0] ?? 'View paper'}
                    <svg className="inline w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>SRT datasheet</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
