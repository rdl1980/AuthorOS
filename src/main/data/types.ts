import type {
  ArcStep,
  ArcUpdate,
  Beat,
  BeatLink,
  Chapter,
  Character,
  CharacterArc,
  CharacterUpdate,
  EventCharacterLink,
  NewCharacter,
  NewTimelineEvent,
  Relationship,
  NewWorldElement,
  TimelineEvent,
  TimelineEventUpdate,
  TimelineIssue,
  WorldElement,
  WorldElementUpdate,
  WorldKind,
  NewProject,
  NewStyleProfile,
  Note,
  NoteScope,
  Project,
  ProjectStats,
  ProjectUpdate,
  Scene,
  SceneUpdate,
  StyleProfile,
  StyleProfileUpdate
} from '@shared/domain'

/**
 * Interfaccia di persistenza dei progetti. Indipendente dall'implementazione:
 * oggi SQLite (sql.js) + Drizzle, domani eventualmente better-sqlite3 o Postgres (V2)
 * senza impatto sul resto dell'app.
 */
export interface ProjectRepository {
  list(includeArchived?: boolean): Project[]
  get(id: string): Project | null
  create(input: NewProject): Project
  update(id: string, patch: ProjectUpdate): Project | null
  duplicate(id: string): Project | null
  setArchived(id: string, archived: boolean): Project | null
  remove(id: string): boolean
}

/**
 * Persistenza del manoscritto: capitoli, scene e note (Epic 2).
 * Le scene memorizzano contenuto Markdown; il word count è ricalcolato a ogni salvataggio.
 */
export interface ManuscriptRepository {
  // Capitoli
  listChapters(projectId: string): Chapter[]
  createChapter(projectId: string, title: string): Chapter
  renameChapter(id: string, title: string): Chapter | null
  deleteChapter(id: string): boolean
  reorderChapters(projectId: string, orderedIds: string[]): void

  // Scene
  listScenes(projectId: string): Scene[]
  getScene(id: string): Scene | null
  createScene(projectId: string, chapterId: string, title: string): Scene
  updateScene(id: string, patch: SceneUpdate): Scene | null
  deleteScene(id: string): boolean
  reorderScenes(chapterId: string, orderedIds: string[]): void
  /** Sposta una scena in un capitolo (anche diverso) a una posizione (US-2.2). */
  moveScene(sceneId: string, toChapterId: string, toIndex: number): void

  // Note (US-2.6)
  listNotes(projectId: string, scope?: NoteScope): Note[]
  createNote(projectId: string, scope: NoteScope, content: string): Note
  updateNote(id: string, content: string): Note | null
  deleteNote(id: string): boolean

  // Avanzamento (US-2.5)
  getStats(projectId: string): ProjectStats
}

/** Profili di stile / Author Voice (Epic 23). Un solo profilo attivo per progetto. */
export interface StyleRepository {
  list(projectId: string): StyleProfile[]
  getActive(projectId: string): StyleProfile | null
  create(projectId: string, input: NewStyleProfile): StyleProfile
  update(id: string, patch: StyleProfileUpdate): StyleProfile | null
  setActive(projectId: string, id: string): void
  remove(id: string): boolean
}

/** Character Bible (Epic 6) + Character Arc Engine (Epic 5). */
export interface CharacterRepository {
  // Schede (US-6.1)
  listCharacters(projectId: string): Character[]
  createCharacter(projectId: string, input: NewCharacter): Character
  updateCharacter(id: string, patch: CharacterUpdate): Character | null
  /** Elimina personaggio a cascata: arco, tappe e relazioni. */
  deleteCharacter(id: string): boolean

  // Relazioni (US-6.2)
  listRelationships(projectId: string): Relationship[]
  addRelationship(projectId: string, fromId: string, toId: string, label: string): Relationship
  removeRelationship(id: string): boolean

  // Arco di trasformazione (US-5.1/5.2) — creato lazy al primo accesso
  getArc(characterId: string): CharacterArc
  updateArc(characterId: string, patch: ArcUpdate): CharacterArc

  // Tappe dell'arco collegate ai capitoli (US-5.3)
  listArcSteps(arcId: string): ArcStep[]
  addArcStep(arcId: string, chapterId: string, description: string): ArcStep
  removeArcStep(id: string): boolean
}

/** World Building (Epic 7): luoghi, organizzazioni, sistemi/regole. */
export interface WorldRepository {
  list(projectId: string, kind?: WorldKind): WorldElement[]
  create(projectId: string, input: NewWorldElement): WorldElement
  update(id: string, patch: WorldElementUpdate): WorldElement | null
  remove(id: string): boolean
}

/** Timeline Engine (Epic 9) + base della timeline personale (US-6.3). */
export interface TimelineRepository {
  listEvents(projectId: string): TimelineEvent[]
  createEvent(projectId: string, input: NewTimelineEvent): TimelineEvent
  updateEvent(id: string, patch: TimelineEventUpdate): TimelineEvent | null
  deleteEvent(id: string): boolean
  reorder(projectId: string, orderedIds: string[]): void

  // Collegamenti evento↔personaggio (US-9.2)
  links(projectId: string): EventCharacterLink[]
  linkCharacter(eventId: string, characterId: string): void
  unlinkCharacter(eventId: string, characterId: string): void

  /** Incoerenze: ordine manuale che contraddice i valori cronologici (US-9.3). */
  issues(projectId: string): TimelineIssue[]
}

/** Struttura narrativa: framework e beat di progetto, mapping scene↔beat (Epic 4). */
export interface StructureRepository {
  listBeats(projectId: string): Beat[]
  /** Imposta il framework: rigenera i beat del progetto dal template. */
  setFramework(projectId: string, framework: string): Beat[]
  clear(projectId: string): void
  links(projectId: string): BeatLink[]
  linkScene(beatId: string, sceneId: string): void
  unlinkScene(beatId: string, sceneId: string): void
}
