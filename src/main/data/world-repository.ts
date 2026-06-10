import { randomUUID } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import type { NewWorldElement, WorldElement, WorldElementUpdate, WorldKind } from '@shared/domain'
import type { DB } from './db'
import { worldElements } from './schema'
import type { WorldRepository } from './types'

const now = (): string => new Date().toISOString()

export class SqliteWorldRepository implements WorldRepository {
  constructor(private readonly db: DB) {}

  list(projectId: string, kind?: WorldKind): WorldElement[] {
    const where = kind
      ? and(eq(worldElements.projectId, projectId), eq(worldElements.kind, kind))
      : eq(worldElements.projectId, projectId)
    return this.db.orm.select().from(worldElements).where(where).orderBy(asc(worldElements.createdAt)).all()
  }

  create(projectId: string, input: NewWorldElement): WorldElement {
    const ts = now()
    const element: WorldElement = {
      id: randomUUID(),
      projectId,
      kind: input.kind,
      name: input.name.trim() || 'Elemento',
      description: input.description ?? '',
      details: input.details ?? '',
      createdAt: ts,
      updatedAt: ts
    }
    this.db.orm.insert(worldElements).values(element).run()
    this.db.persist()
    return element
  }

  update(id: string, patch: WorldElementUpdate): WorldElement | null {
    const current = this.db.orm.select().from(worldElements).where(eq(worldElements.id, id)).get()
    if (!current) return null
    this.db.orm
      .update(worldElements)
      .set({
        name: patch.name !== undefined ? patch.name : current.name,
        description: patch.description !== undefined ? patch.description : current.description,
        details: patch.details !== undefined ? patch.details : current.details,
        updatedAt: now()
      })
      .where(eq(worldElements.id, id))
      .run()
    this.db.persist()
    return this.db.orm.select().from(worldElements).where(eq(worldElements.id, id)).get() ?? null
  }

  remove(id: string): boolean {
    this.db.orm.delete(worldElements).where(eq(worldElements.id, id)).run()
    this.db.persist()
    return true
  }
}
