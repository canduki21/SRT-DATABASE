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

const SIM_CAT: Record<string, string> = {}
for (const s of ['LHS-1','LHS-2','LHS-1E','LHS-1D','LHS-1-25A','LSP-2','LMS-1','LMS-2','LMS-1E','LMS-1D']) SIM_CAT[s] = 'lunar'
for (const s of ['MGS-1','MGS-1C','MGS-1S','JEZ-1','MMS-1','MMS-2']) SIM_CAT[s] = 'martian'
for (const s of ['CI-E','CM-E']) SIM_CAT[s] = 'asteroid'

const SIM_CHIP_COLOR: Record<string, string> = {
  lunar: '#7db5f5', martian: '#f97474', asteroid: '#e09057',
}

function formatValue(v: number | string): string {
  if (typeof v === 'string') return v
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2)
  if (Number.isInteger(v)) return String(v)
  return v.toPrecision(4).replace(/\.?0+$/, '')
}

// Interprets a value as a float for comparison; returns null if not numeric
function numVal(v: number | string): number | null {
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

// Returns a CSS background for a relative position in [0,1]
function heatBg(pos: number): string {
  // 0 = low (cool blue), 1 = high (warm orange)
  if (pos <= 0.5) {
    const t = pos * 2
    return `rgba(59,130,246,${0.06 + t * 0.14})`
  } else {
    const t = (pos - 0.5) * 2
    return `rgba(200,122,65,${0.08 + t * 0.22})`
  }
}

// ── BROWSE VIEW ────────────────────────────────────────────────────────────────
function BrowseView({
  measurements, papers, search, simulant, category,
  setSearch, setSimulant, setCategory, allSimulants,
}: {
  measurements: Measurement[], papers: Paper[]
  search: string, simulant: string, category: string
  setSearch: (v: string) => void
  setSimulant: (v: string) => void
  setCategory: (v: string) => void
  allSimulants: string[]
}) {
  const paperMap = useMemo(() => {
    const m: Record<string, Paper> = {}
    for (const p of papers) m[p.id] = p
    return m
  }, [papers])

  const filtered = useMemo(() => {
    let r = [...measurements]
    if (simulant !== 'all') r = r.filter(m => m.simulant === simulant)
    if (category !== 'all') r = r.filter(m => m.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(m =>
        m.property.toLowerCase().includes(q) ||
        m.simulant.toLowerCase().includes(q) ||
        (m.condition ?? '').toLowerCase().includes(q)
      )
    }
    return r.sort((a, b) => a.simulant.localeCompare(b.simulant) || a.property.localeCompare(b.property))
  }, [measurements, simulant, category, search])

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder='Search property, e.g. "bulk density" or "SiO2"…'
            className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'inherit' }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </div>
        <select value={simulant} onChange={e => setSimulant(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'inherit' }}>
          {allSimulants.map(s => <option key={s} value={s}>{s === 'all' ? 'All Simulants' : s}</option>)}
        </select>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all"
              style={category === c.value ? { background: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-muted)' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
        {filtered.length} measurement{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="grid text-xs font-bold uppercase tracking-widest px-4 py-3"
          style={{ gridTemplateColumns: '7rem 1fr 6rem 5rem 10rem 7rem', background: 'var(--color-bg-dim)', color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
          <span>Simulant</span><span>Property</span><span>Value</span><span>Unit</span><span>Condition</span><span>Source</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--color-muted)', background: 'var(--color-surface)' }}>
            No measurements match your filters.
          </div>
        ) : filtered.map((m, i) => {
          const paper = m.paper_id ? paperMap[m.paper_id] : null
          const catStyle = CAT_COLOR[m.category] ?? CAT_COLOR.physical
          return (
            <div key={m.id} className="grid items-center px-4 py-3 text-sm"
              style={{ gridTemplateColumns: '7rem 1fr 6rem 5rem 10rem 7rem', background: i % 2 === 0 ? 'var(--color-surface)' : 'rgba(2,46,75,0.5)', borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <span className="font-mono font-bold text-xs" style={{ color: SIM_CHIP_COLOR[SIM_CAT[m.simulant] ?? ''] ?? 'var(--color-accent)' }}>{m.simulant}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{m.property}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded self-start"
                  style={{ background: catStyle.bg, color: catStyle.color }}>{m.category}</span>
              </div>
              <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{formatValue(m.value)}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{m.unit}</span>
              <span className="text-xs leading-tight" style={{ color: 'var(--color-muted)' }}>{m.condition ?? '—'}</span>
              {paper ? (
                <a href={paper.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold transition-colors hover:underline" style={{ color: 'var(--color-accent)' }}
                  title={paper.title ?? paper.url}>
                  {paper.year ?? paper.authors?.split(',')[0] ?? 'View'}
                  <svg className="inline w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>SRT datasheet</span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── COMPARE VIEW ───────────────────────────────────────────────────────────────
function CompareView({
  measurements, category, setCategory,
}: {
  measurements: Measurement[]
  category: string
  setCategory: (v: string) => void
}) {
  const allSimulants = useMemo(() =>
    Array.from(new Set(measurements.map(m => m.simulant))).sort(),
    [measurements]
  )

  const [selected, setSelected] = useState<string[]>(['LHS-1', 'LMS-1', 'MGS-1'])

  function toggle(s: string) {
    setSelected(prev =>
      prev.includes(s)
        ? prev.filter(x => x !== s)
        : prev.length < 5 ? [...prev, s] : prev
    )
  }

  // Build comparison table: {property → {category, simulant → value+unit}}
  const table = useMemo(() => {
    const filtered = category === 'all' ? measurements : measurements.filter(m => m.category === category)
    const rows: Record<string, { category: string; cells: Record<string, { value: number | string; unit: string }> }> = {}
    for (const m of filtered) {
      if (!selected.includes(m.simulant)) continue
      if (!rows[m.property]) rows[m.property] = { category: m.category, cells: {} }
      rows[m.property].cells[m.simulant] = { value: m.value, unit: m.unit }
    }
    // Only keep rows that have at least 2 simulants
    return Object.entries(rows)
      .filter(([, row]) => Object.keys(row.cells).length >= 2)
      .sort(([, a], [, b]) => a.category.localeCompare(b.category) || 0)
  }, [measurements, selected, category])

  // Group rows by category for section headers
  const grouped = useMemo(() => {
    const groups: Record<string, typeof table> = {}
    for (const entry of table) {
      const cat = entry[1].category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(entry)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [table])

  return (
    <>
      {/* Category filter + simulant picker */}
      <div className="flex flex-wrap gap-2 mb-5 items-start">
        <div className="flex gap-1 rounded-lg p-1 self-start" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all"
              style={category === c.value ? { background: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-muted)' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulant picker */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 8 }}>
          Select simulants to compare (up to 5)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allSimulants.map(s => {
            const on = selected.includes(s)
            const color = SIM_CHIP_COLOR[SIM_CAT[s] ?? ''] ?? '#adadad'
            return (
              <button key={s} onClick={() => toggle(s)}
                style={{
                  padding: '4px 12px', borderRadius: 20,
                  fontSize: 12, fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${on ? color : 'var(--color-border)'}`,
                  background: on ? `${color}22` : 'transparent',
                  color: on ? color : 'var(--color-muted)',
                  opacity: !on && selected.length >= 5 ? 0.4 : 1,
                }}>
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {selected.length < 2 ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
          Select at least 2 simulants to compare.
        </div>
      ) : table.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--color-muted)' }}>
          No shared properties found for the selected simulants{category !== 'all' ? ` in "${category}"` : ''}.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `1fr repeat(${selected.length}, minmax(90px, 1fr))`,
            background: 'var(--color-bg-dim)',
            borderBottom: '1px solid var(--color-border)',
            padding: '10px 16px',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>Property</span>
            {selected.map(s => {
              const color = SIM_CHIP_COLOR[SIM_CAT[s] ?? ''] ?? '#adadad'
              return (
                <span key={s} style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color, textAlign: 'center' }}>{s}</span>
              )
            })}
          </div>

          {/* Rows grouped by category */}
          {grouped.map(([cat, rows], gi) => {
            const catStyle = CAT_COLOR[cat] ?? CAT_COLOR.physical
            return (
              <div key={cat}>
                {/* Category separator */}
                <div style={{
                  padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--color-bg-dim)',
                  borderTop: gi > 0 ? '2px solid var(--color-border)' : undefined,
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4, background: catStyle.bg, color: catStyle.color }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{rows.length} propert{rows.length !== 1 ? 'ies' : 'y'}</span>
                </div>

                {rows.map(([prop, row], ri) => {
                  // Compute numeric range for heat map
                  const nums = selected.map(s => row.cells[s] ? numVal(row.cells[s].value) : null).filter((n): n is number => n !== null)
                  const min = nums.length ? Math.min(...nums) : 0
                  const max = nums.length ? Math.max(...nums) : 0
                  const range = max - min

                  return (
                    <div key={prop}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `1fr repeat(${selected.length}, minmax(90px, 1fr))`,
                        borderBottom: ri < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
                        background: ri % 2 === 0 ? 'var(--color-surface)' : 'rgba(2,46,75,0.5)',
                        alignItems: 'center',
                      }}>
                      {/* Property name */}
                      <div style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{prop}</span>
                      </div>

                      {/* Values per simulant */}
                      {selected.map(s => {
                        const cell = row.cells[s]
                        if (!cell) {
                          return (
                            <div key={s} style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <span style={{ fontSize: 13, color: 'var(--color-border)' }}>—</span>
                            </div>
                          )
                        }
                        const n = numVal(cell.value)
                        let bg = 'transparent'
                        if (n !== null && range > 0) {
                          bg = heatBg((n - min) / range)
                        }
                        return (
                          <div key={s} style={{ padding: '10px 8px', textAlign: 'center', background: bg, transition: 'background 0.2s' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', display: 'block' }}>
                              {formatValue(cell.value)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                              {cell.unit}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Legend */}
          <div style={{ padding: '10px 16px', background: 'var(--color-bg-dim)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>Heat map:</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <div style={{ width: 40, height: 12, borderRadius: 3, background: 'rgba(59,130,246,0.2)' }} />
              <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>lower</span>
            </div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <div style={{ width: 40, height: 12, borderRadius: 3, background: 'rgba(200,122,65,0.3)' }} />
              <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>higher</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-muted)', marginLeft: 4 }}>— = no data for that simulant</span>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 'auto' }}>
              {table.length} shared propert{table.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function PropertiesDB({ measurements, papers }: Props) {
  const [mode, setMode] = useState<'browse' | 'compare'>('browse')
  const [search,   setSearch]   = useState('')
  const [simulant, setSimulant] = useState('all')
  const [category, setCategory] = useState('all')

  const allSimulants = useMemo(() =>
    ['all', ...Array.from(new Set(measurements.map(m => m.simulant))).sort()],
    [measurements]
  )

  return (
    <div>
      {/* Info + mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)', margin: 0, flex: 1 }}>
          Characterization values extracted from published literature. Always refer to the original publication for full context.
        </p>
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', flexShrink: 0 }}>
          {([['browse', 'Browse', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'],
             ['compare', 'Compare', 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z']] as [string, string, string][]).map(([id, label, icon]) => (
            <button key={id} onClick={() => setMode(id as 'browse' | 'compare')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all"
              style={mode === id ? { background: 'var(--color-accent)', color: '#fff' } : { color: 'var(--color-muted)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'browse' ? (
        <BrowseView
          measurements={measurements} papers={papers}
          search={search} simulant={simulant} category={category}
          setSearch={setSearch} setSimulant={setSimulant} setCategory={setCategory}
          allSimulants={allSimulants}
        />
      ) : (
        <CompareView measurements={measurements} category={category} setCategory={setCategory} />
      )}
    </div>
  )
}
