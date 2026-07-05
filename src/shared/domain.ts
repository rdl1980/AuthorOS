// Modello dati di dominio — progettato "cloud-ready":
// id UUID, timestamp ISO, ownerId nullable (null in V1 stand-alone, valorizzato in V2 cloud).
// Le stesse forme mappano 1:1 sullo schema SQLite (Drizzle) e su Postgres in V2.

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  title: string
  genre: string | null
  framework: string | null
  targetWordCount: number | null
  /** Scadenza del progetto (ISO date), usata per la proiezione ritmo (US-27.3). */
  deadline: string | null
  status: ProjectStatus
  ownerId: string | null
  createdAt: string
  updatedAt: string
}

export type NewProject = Pick<Project, 'title'> &
  Partial<Pick<Project, 'genre' | 'framework' | 'targetWordCount'>>

export type ProjectUpdate = Partial<
  Pick<Project, 'title' | 'genre' | 'framework' | 'targetWordCount' | 'status' | 'deadline'>
>

// --- Manoscritto (Epic 2) -------------------------------------------------

export interface Chapter {
  id: string
  projectId: string
  title: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type SceneStatus = 'draft' | 'revision' | 'final'

export interface Scene {
  id: string
  projectId: string
  chapterId: string
  title: string
  content: string
  wordCount: number
  /** Stato di lavorazione (US-26.2). */
  status: SceneStatus
  /** Metadati narrativi (US-28.1). */
  pov: string
  locationId: string | null
  synopsis: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId: string
  chapterId: string | null
  sceneId: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type SceneUpdate = Partial<
  Pick<Scene, 'title' | 'content' | 'status' | 'pov' | 'locationId' | 'synopsis'>
>

/** Personaggio presente in una scena (US-28.1). */
export interface SceneCharacterLink {
  sceneId: string
  characterId: string
}

/** Parole nette scritte in un giorno (US-27.1). */
export interface DailyStat {
  date: string
  wordsAdded: number
}

/** Esito di trova & sostituisci (US-26.1). */
export interface ReplaceResult {
  scenes: number
  occurrences: number
}

/** Aggregati di avanzamento per il conteggio parole/target (US-2.5). */
export interface ProjectStats {
  words: number
  scenes: number
  chapters: number
}

/** Riferimento di una nota: a una scena o a un capitolo. */
export type NoteScope = { sceneId: string } | { chapterId: string }

// --- Author Voice / Style Profile (Epic 23) -------------------------------

export interface StyleProfile {
  id: string
  projectId: string
  name: string
  /** Tono/registro sintetico (es. "ironico, asciutto, prima persona"). */
  tone: string
  /** Istruzioni/esempi per guidare l'AI a scrivere nella voce dell'autore. */
  instructions: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type NewStyleProfile = Pick<StyleProfile, 'name'> &
  Partial<Pick<StyleProfile, 'tone' | 'instructions'>>

export type StyleProfileUpdate = Partial<Pick<StyleProfile, 'name' | 'tone' | 'instructions'>>

// --- Story Structure / Beats (Epic 4) -------------------------------------

export interface Beat {
  id: string
  projectId: string
  framework: string
  beatKey: string
  title: string
  description: string
  sortOrder: number
  createdAt: string
}

/** Associazione scena↔beat (US-4.3). */
export interface BeatLink {
  beatId: string
  sceneId: string
}

// --- Character Bible & Arc (Epic 6 + Epic 5) ------------------------------

export interface Character {
  id: string
  projectId: string
  name: string
  role: string
  summary: string
  appearance: string
  traits: string
  createdAt: string
  updatedAt: string
}

export type NewCharacter = Pick<Character, 'name'> &
  Partial<Pick<Character, 'role' | 'summary' | 'appearance' | 'traits'>>

export type CharacterUpdate = Partial<
  Pick<Character, 'name' | 'role' | 'summary' | 'appearance' | 'traits'>
>

/** Relazione orientata tra due personaggi (US-6.2). */
export interface Relationship {
  id: string
  projectId: string
  fromId: string
  toId: string
  label: string
  createdAt: string
}

/** Arco di trasformazione (US-5.1/5.2): un arco per personaggio. */
export interface CharacterArc {
  id: string
  characterId: string
  desire: string
  need: string
  fear: string
  wound: string
  lie: string
  transformation: string
  createdAt: string
  updatedAt: string
}

export type ArcUpdate = Partial<
  Pick<CharacterArc, 'desire' | 'need' | 'fear' | 'wound' | 'lie' | 'transformation'>
>

/** Tappa dell'arco collegata a un capitolo (US-5.3). */
export interface ArcStep {
  id: string
  arcId: string
  chapterId: string
  description: string
  sortOrder: number
  createdAt: string
}

// --- World Building (Epic 7) -------------------------------------------------

export type WorldKind = 'place' | 'organization' | 'system'

export interface WorldElement {
  id: string
  projectId: string
  kind: WorldKind
  name: string
  description: string
  /** Dettagli liberi: regole, gerarchie, storia, aspetto… */
  details: string
  createdAt: string
  updatedAt: string
}

export type NewWorldElement = Pick<WorldElement, 'kind' | 'name'> &
  Partial<Pick<WorldElement, 'description' | 'details'>>

export type WorldElementUpdate = Partial<Pick<WorldElement, 'name' | 'description' | 'details'>>

// --- Timeline Engine (Epic 9) ----------------------------------------------

export interface TimelineEvent {
  id: string
  projectId: string
  title: string
  description: string
  /** Etichetta temporale libera, es. "Estate 1923", "10 anni prima". */
  whenLabel: string
  /** Valore cronologico numerico opzionale (es. anno) usato per il check di coerenza (US-9.3). */
  dateValue: number | null
  /** Luogo testuale; diventerà riferimento al World Building (Epic 7) in futuro. */
  location: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type NewTimelineEvent = Pick<TimelineEvent, 'title'> &
  Partial<Pick<TimelineEvent, 'description' | 'whenLabel' | 'dateValue' | 'location'>>

export type TimelineEventUpdate = Partial<
  Pick<TimelineEvent, 'title' | 'description' | 'whenLabel' | 'dateValue' | 'location'>
>

/** Collegamento evento↔personaggio (US-9.2, base della timeline personale US-6.3). */
export interface EventCharacterLink {
  eventId: string
  characterId: string
}

/** Incoerenza temporale rilevata (US-9.3). */
export interface TimelineIssue {
  eventId: string
  message: string
}
