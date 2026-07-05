// Risultati delle operazioni di export/import (Epic 16 + 21 + 31), condivisi main/renderer.

/** Front matter configurabile (US-31.2). */
export interface FrontMatter {
  /** Nome dell'autore (frontespizio e intestazioni Shunn). */
  author?: string
  /** Riga di copyright, es. "© 2026 Nome Autore". */
  copyright?: string
  /** Dedica, su pagina dedicata. */
  dedication?: string
}

/** Opzioni di export professionale (Epic 31). */
export interface ExportOptions {
  /** US-31.1: 'shunn' = formato manoscritto standard (DOCX). */
  template?: 'standard' | 'shunn'
  /** US-31.4: esporta solo questi capitoli (vuoto/assente = tutti). */
  chapterIds?: string[]
  /** US-31.2: frontespizio, copyright, dedica. */
  frontMatter?: FrontMatter
  /** US-31.3 (EPUB): chiedi un'immagine di copertina prima dell'export. */
  pickCover?: boolean
}

export interface ExportResult {
  ok: boolean
  path?: string
  /** 'annullato' quando l'utente chiude il dialogo di salvataggio. */
  error?: string
}

export interface ImportResult {
  ok: boolean
  chapters?: number
  scenes?: number
  words?: number
  /** Beat coperti dall'autowire import→struttura (US-21.5); assente se nessun framework. */
  beatsLinked?: number
  error?: string
}
