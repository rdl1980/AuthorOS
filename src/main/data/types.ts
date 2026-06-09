import type { NewProject, Project, ProjectUpdate } from '@shared/domain'

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
