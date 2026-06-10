import type { Paper, Simulant } from '../types'

interface Props {
  papers: Paper[]
  simulants: Simulant[]
}

export default function StatsBar({ papers, simulants }: Props) {
  const years = papers.map(p => p.year).filter(Boolean) as number[]
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear()

  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
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
  )
}
