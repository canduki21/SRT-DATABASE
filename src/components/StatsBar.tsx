import type { Paper, Simulant } from '../types'

interface Props {
  papers: Paper[]
  simulants: Simulant[]
}

export default function StatsBar({ papers, simulants }: Props) {
  const years = papers.map(p => p.year).filter(Boolean) as number[]
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear()

  const topSimulants = simulants
    .map(s => ({ ...s, count: papers.filter(p => p.simulants.includes(s.id)).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>{papers.length}</div>
          <div className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text)' }}>Publications</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>through {maxYear}</div>
        </div>
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>{simulants.length}</div>
          <div className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text)' }}>Products</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>SRT simulants</div>
        </div>
      </div>

      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
          Most cited products
        </div>
        <div className="flex flex-wrap gap-3">
          {topSimulants.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-accent)' }}>{s.abbr}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(200,122,65,0.15)', color: 'var(--color-accent)' }}>
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
