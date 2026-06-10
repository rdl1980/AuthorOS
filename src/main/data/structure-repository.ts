import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Beat, BeatLink } from '@shared/domain'
import { BEAT_TEMPLATES, type Framework } from '@shared/frameworks'
import type { DB } from './db'
import { beats, beatScenes } from './schema'
import type { StructureRepository } from './types'

export class SqliteStructureRepository implements StructureRepository {
  constructor(private readonly db: DB) {}

  listBeats(projectId: string): Beat[] {
    return this.db.orm
      .select()
      .from(beats)
      .where(eq(beats.projectId, projectId))
      .orderBy(asc(beats.sortOrder))
      .all()
  }

  clear(projectId: string): void {
    const ids = this.listBeats(projectId).map((b) => b.id)
    if (ids.length) this.db.orm.delete(beatScenes).where(inArray(beatScenes.beatId, ids)).run()
    this.db.orm.delete(beats).where(eq(beats.projectId, projectId)).run()
    this.db.persist()
  }

  setFramework(projectId: string, framework: string): Beat[] {
    this.clear(projectId)
    const template = BEAT_TEMPLATES[framework as Framework]
    if (!template) return []
    const ts = new Date().toISOString()
    const rows: Beat[] = template.map((t, i) => ({
      id: randomUUID(),
      projectId,
      framework,
      beatKey: t.key,
      title: t.title,
      description: t.description,
      sortOrder: i,
      createdAt: ts
    }))
    for (const r of rows) this.db.orm.insert(beats).values(r).run()
    this.db.persist()
    return rows
  }

  links(projectId: string): BeatLink[] {
    const beatIds = this.listBeats(projectId).map((b) => b.id)
    if (!beatIds.length) return []
    return this.db.orm
      .select({ beatId: beatScenes.beatId, sceneId: beatScenes.sceneId })
      .from(beatScenes)
      .where(inArray(beatScenes.beatId, beatIds))
      .all()
  }

  linkScene(beatId: string, sceneId: string): void {
    const existing = this.db.orm
      .select()
      .from(beatScenes)
      .where(and(eq(beatScenes.beatId, beatId), eq(beatScenes.sceneId, sceneId)))
      .get()
    if (existing) return
    this.db.orm.insert(beatScenes).values({ id: randomUUID(), beatId, sceneId }).run()
    this.db.persist()
  }

  unlinkScene(beatId: string, sceneId: string): void {
    this.db.orm
      .delete(beatScenes)
      .where(and(eq(beatScenes.beatId, beatId), eq(beatScenes.sceneId, sceneId)))
      .run()
    this.db.persist()
  }
}
