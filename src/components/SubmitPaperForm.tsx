import { useState } from 'react'
import { fetchPaperMetadata } from '../lib/paperMetadata'
import { supabase } from '../lib/supabase'
import type { Paper, Simulant } from '../types'

const CATEGORIES = ['lunar', 'martian', 'asteroid', 'multi', 'general'] as const

const APPLICATIONS = [
  { id: 'construction',     label: 'Construction' },
  { id: 'geotechnical',     label: 'Geotechnical' },
  { id: 'isru',             label: 'ISRU' },
  { id: 'biology',          label: 'Biology' },
  { id: 'characterization', label: 'Characterization' },
  { id: 'dust_mitigation',  label: 'Dust Mitigation' },
  { id: 'radiation',        label: 'Radiation' },
]

const CAT_COLOR: Record<string, string> = {
  lunar: '#7db5f5',
  martian: '#f97474',
  asteroid: '#e09057',
  multi: '#c084fc',
  general: '#adadad',
}

interface Props { simulants: Simulant[]; papers: Paper[] }

type SubmitState = 'idle' | 'success' | 'error' | 'copied'

function inputStyle(focus = false) {
  return {
    width: '100%',
    background: 'var(--color-bg)',
    border: `1px solid ${focus ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: 'var(--color-text)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  } as React.CSSProperties
}

export default function SubmitPaperForm({ simulants, papers }: Props) {
  const [open, setOpen]         = useState(false)
  const [url, setUrl]           = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')
  const [fetched, setFetched]   = useState(false)

  const duplicate = url.trim()
    ? papers.find(p => p.url.trim().toLowerCase() === url.trim().toLowerCase())
    : null

  // Form fields
  const [title,    setTitle]    = useState('')
  const [authors,  setAuthors]  = useState('')
  const [year,     setYear]     = useState('')
  const [abstract, setAbstract] = useState('')
  const [keywords, setKeywords] = useState('')
  const [category, setCategory] = useState<string>('general')
  const [selSims,  setSelSims]  = useState<string[]>([])
  const [selApps,  setSelApps]  = useState<string[]>([])

  const [submitting,   setSubmitting]   = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitState>('idle')

  // ── fetch metadata ──────────────────────────────────────────────────────────
  async function handleFetch() {
    if (!url.trim()) return
    setFetching(true)
    setFetchMsg('')
    setFetched(false)
    try {
      const m = await fetchPaperMetadata(url.trim())
      if (m) {
        setTitle(m.title ?? '')
        setAuthors(m.authors ?? '')
        setYear(m.year ? String(m.year) : '')
        setAbstract(m.abstract ?? '')
        setKeywords(m.keywords.join(', '))
        setFetched(true)
        setFetchMsg('Metadata loaded — review and edit the fields below before submitting.')
      } else {
        setFetchMsg('Could not auto-fetch metadata. Please fill in the fields manually.')
        setFetched(true)
      }
    } catch {
      setFetchMsg('Fetch failed. Please fill in the fields manually.')
      setFetched(true)
    }
    setFetching(false)
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!url.trim()) return
    setSubmitting(true)
    const payload = {
      url:          url.trim(),
      title:        title.trim() || null,
      authors:      authors.trim() || null,
      year:         year ? parseInt(year) : null,
      abstract:     abstract.trim() || null,
      keywords:     keywords.split(',').map(k => k.trim()).filter(Boolean),
      category,
      simulants:    selSims,
      applications: selApps,
    }

    if (supabase) {
      const { error } = await supabase.from('paper_submissions').insert(payload)
      setSubmitStatus(error ? 'error' : 'success')
    } else {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setSubmitStatus('copied')
    }
    setSubmitting(false)
  }

  function reset() {
    setUrl(''); setTitle(''); setAuthors(''); setYear(''); setAbstract('')
    setKeywords(''); setCategory('general'); setSelSims([]); setSelApps([])
    setFetchMsg(''); setFetched(false); setSubmitStatus('idle')
  }

  function toggleSim(s: string) {
    setSelSims(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleApp(a: string) {
    setSelApps(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  const simsByCategory = simulants.reduce<Record<string, Simulant[]>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {})

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 32, marginBottom: 40 }}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(o => !o); setSubmitStatus('idle') }}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: open ? 'var(--color-surface)' : 'var(--color-bg-dim)',
          border: '1px dashed rgba(200,122,65,0.4)',
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(200,122,65,0.4)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width={18} height={18} fill="none" stroke="var(--color-accent)" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={10} />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
            Can't find your paper?
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Submit it here</span>
        </div>
        <svg
          width={16} height={16} fill="none" stroke="var(--color-muted)" strokeWidth={2} viewBox="0 0 24 24"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            marginTop: 4,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '24px 24px',
          }}
        >
          {/* Success / copied states */}
          {submitStatus === 'success' && (
            <div style={{ padding: '16px 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, marginBottom: 20, color: '#4ade80', fontSize: 14 }}>
              Thank you! Your submission has been received and is under review.
              <button onClick={reset} style={{ marginLeft: 16, fontSize: 12, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Submit another</button>
            </div>
          )}
          {submitStatus === 'copied' && (
            <div style={{ padding: '16px 20px', background: 'rgba(200,122,65,0.1)', border: '1px solid rgba(200,122,65,0.3)', borderRadius: 8, marginBottom: 20, color: 'var(--color-accent)', fontSize: 14 }}>
              Submission copied to clipboard as JSON. Share it with the database admin to get your paper added.
              <button onClick={reset} style={{ marginLeft: 16, fontSize: 12, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Submit another</button>
            </div>
          )}
          {submitStatus === 'error' && (
            <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 20, color: '#f87171', fontSize: 14 }}>
              Submission failed. Please try again or contact the database admin.
            </div>
          )}

          {submitStatus !== 'success' && submitStatus !== 'copied' && (
            <>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                Paste the paper's URL or DOI below. We'll try to auto-populate the fields — you can edit anything before submitting.
              </p>

              {/* URL row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
                    Paper URL or DOI
                  </label>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetch()}
                    placeholder="https://doi.org/10.xxxx/xxxxx"
                    style={inputStyle()}
                  />
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button
                    onClick={handleFetch}
                    disabled={!url.trim() || fetching || !!duplicate}
                    style={{
                      height: 37,
                      padding: '0 18px',
                      background: fetching ? 'rgba(200,122,65,0.3)' : 'var(--color-accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: !url.trim() || fetching ? 'default' : 'pointer',
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      opacity: !url.trim() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fetching ? (
                      <>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ animation: 'spin 0.8s linear infinite' }}>
                          <path strokeLinecap="round" d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 2 12" />
                        </svg>
                        Fetching…
                      </>
                    ) : 'Fetch Info'}
                  </button>
                </div>
              </div>

              {duplicate && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, marginBottom: 14, marginTop: -8 }}>
                  <svg width={16} height={16} fill="none" stroke="#7db5f5" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx={12} cy={12} r={10} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#7db5f5' }}>
                      This paper is already in the database.
                    </p>
                    {duplicate.title && (
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(250,250,250,0.5)' }}>
                        "{duplicate.title}"
                      </p>
                    )}
                    <a
                      href={duplicate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: '#7db5f5', textDecoration: 'underline' }}
                    >
                      View it in the database →
                    </a>
                  </div>
                </div>
              )}

              {fetchMsg && (
                <p style={{ fontSize: 12, color: fetched && title ? '#4ade80' : 'var(--color-muted)', marginBottom: 16, marginTop: -8 }}>
                  {fetched && title ? '✓ ' : ''}{fetchMsg}
                </p>
              )}

              {/* Form fields — shown after fetch attempt or always */}
              {(fetched || fetchMsg) && (
                <div style={{ display: 'grid', gap: 14 }}>
                  {/* Title */}
                  <Field label="Title">
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Paper title" style={inputStyle()} />
                  </Field>

                  {/* Authors + Year */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
                    <Field label="Authors">
                      <input value={authors} onChange={e => setAuthors(e.target.value)} placeholder="Author names" style={inputStyle()} />
                    </Field>
                    <Field label="Year">
                      <input value={year} onChange={e => setYear(e.target.value)} placeholder="2024" type="number" style={inputStyle()} />
                    </Field>
                  </div>

                  {/* Abstract */}
                  <Field label="Abstract">
                    <textarea
                      value={abstract}
                      onChange={e => setAbstract(e.target.value)}
                      placeholder="Paper abstract (optional)"
                      rows={4}
                      style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }}
                    />
                  </Field>

                  {/* Keywords */}
                  <Field label="Keywords (comma-separated)">
                    <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="keyword1, keyword2, …" style={inputStyle()} />
                  </Field>

                  {/* Category */}
                  <Field label="Category">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {CATEGORIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          style={{
                            padding: '4px 14px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                            border: `1px solid ${category === c ? CAT_COLOR[c] : 'var(--color-border)'}`,
                            background: category === c ? `${CAT_COLOR[c]}22` : 'transparent',
                            color: category === c ? CAT_COLOR[c] : 'var(--color-muted)',
                            fontFamily: 'inherit',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Simulants */}
                  <Field label="Simulants (select all that apply)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(simsByCategory).map(([cat, sims]) => (
                        <div key={cat}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: CAT_COLOR[cat] ?? 'var(--color-muted)', marginBottom: 6 }}>
                            {cat}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {sims.map(s => {
                              const on = selSims.includes(s.abbr)
                              return (
                                <button
                                  key={s.abbr}
                                  type="button"
                                  onClick={() => toggleSim(s.abbr)}
                                  style={{
                                    padding: '3px 11px',
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: `1px solid ${on ? (CAT_COLOR[cat] ?? 'var(--color-accent)') : 'var(--color-border)'}`,
                                    background: on ? `${CAT_COLOR[cat] ?? 'var(--color-accent)'}22` : 'transparent',
                                    color: on ? (CAT_COLOR[cat] ?? 'var(--color-accent)') : 'var(--color-muted)',
                                  }}
                                >
                                  {s.abbr}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Field>

                  {/* Applications */}
                  <Field label="Applications (select all that apply)">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {APPLICATIONS.map(a => {
                        const on = selApps.includes(a.id)
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleApp(a.id)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              cursor: 'pointer',
                              border: `1px solid ${on ? 'rgba(200,122,65,0.5)' : 'var(--color-border)'}`,
                              background: on ? 'rgba(200,122,65,0.12)' : 'transparent',
                              color: on ? 'var(--color-accent)' : 'var(--color-muted)',
                              fontFamily: 'inherit',
                            }}
                          >
                            {a.label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>

                  {/* Submit */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={reset}
                      style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || !url.trim() || !!duplicate}
                      style={{
                        padding: '8px 24px',
                        background: 'var(--color-accent)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: 'inherit',
                        cursor: submitting || !url.trim() ? 'default' : 'pointer',
                        opacity: !url.trim() ? 0.5 : 1,
                      }}
                    >
                      {submitting ? 'Submitting…' : 'Submit Paper'}
                    </button>
                  </div>
                </div>
              )}

              {/* Show form immediately if user doesn't fetch */}
              {!fetched && !fetchMsg && url.trim() && (
                <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
                  Press "Fetch Info" to auto-populate fields, or just submit the URL as-is.
                </p>
              )}
              {!fetched && !fetchMsg && !url.trim() && (
                <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', marginTop: 8 }}>
                  Paste a DOI (e.g. 10.1038/...) or any paper URL above to get started.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
