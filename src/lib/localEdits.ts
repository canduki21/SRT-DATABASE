const KEY = 'srt-paper-edits'

export interface PaperEdit {
  title?: string
  abstract?: string
}

export function getEdit(id: string): PaperEdit {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return all[id] || {}
  } catch { return {} }
}

export function saveEdit(id: string, edit: PaperEdit) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[id] = { ...all[id], ...edit }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}

export function clearEdit(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    delete all[id]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}
