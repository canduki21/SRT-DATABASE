import { useState } from 'react'
import type { Paper } from '../types'

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  lunar:    { bg: 'rgba(59,130,246,0.12)', text: '#7db5f5', border: 'rgba(59,130,246,0.3)' },
  martian:  { bg: 'rgba(239,68,68,0.12)',  text: '#f97474', border: 'rgba(239,68,68,0.3)' },
  asteroid: { bg: 'rgba(200,122,65,0.12)', text: '#e09057', border: 'rgba(200,122,65,0.3)' },
  multi:    { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  general:  { bg: 'rgba(143,141,141,0.1)', text: '#adadad', border: 'rgba(143,141,141,0.25)' },
}

const SIM_CAT: Record<string, string> = {}
for (const s of ['LHS-1','LHS-2','LHS-1E','LHS-1D','LHS-1-25A','LSP-2','LMS-1','LMS-2','LMS-1E','LMS-1D']) SIM_CAT[s] = 'lunar'
for (const s of ['MGS-1','MGS-1C','MGS-1S','JEZ-1','MMS-1','MMS-2']) SIM_CAT[s] = 'martian'
for (const s of ['CI-E','CM-E']) SIM_CAT[s] = 'asteroid'

const SIM_CHIP: Record<string, { bg: string; color: string }> = {
  lunar:    { bg: 'rgba(59,130,246,0.15)',  color: '#7db5f5' },
  martian:  { bg: 'rgba(239,68,68,0.15)',   color: '#f97474' },
  asteroid: { bg: 'rgba(200,122,65,0.15)',  color: '#e09057' },
}

function hostLabel(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

interface Props { paper: Paper }

export default function PaperCard({ paper }: Props) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_COLOR[paper.category] ?? CATEGORY_COLOR.general
  const title = paper.title

  return (
    <article
      className="rounded-lg p-5 transition-all"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,122,65,0.4)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div className="flex items-start gap-3">
        {/* Category pill */}
        <span
          className="flex-shrink-0 mt-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}
        >
          {paper.category}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title — main clickable element */}
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <h3
              className="text-base font-semibold leading-snug transition-colors group-hover:underline"
              style={{ color: title ? 'var(--color-text)' : 'var(--color-muted)', fontFamily: 'inherit' }}
            >
              {title ?? (
                <span className="italic text-sm">Untitled — click to view paper</span>
              )}
            </h3>
          </a>

          {/* Meta: authors · year · domain */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--color-muted)' }}>
            {paper.authors && (
              <span style={{ color: 'rgba(250,250,250,0.65)' }}>{paper.authors}</span>
            )}
            {paper.year && (
              <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{paper.year}</span>
            )}
            <span>{hostLabel(paper.url)}</span>
          </div>

          {/* Simulant chips */}
          {paper.simulants.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {paper.simulants.map(s => {
                const style = SIM_CHIP[SIM_CAT[s] ?? 'asteroid'] ?? SIM_CHIP.asteroid
                return (
                  <span
                    key={s}
                    className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {s}
                  </span>
                )
              })}
            </div>
          )}

          {/* Keywords toggle */}
          {paper.keywords.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-[11px] transition-colors"
                style={{ color: 'var(--color-muted)' }}
              >
                {expanded ? '▲ hide keywords' : `▼ ${paper.keywords.length} keywords`}
              </button>
              {expanded && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {paper.keywords.map(k => (
                    <span
                      key={k}
                      className="text-[11px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side: auto badge + external link */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: 'var(--color-muted)' }}
            title="Open paper"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  )
}
