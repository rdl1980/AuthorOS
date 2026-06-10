import { randomUUID } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import type { NewStyleProfile, StyleProfile, StyleProfileUpdate } from '@shared/domain'
import type { DB } from './db'
import { styleProfiles } from './schema'
import type { StyleRepository } from './types'

const now = (): string => new Date().toISOString()

export class SqliteStyleRepository implements StyleRepository {
  constructor(private readonly db: DB) {}

  list(projectId: string): StyleProfile[] {
    return this.db.orm
      .select()
      .from(styleProfiles)
      .where(eq(styleProfiles.projectId, projectId))
      .orderBy(asc(styleProfiles.createdAt))
      .all()
  }

  getActive(projectId: string): StyleProfile | null {
    return (
      this.db.orm
        .select()
        .from(styleProfiles)
        .where(and(eq(styleProfiles.projectId, projectId), eq(styleProfiles.isActive, true)))
        .get() ?? null
    )
  }

  create(projectId: string, input: NewStyleProfile): StyleProfile {
    const ts = now()
    const first = this.list(projectId).length === 0
    const profile: StyleProfile = {
      id: randomUUID(),
      projectId,
      name: input.name.trim() || 'Profilo di stile',
      tone: input.tone ?? '',
      instructions: input.instructions ?? '',
      isActive: first, // il primo profilo creato diventa attivo
      createdAt: ts,
      updatedAt: ts
    }
    this.db.orm.insert(styleProfiles).values(profile).run()
    this.db.persist()
    return profile
  }

  update(id: string, patch: StyleProfileUpdate): StyleProfile | null {
    const current = this.db.orm.select().from(styleProfiles).where(eq(styleProfiles.id, id)).get()
    if (!current) return null
    this.db.orm
      .update(styleProfiles)
      .set({
        name: patch.name !== undefined ? patch.name : current.name,
        tone: patch.tone !== undefined ? patch.tone : current.tone,
        instructions: patch.instructions !== undefined ? patch.instructions : current.instructions,
        updatedAt: now()
      })
      .where(eq(styleProfiles.id, id))
      .run()
    this.db.persist()
    return this.db.orm.select().from(styleProfiles).where(eq(styleProfiles.id, id)).get() ?? null
  }

  setActive(projectId: string, id: string): void {
    this.db.orm
      .update(styleProfiles)
      .set({ isActive: false, updatedAt: now() })
      .where(eq(styleProfiles.projectId, projectId))
      .run()
    this.db.orm
      .update(styleProfiles)
      .set({ isActive: true, updatedAt: now() })
      .where(eq(styleProfiles.id, id))
      .run()
    this.db.persist()
  }

  remove(id: string): boolean {
    this.db.orm.delete(styleProfiles).where(eq(styleProfiles.id, id)).run()
    this.db.persist()
    return true
  }
}
