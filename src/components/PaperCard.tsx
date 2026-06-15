import { useState, useEffect } from 'react'
import type { Paper } from '../types'
import { fetchAbstractOnly } from '../lib/paperMetadata'
import { getEdit, saveEdit, clearEdit } from '../lib/localEdits'

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

const APP_LABELS: Record<string, string> = {
  construction:    'Construction',
  geotechnical:    'Geotechnical',
  isru:            'ISRU',
  biology:         'Biology',
  characterization:'Characterization',
  dust_mitigation: 'Dust Mitigation',
  radiation:       'Radiation',
}

function hostLabel(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 7,
  padding: '8px 11px',
  color: 'var(--color-text)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

interface Props { paper: Paper }

export default function PaperCard({ paper }: Props) {
  const [kwExpanded, setKwExpanded]         = useState(false)
  const [abstractOpen, setAbstractOpen]     = useState(false)
  const [abstractText, setAbstractText]     = useState<string | null>(null)
  const [abstractLoading, setAbstractLoading] = useState(false)

  // ── edit state ──────────────────────────────────────────────────────────
  const [editing, setEditing]       = useState(false)
  const [editTitle, setEditTitle]   = useState('')
  const [editAbstract, setEditAbstract] = useState('')
  const [saved, setSaved]           = useState(false)

  // Local overrides (from localStorage)
  const [localTitle, setLocalTitle]     = useState<string | undefined>()
  const [localAbstract, setLocalAbstract] = useState<string | undefined>()

  useEffect(() => {
    const e = getEdit(paper.id)
    setLocalTitle(e.title)
    setLocalAbstract(e.abstract)
  }, [paper.id])

  const displayTitle    = localTitle    ?? paper.title
  const displayAbstract = localAbstract ?? abstractText

  const cat = CATEGORY_COLOR[paper.category] ?? CATEGORY_COLOR.general

  // ── abstract fetch ──────────────────────────────────────────────────────
  async function toggleAbstract() {
    if (abstractOpen) { setAbstractOpen(false); return }
    setAbstractOpen(true)
    // If we already have a local override or fetched text, no need to fetch
    if (localAbstract || abstractText !== null) return
    setAbstractLoading(true)
    const text = await fetchAbstractOnly(paper.url, paper.title)
    setAbstractText(text || '')
    setAbstractLoading(false)
  }

  // ── edit handlers ───────────────────────────────────────────────────────
  function openEdit() {
    setEditTitle(localTitle ?? paper.title ?? '')
    setEditAbstract(localAbstract ?? abstractText ?? '')
    setEditing(true)
    setSaved(false)
  }

  function handleSave() {
    const newTitle    = editTitle.trim()    || undefined
    const newAbstract = editAbstract.trim() || undefined
    saveEdit(paper.id, { title: newTitle, abstract: newAbstract })
    setLocalTitle(newTitle)
    setLocalAbstract(newAbstract)
    // If abstract panel is open, sync display
    if (newAbstract) setAbstractText(newAbstract)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClear() {
    clearEdit(paper.id)
    setLocalTitle(undefined)
    setLocalAbstract(undefined)
    setEditing(false)
  }

  const hasLocalEdit = !!(localTitle || localAbstract)

  return (
    <article
      className="rounded-lg p-5 transition-all"
      style={{ background: 'var(--color-surface)', border: `1px solid ${editing ? 'rgba(200,122,65,0.5)' : 'var(--color-border)'}` }}
      onMouseEnter={e => { if (!editing) e.currentTarget.style.borderColor = 'rgba(200,122,65,0.4)' }}
      onMouseLeave={e => { if (!editing) e.currentTarget.style.borderColor = 'var(--color-border)' }}
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
          {/* Title */}
          {!editing ? (
            <button
              onClick={toggleAbstract}
              className="group block text-left w-full"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <h3
                className="text-base font-semibold leading-snug transition-colors group-hover:underline"
                style={{ color: displayTitle ? 'var(--color-text)' : 'var(--color-muted)', fontFamily: 'inherit' }}
              >
                {displayTitle ?? <span className="italic text-sm">Untitled — click edit to add a title</span>}
                {hasLocalEdit && (
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', verticalAlign: 'middle' }}>
                    EDITED
                  </span>
                )}
              </h3>
            </button>
          ) : (
            <textarea
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Paper title"
              rows={2}
              style={{ ...inputBase, resize: 'vertical', fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 2 }}
              autoFocus
            />
          )}

          {/* Meta */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--color-muted)' }}>
            {paper.authors && <span style={{ color: 'rgba(250,250,250,0.65)' }}>{paper.authors}</span>}
            {paper.year    && <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{paper.year}</span>}
            <span>{hostLabel(paper.url)}</span>
          </div>

          {/* Simulant chips */}
          {paper.simulants.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {paper.simulants.map(s => {
                const style = SIM_CHIP[SIM_CAT[s] ?? 'asteroid'] ?? SIM_CHIP.asteroid
                return (
                  <span key={s} className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.color }}>
                    {s}
                  </span>
                )
              })}
            </div>
          )}

          {/* Application tags */}
          {(paper.applications ?? []).filter(a => a !== 'other').length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(paper.applications ?? []).filter(a => a !== 'other').map(a => (
                <span key={a} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: 'rgba(200,122,65,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(200,122,65,0.25)' }}>
                  {APP_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          )}

          {/* ── Abstract panel ── */}
          {!editing && abstractOpen && (
            <div style={{
              marginTop: 12, padding: '12px 14px',
              background: 'rgba(0,0,0,0.25)', borderRadius: 8,
              border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-accent)',
            }}>
              {abstractLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-muted)', fontSize: 13 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                    style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                    <path strokeLinecap="round" d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 2 12" />
                  </svg>
                  Fetching abstract…
                </div>
              ) : displayAbstract ? (
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(250,250,250,0.8)', lineHeight: 1.65 }}>
                  {displayAbstract}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic' }}>
                  No abstract available. Use the edit button to add one manually.
                </p>
              )}
            </div>
          )}

          {/* ── Edit panel ── */}
          {editing && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 6 }}>
                Abstract
              </label>
              <textarea
                value={editAbstract}
                onChange={e => setEditAbstract(e.target.value)}
                placeholder="Paste or type the abstract here…"
                rows={5}
                style={{ ...inputBase, resize: 'vertical', lineHeight: 1.55 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                {hasLocalEdit && (
                  <button
                    onClick={handleClear}
                    style={{ fontSize: 12, color: '#f97474', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginRight: 'auto' }}
                  >
                    Clear edits
                  </button>
                )}
                <button
                  onClick={() => setEditing(false)}
                  style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 7, color: 'var(--color-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{ padding: '6px 16px', background: 'var(--color-accent)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom toggle row ── */}
          {!editing && (
            <div className="mt-2 flex items-center gap-4">
              <button onClick={toggleAbstract}
                style={{ color: abstractOpen ? 'var(--color-accent)' : 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 11 }}>
                {abstractOpen ? '▲ hide abstract' : '▼ view abstract'}
              </button>
              {paper.keywords.length > 0 && (
                <button onClick={() => setKwExpanded(e => !e)}
                  style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 11 }}>
                  {kwExpanded ? '▲ hide keywords' : `▼ ${paper.keywords.length} keywords`}
                </button>
              )}
            </div>
          )}

          {kwExpanded && !editing && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {paper.keywords.map(k => (
                <span key={k} className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right-side buttons: edit + external link */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {/* Edit / saved indicator */}
          <button
            onClick={editing ? handleSave : openEdit}
            title={editing ? 'Save edits' : 'Edit title & abstract'}
            style={{ color: editing ? 'var(--color-accent)' : saved ? '#4ade80' : 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {saved ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : editing ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </button>

          {/* Open paper */}
          <a href={paper.url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: 'var(--color-muted)' }} title="Open paper">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </article>
  )
}
