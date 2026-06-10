import type {
  Chapter,
  NewProject,
  Note,
  NoteScope,
  Project,
  ProjectStats,
  ProjectUpdate,
  Scene,
  SceneUpdate
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
