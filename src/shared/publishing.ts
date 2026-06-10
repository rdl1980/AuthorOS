// Risultati delle operazioni di export/import (Epic 16 + 21), condivisi main/renderer.

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
  error?: string
}
