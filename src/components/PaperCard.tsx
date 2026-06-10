import { useState } from 'react'
import type { Paper } from '../types'

const CATEGORY_STYLE: Record<string, string> = {
  lunar:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
  martian:  'bg-red-500/15 text-red-300 border-red-500/30',
  asteroid: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  multi:    'bg-purple-500/15 text-purple-300 border-purple-500/30',
  general:  'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

const SIM_STYLE: Record<string, string> = {
  lunar:    'bg-blue-900/40 text-blue-200',
  martian:  'bg-red-900/40 text-red-200',
  asteroid: 'bg-amber-900/40 text-amber-200',
}

function simulantCategory(id: string): string {
  const LUNAR  = ['LHS-1','LHS-2','LHS-1E','LHS-1D','LHS-1-25A','LSP-2','LMS-1','LMS-2','LMS-1E','LMS-1D']
  const MART   = ['MGS-1','MGS-1C','MGS-1S','JEZ-1','MMS-1','MMS-2']
  if (LUNAR.includes(id)) return 'lunar'
  if (MART.includes(id)) return 'martian'
  return 'asteroid'
}

function truncateDomain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url.slice(0, 50)
  }
}

interface Props { paper: Paper }

export default function PaperCard({ paper }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = (paper.keywords.length > 0) || (paper.simulants.length > 0)

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/70 transition-colors">
      <div className="flex items-start gap-3">
        {/* Category badge */}
        <span className={`flex-shrink-0 mt-0.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${CATEGORY_STYLE[paper.category] ?? CATEGORY_STYLE.general}`}>
          {paper.category}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title / URL */}
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-100 hover:text-blue-300 transition-colors line-clamp-2 block"
          >
            {paper.title ?? truncateDomain(paper.url)}
          </a>

          {/* Meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {paper.authors && <span>{paper.authors}</span>}
            {paper.year && (
              <span className="font-medium text-slate-300">{paper.year}</span>
            )}
            {!paper.title && (
              <span className="text-slate-500 truncate max-w-xs">{paper.url}</span>
            )}
          </div>

          {/* Simulant chips */}
          {paper.simulants.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {paper.simulants.map(s => (
                <span
                  key={s}
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${SIM_STYLE[simulantCategory(s)] ?? 'bg-slate-700 text-slate-300'}`}
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Keywords (expandable) */}
          {hasDetails && paper.keywords.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              {expanded ? '▲ hide keywords' : `▼ ${paper.keywords.length} keywords`}
            </button>
          )}
          {expanded && paper.keywords.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {paper.keywords.map(k => (
                <span key={k} className="text-[10px] bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded">
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Source badge */}
        {paper.source === 'auto-fetch' && (
          <span className="flex-shrink-0 text-[9px] bg-green-900/40 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-medium">
            AUTO
          </span>
        )}
      </div>
    </div>
  )
}
