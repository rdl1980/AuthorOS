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

// --- Template dei beat per framework (Epic 4) ------------------------------

export interface BeatTemplate {
  key: string
  title: string
  description: string
}

export const BEAT_TEMPLATES: Record<Framework, BeatTemplate[]> = {
  "Hero's Journey": [
    { key: 'ordinary_world', title: 'Ordinary World', description: 'Il mondo normale del protagonista prima dell’avventura.' },
    { key: 'call', title: 'Call To Adventure', description: 'Un evento spinge il protagonista verso l’avventura.' },
    { key: 'refusal', title: 'Refusal', description: 'Il protagonista esita o rifiuta la chiamata.' },
    { key: 'mentor', title: 'Mentor', description: 'Incontro con la guida che offre aiuto o conoscenza.' },
    { key: 'threshold', title: 'Crossing Threshold', description: 'Il protagonista entra nel mondo straordinario.' },
    { key: 'tests', title: 'Tests', description: 'Prove, alleati e nemici nel nuovo mondo.' },
    { key: 'ordeal', title: 'Ordeal', description: 'La prova centrale più difficile.' },
    { key: 'reward', title: 'Reward', description: 'La ricompensa ottenuta dopo l’ordalia.' },
    { key: 'return', title: 'Return', description: 'Il ritorno trasformato al mondo ordinario.' }
  ],
  'Save The Cat Writes a Novel': [
    { key: 'opening_image', title: 'Opening Image', description: 'Immagine iniziale che fotografa il punto di partenza.' },
    { key: 'theme_stated', title: 'Theme Stated', description: 'Il tema del libro viene enunciato.' },
    { key: 'setup', title: 'Setup', description: 'Presentazione del mondo e dei personaggi.' },
    { key: 'catalyst', title: 'Catalyst', description: 'L’evento che innesca la storia.' },
    { key: 'debate', title: 'Debate', description: 'Il protagonista esita su cosa fare.' },
    { key: 'break_two', title: 'Break Into Two', description: 'Scelta che porta nel secondo atto.' },
    { key: 'fun_games', title: 'Fun & Games', description: 'La promessa della premessa: il cuore del libro.' },
    { key: 'midpoint', title: 'Midpoint', description: 'Punto di svolta centrale, falsa vittoria o sconfitta.' },
    { key: 'bad_guys', title: 'Bad Guys Close In', description: 'Le forze antagoniste si stringono.' },
    { key: 'all_lost', title: 'All Is Lost', description: 'Il momento più buio.' },
    { key: 'dark_night', title: 'Dark Night of the Soul', description: 'Riflessione nel punto più basso.' },
    { key: 'break_three', title: 'Break Into Three', description: 'La soluzione emerge: si entra nel terzo atto.' },
    { key: 'finale', title: 'Finale', description: 'Il protagonista mette in pratica la lezione.' },
    { key: 'final_image', title: 'Final Image', description: 'Immagine finale, opposta a quella iniziale.' }
  ],
  'Three Act Structure': [
    { key: 'setup', title: 'Atto 1 — Setup', description: 'Presentazione di mondo, personaggi e status quo.' },
    { key: 'inciting', title: 'Incidente Scatenante', description: 'L’evento che mette in moto la trama.' },
    { key: 'pp1', title: 'Plot Point 1', description: 'Svolta che lancia il secondo atto.' },
    { key: 'rising', title: 'Atto 2 — Rising Action', description: 'Complicazioni crescenti e ostacoli.' },
    { key: 'midpoint', title: 'Midpoint', description: 'Punto di non ritorno centrale.' },
    { key: 'pp2', title: 'Plot Point 2', description: 'Crisi che lancia il terzo atto.' },
    { key: 'climax', title: 'Atto 3 — Climax', description: 'Confronto finale e culmine della tensione.' },
    { key: 'resolution', title: 'Resolution', description: 'Scioglimento e nuovo equilibrio.' }
  ],
  'Seven Point Story Structure': [
    { key: 'hook', title: 'Hook', description: 'Stato iniziale, opposto alla risoluzione.' },
    { key: 'pt1', title: 'Plot Turn 1', description: 'Il mondo cambia: inizia il viaggio.' },
    { key: 'pinch1', title: 'Pinch Point 1', description: 'Pressione dell’antagonista.' },
    { key: 'midpoint', title: 'Midpoint', description: 'Da reattivo ad attivo.' },
    { key: 'pinch2', title: 'Pinch Point 2', description: 'Massima pressione, sembra tutto perduto.' },
    { key: 'pt2', title: 'Plot Turn 2', description: 'L’ultimo pezzo per risolvere arriva.' },
    { key: 'resolution', title: 'Resolution', description: 'Climax e conclusione.' }
  ],
  'Snowflake Method': [
    { key: 'one_sentence', title: 'Frase riassuntiva', description: 'Il libro in una frase.' },
    { key: 'one_paragraph', title: 'Paragrafo riassuntivo', description: 'Setup, 3 disastri e finale.' },
    { key: 'characters', title: 'Schede personaggi', description: 'Sintesi di obiettivi e archi dei personaggi.' },
    { key: 'synopsis', title: 'Sinossi di pagina', description: 'Espansione del paragrafo in una pagina.' },
    { key: 'scene_list', title: 'Lista scene', description: 'Elenco delle scene del libro.' }
  ],
  'Dan Harmon Story Circle': [
    { key: 'you', title: 'You', description: 'Un personaggio in una zona di comfort.' },
    { key: 'need', title: 'Need', description: 'Ma desidera qualcosa.' },
    { key: 'go', title: 'Go', description: 'Entra in una situazione non familiare.' },
    { key: 'search', title: 'Search', description: 'Si adatta e cerca ciò che vuole.' },
    { key: 'find', title: 'Find', description: 'Ottiene ciò che cercava.' },
    { key: 'take', title: 'Take', description: 'Paga un prezzo per averlo.' },
    { key: 'return', title: 'Return', description: 'Torna alla situazione familiare.' },
    { key: 'change', title: 'Change', description: 'Essendo cambiato.' }
  ]
}
