import { useState, useRef } from 'react'
import type { Paper } from '../types'

interface Props {
  papers: Paper[]
}

interface Match {
  paper: Paper
  score: number
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot // vectors are already normalized
}

export default function AISearch({ papers }: Props) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading-model' | 'searching' | 'done'>('idle')
  const pipelineRef = useRef<any>(null)
  const embeddingsRef = useRef<Record<string, number[]> | null>(null)

  async function search() {
    if (!query.trim()) return
    setStatus('loading-model')
    setMatches(null)

    // Lazy-load the model (cached after first use)
    if (!pipelineRef.current) {
      const { pipeline } = await import('@xenova/transformers')
      pipelineRef.current = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
      })
    }

    // Lazy-load pre-computed embeddings
    if (!embeddingsRef.current) {
      const mod = await import('../data/embeddings.json')
      embeddingsRef.current = mod.default as Record<string, number[]>
    }

    setStatus('searching')

    const out = await pipelineRef.current(query.trim(), { pooling: 'mean', normalize: true })
    const queryVec: number[] = Array.from(out.data)

    const scored: Match[] = []
    for (const paper of papers) {
      const vec = embeddingsRef.current![paper.id]
      if (!vec) continue
      scored.push({ paper, score: cosineSim(queryVec, vec) })
    }

    scored.sort((a, b) => b.score - a.score)
    setMatches(scored.slice(0, 8))
    setStatus('done')
  }

  function reset() {
    setQuery('')
    setMatches(null)
    setStatus('idle')
  }

  const isLoading = status === 'loading-model' || status === 'searching'

  return (
    <div
      className="rounded-xl mb-8 p-6"
      style={{ background: 'var(--color-surface)', border: '1px solid rgba(200,122,65,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
          AI Paper Match
        </span>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
        Describe your project or research question and we'll find the most relevant papers.
      </p>

      {/* Input */}
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) search() }}
        placeholder="e.g. studying the geotechnical properties of lunar soil for drilling operations..."
        rows={3}
        className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none transition"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          fontFamily: 'inherit',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={search}
          disabled={isLoading || !query.trim()}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: isLoading || !query.trim() ? 'rgba(200,122,65,0.3)' : 'var(--color-accent)',
            color: '#fff',
            cursor: isLoading || !query.trim() ? 'default' : 'pointer',
          }}
        >
          {status === 'loading-model' ? 'Loading model…' : status === 'searching' ? 'Searching…' : 'Find Papers'}
        </button>

        {status === 'loading-model' && (
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Downloading AI model — first use only, takes ~10s
          </span>
        )}

        {matches && (
          <button onClick={reset} className="text-xs transition-colors" style={{ color: 'var(--color-muted)' }}>
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {matches && matches.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
            Top matches
          </div>
          {matches.map(({ paper, score }) => (
            <a
              key={paper.id}
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg transition-all group"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,122,65,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              {/* Match score */}
              <span
                className="flex-shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: 'rgba(200,122,65,0.15)', color: 'var(--color-accent)', minWidth: '3.5rem', textAlign: 'center' }}
              >
                {Math.round(score * 100)}%
              </span>

              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold leading-snug group-hover:underline"
                  style={{ color: paper.title ? 'var(--color-text)' : 'var(--color-muted)' }}
                >
                  {paper.title ?? 'Untitled'}
                </div>
                {(paper.authors || paper.year) && (
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                    {paper.authors && <span>{paper.authors}</span>}
                    {paper.authors && paper.year && <span> · </span>}
                    {paper.year && <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{paper.year}</span>}
                  </div>
                )}
              </div>

              <svg className="flex-shrink-0 w-4 h-4 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
