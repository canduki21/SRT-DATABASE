import { useState, useMemo } from 'react'
import type { Paper } from '../types'

interface Props {
  papers: Paper[]
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function groupBySimulant(papers: Paper[]): Record<string, Paper[]> {
  const groups: Record<string, Paper[]> = {}
  for (const p of papers) {
    const sims = p.simulants?.length ? p.simulants : ['General']
    for (const s of sims) {
      if (!groups[s]) groups[s] = []
      if (!groups[s].includes(p)) groups[s].push(p)
    }
  }
  return groups
}

export default function Newsletter({ papers }: Props) {
  const [window, setWindow] = useState(30)
  const [copied, setCopied] = useState(false)

  const recent = useMemo(() =>
    papers
      .filter(p => p.added_at && daysSince(p.added_at) <= window)
      .sort((a, b) => (b.added_at ?? '') > (a.added_at ?? '') ? 1 : -1),
    [papers, window]
  )

  const groups = useMemo(() => groupBySimulant(recent), [recent])
  const simulantKeys = Object.keys(groups).sort()

  function buildDraft(): string {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const lines: string[] = [
      `SRT Research Digest — ${today}`,
      `${recent.length} new publication${recent.length !== 1 ? 's' : ''} added in the last ${window} days`,
      '',
    ]
    for (const sim of simulantKeys) {
      lines.push(`── ${sim} ──`)
      for (const p of groups[sim]) {
        const ref = [p.authors?.split(',')[0], p.year].filter(Boolean).join(', ')
        lines.push(`• ${p.title ?? '(Untitled)'}${ref ? ` (${ref})` : ''}`)
        lines.push(`  ${p.url}`)
      }
      lines.push('')
    }
    return lines.join('\n')
  }

  function copyDraft() {
    navigator.clipboard.writeText(buildDraft())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Recent Publications</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Papers added to the database recently — use this to draft your newsletter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time window selector */}
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setWindow(d)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={window === d
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { color: 'var(--color-muted)' }
                }
              >
                {d === 7 ? '7d' : d === 30 ? '30d' : '90d'}
              </button>
            ))}
          </div>

          <button
            onClick={copyDraft}
            disabled={recent.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: recent.length === 0 ? 'rgba(200,122,65,0.2)' : 'var(--color-accent)',
              color: '#fff',
              cursor: recent.length === 0 ? 'default' : 'pointer',
            }}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Newsletter Draft
              </>
            )}
          </button>
        </div>
      </div>

      {recent.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            No papers added in the last {window} days. Try a wider time window.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {simulantKeys.map(sim => (
            <div key={sim} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {/* Group header */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ background: 'var(--color-bg-dim)', borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-accent)' }}>{sim}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,122,65,0.15)', color: 'var(--color-accent)' }}>
                  {groups[sim].length} paper{groups[sim].length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Papers */}
              <div style={{ background: 'var(--color-surface)' }}>
                {groups[sim].map((p, i) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-5 py-4 transition-colors group"
                    style={{
                      borderBottom: i < groups[sim].length - 1 ? '1px solid var(--color-border)' : 'none',
                      display: 'flex',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,122,65,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-snug group-hover:underline" style={{ color: p.title ? 'var(--color-text)' : 'var(--color-muted)' }}>
                        {p.title ?? <span className="italic">Untitled — click to view</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {p.authors && <span>{p.authors}</span>}
                        {p.year && <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{p.year}</span>}
                        {p.added_at && <span>Added {daysSince(p.added_at)}d ago</span>}
                      </div>
                    </div>
                    <svg className="flex-shrink-0 w-4 h-4 mt-0.5 opacity-30 group-hover:opacity-70 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 px-4 py-3 rounded-lg text-xs" style={{ background: 'var(--color-bg-dim)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
        <strong style={{ color: 'var(--color-text)' }}>Tip:</strong> Click "Copy Newsletter Draft" to get a formatted plain-text digest you can paste directly into your email or newsletter tool.
      </div>
    </div>
  )
}
