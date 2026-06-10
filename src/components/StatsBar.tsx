import type { Paper, Simulant } from '../types'

interface Props {
  papers: Paper[]
  simulants: Simulant[]
}

const CATEGORY_COLORS: Record<string, string> = {
  lunar:    'bg-blue-500/20 text-blue-300',
  martian:  'bg-red-500/20 text-red-300',
  asteroid: 'bg-amber-500/20 text-amber-300',
  multi:    'bg-purple-500/20 text-purple-300',
  general:  'bg-slate-500/20 text-slate-300',
}

export default function StatsBar({ papers, simulants }: Props) {
  const byCategory: Record<string, number> = {}
  for (const p of papers) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1
  }
  const withSimulants = papers.filter(p => p.simulants.length > 0).length
  const years = papers.map(p => p.year).filter(Boolean) as number[]
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear()

  const topSimulants = simulants
    .map(s => ({ ...s, count: papers.filter(p => p.simulants.includes(s.id)).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return (
    <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total Papers" value={papers.length} sub={`through ${maxYear}`} />
      <StatCard label="With Products" value={withSimulants} sub="tagged to simulants" />
      <StatCard label="Products" value={simulants.length} sub="SRT simulants" />
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-2">By Category</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(byCategory).map(([cat, count]) => (
            <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? 'bg-slate-700 text-slate-300'}`}>
              {cat} {count}
            </span>
          ))}
        </div>
      </div>
      <div className="col-span-2 sm:col-span-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-2">Most cited products</div>
        <div className="flex flex-wrap gap-2">
          {topSimulants.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-semibold text-slate-200">{s.abbr}</span>
              <span className="text-xs text-slate-500">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm font-medium text-slate-200 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}
