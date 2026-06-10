// Ricerca full-text di progetto (US-24.1) e snapshot locali (US-24.2/24.3).

export type SearchKind = 'scene' | 'chapter' | 'note' | 'character' | 'event'

export interface SearchResult {
  kind: SearchKind
  id: string
  title: string
  /** Estratto del testo attorno alla corrispondenza. */
  snippet: string
  /** Per le scene: capitolo di appartenenza (per aprirle nel Workspace). */
  chapterId?: string
}

export interface SnapshotMeta {
  /** Nome file dello snapshot (chiave per ripristino/eliminazione). */
  file: string
  label: string
  kind: 'manual' | 'auto'
  createdAt: string
  words: number
}
