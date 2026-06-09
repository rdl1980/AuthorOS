// Framework narrativi (Epic 4) e suggerimento per genere (US-1.2).
// Condivisi tra renderer (UI) e main, per coerenza.

export const FRAMEWORKS = [
  "Hero's Journey",
  'Save The Cat Writes a Novel',
  'Three Act Structure',
  'Seven Point Story Structure',
  'Snowflake Method',
  'Dan Harmon Story Circle'
] as const

export type Framework = (typeof FRAMEWORKS)[number]

export const GENRES = [
  'Fantasy',
  'Science Fiction',
  'Thriller',
  'Giallo / Mystery',
  'Romance',
  'Horror',
  'Storico',
  'Letteratura / Mainstream',
  'Young Adult',
  'Avventura'
] as const

/** Framework consigliato in base al genere (puro suggerimento, l'autore resta libero). */
const SUGGESTIONS: Record<string, Framework> = {
  Fantasy: "Hero's Journey",
  'Science Fiction': 'Seven Point Story Structure',
  Thriller: 'Save The Cat Writes a Novel',
  'Giallo / Mystery': 'Seven Point Story Structure',
  Romance: 'Save The Cat Writes a Novel',
  Horror: 'Dan Harmon Story Circle',
  Storico: 'Three Act Structure',
  'Letteratura / Mainstream': 'Three Act Structure',
  'Young Adult': "Hero's Journey",
  Avventura: "Hero's Journey"
}

export function suggestFramework(genre: string | null | undefined): Framework | null {
  if (!genre) return null
  return SUGGESTIONS[genre] ?? null
}
