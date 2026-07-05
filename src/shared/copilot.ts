// Author Copilot (Epic 20): dal testo strutturato generato dall'AI alla mappa
// del romanzo. Il formato è volutamente rigido e testuale (niente JSON) perché
// è robusto anche con modelli che aggiungono piccole variazioni.

import { FRAMEWORKS, type Framework } from './frameworks'

export interface BlueprintChapter {
  title: string
  synopsis: string
}

export interface BlueprintCharacter {
  name: string
  role: string
  summary: string
}

/** Mappa del romanzo proposta dal Copilot (US-20.1/20.2/20.3). */
export interface Blueprint {
  title: string
  genre: string
  logline: string
  framework: Framework | null
  chapters: BlueprintChapter[]
  characters: BlueprintCharacter[]
}

/**
 * Formato atteso dal Copilot (il prompt lo impone al modello):
 *
 *   TITOLO: ...
 *   GENERE: ...
 *   LOGLINE: ...
 *   FRAMEWORK: uno tra i FRAMEWORKS noti
 *   CAPITOLI:
 *   1. Titolo capitolo — sinossi in una riga
 *   PERSONAGGI:
 *   - Nome | Ruolo | Sintesi
 */
export function parseBlueprint(text: string): Blueprint | null {
  const lines = text.split('\n').map((l) => l.trim())
  const bp: Blueprint = {
    title: '',
    genre: '',
    logline: '',
    framework: null,
    chapters: [],
    characters: []
  }
  let section: 'none' | 'chapters' | 'characters' = 'none'

  for (const line of lines) {
    if (!line) continue
    const header = line.replace(/\*+/g, '') // tollera grassetti markdown
    const upper = header.toUpperCase()

    if (upper.startsWith('TITOLO:')) {
      bp.title = header.slice(header.indexOf(':') + 1).trim()
      section = 'none'
    } else if (upper.startsWith('GENERE:')) {
      bp.genre = header.slice(header.indexOf(':') + 1).trim()
      section = 'none'
    } else if (upper.startsWith('LOGLINE:')) {
      bp.logline = header.slice(header.indexOf(':') + 1).trim()
      section = 'none'
    } else if (upper.startsWith('FRAMEWORK:')) {
      const raw = header.slice(header.indexOf(':') + 1).trim().toLowerCase()
      bp.framework =
        FRAMEWORKS.find((f) => f.toLowerCase() === raw || raw.includes(f.toLowerCase())) ?? null
      section = 'none'
    } else if (upper.startsWith('CAPITOLI')) {
      section = 'chapters'
    } else if (upper.startsWith('PERSONAGGI')) {
      section = 'characters'
    } else if (section === 'chapters') {
      // "1. Titolo — sinossi" (accetta anche - o –)
      const m = line.match(/^\d+[.)]\s*(.+)$/)
      if (m) {
        const parts = m[1].split(/\s+[—–-]\s+/)
        bp.chapters.push({
          title: parts[0].trim(),
          synopsis: parts.slice(1).join(' — ').trim()
        })
      }
    } else if (section === 'characters') {
      const m = line.match(/^[-•*]\s*(.+)$/)
      if (m) {
        const parts = m[1].split('|').map((p) => p.trim())
        if (parts[0]) {
          bp.characters.push({
            name: parts[0],
            role: parts[1] ?? '',
            summary: parts.slice(2).join(' | ')
          })
        }
      }
    }
  }

  if (!bp.title || bp.chapters.length === 0) return null
  return bp
}

/** Campi dell'arco di trasformazione generati dal Copilot (US-20.4). */
export interface ParsedArc {
  desire: string
  need: string
  fear: string
  wound: string
  lie: string
  transformation: string
}

const ARC_LABELS: Record<string, keyof ParsedArc> = {
  DESIDERIO: 'desire',
  BISOGNO: 'need',
  PAURA: 'fear',
  FERITA: 'wound',
  BUGIA: 'lie',
  TRASFORMAZIONE: 'transformation'
}

/**
 * Formato atteso: una riga per campo, "ETICHETTA: testo" con etichette
 * DESIDERIO/BISOGNO/PAURA/FERITA/BUGIA/TRASFORMAZIONE.
 */
export function parseArc(text: string): ParsedArc | null {
  const arc: ParsedArc = { desire: '', need: '', fear: '', wound: '', lie: '', transformation: '' }
  let found = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\*+/g, '').trim()
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const label = line.slice(0, idx).trim().toUpperCase()
    const key = ARC_LABELS[label]
    if (key) {
      arc[key] = line.slice(idx + 1).trim()
      found = true
    }
  }
  return found ? arc : null
}
