import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { NewProject, Project, ProjectUpdate } from '@shared/domain'
import type { DB } from './db'
import { projects, type ProjectRow } from './schema'
import type { ProjectRepository } from './types'

const toDomain = (row: ProjectRow): Project => ({
  id: row.id,
  title: row.title,
  genre: row.genre,
  framework: row.framework,
  targetWordCount: row.targetWordCount,
  status: row.status,
  ownerId: row.ownerId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
})

/** Implementazione SQLite (sql.js) + Drizzle dell'interfaccia ProjectRepository. */
export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: DB) {}

  list(includeArchived = false): Project[] {
    const rows = this.db.orm.select().from(projects).all()
    const mapped = rows.map(toDomain)
    const visible = includeArchived ? mapped : mapped.filter((p) => p.status !== 'archived')
    return visible.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  get(id: string): Project | null {
    const row = this.db.orm.select().from(projects).where(eq(projects.id, id)).get()
    return row ? toDomain(row) : null
  }

  create(input: NewProject): Project {
    const now = new Date().toISOString()
    const project: Project = {
      id: randomUUID(),
      title: input.title,
      genre: input.genre ?? null,
      framework: input.framework ?? null,
      targetWordCount: input.targetWordCount ?? null,
      status: 'active',
      ownerId: null,
      createdAt: now,
      updatedAt: now
    }
    this.db.orm.insert(projects).values(project).run()
    this.db.persist()
    return project
  }

  update(id: string, patch: ProjectUpdate): Project | null {
    const current = this.get(id)
    if (!current) return null
    const updated: Project = {
      ...current,
      ...patch,
      genre: patch.genre !== undefined ? patch.genre : current.genre,
      framework: patch.framework !== undefined ? patch.framework : current.framework,
      targetWordCount:
        patch.targetWordCount !== undefined ? patch.targetWordCount : current.targetWordCount,
      updatedAt: new Date().toISOString()
    }
    this.db.orm
      .update(projects)
      .set({
        title: updated.title,
        genre: updated.genre,
        framework: updated.framework,
        targetWordCount: updated.targetWordCount,
        status: updated.status,
        updatedAt: updated.updatedAt
      })
      .where(eq(projects.id, id))
      .run()
    this.db.persist()
    return updated
  }

  duplicate(id: string): Project | null {
    const src = this.get(id)
    if (!src) return null
    return this.create({
      title: `${src.title} (copia)`,
      genre: src.genre ?? undefined,
      framework: src.framework ?? undefined,
      targetWordCount: src.targetWordCount ?? undefined
    })
  }

  setArchived(id: string, archived: boolean): Project | null {
    return this.update(id, { status: archived ? 'archived' : 'active' })
  }

  remove(id: string): boolean {
    const existing = this.get(id)
    if (!existing) return false
    this.db.orm.delete(projects).where(eq(projects.id, id)).run()
    this.db.persist()
    return true
  }
}
