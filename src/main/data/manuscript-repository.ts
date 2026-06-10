import { randomUUID } from 'node:crypto'
import { asc, eq, inArray } from 'drizzle-orm'
import type {
  Chapter,
  Note,
  NoteScope,
  ProjectStats,
  Scene,
  SceneUpdate
} from '@shared/domain'
import { countWords } from '@shared/text'
import type { DB } from './db'
import { chapters, notes, scenes } from './schema'
import type { ManuscriptRepository } from './types'

const now = (): string => new Date().toISOString()

export class SqliteManuscriptRepository implements ManuscriptRepository {
  constructor(private readonly db: DB) {}

  private get orm() {
    return this.db.orm
  }

  // --- Capitoli -----------------------------------------------------------

  listChapters(projectId: string): Chapter[] {
    return this.orm
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(asc(chapters.sortOrder))
      .all()
  }

  createChapter(projectId: string, title: string): Chapter {
    const ts = now()
    const chapter: Chapter = {
      id: randomUUID(),
      projectId,
      title: title.trim() || 'Nuovo capitolo',
      sortOrder: this.listChapters(projectId).length,
      createdAt: ts,
      updatedAt: ts
    }
    this.orm.insert(chapters).values(chapter).run()
    this.db.persist()
    return chapter
  }

  renameChapter(id: string, title: string): Chapter | null {
    this.orm
      .update(chapters)
      .set({ title: title.trim() || 'Capitolo', updatedAt: now() })
      .where(eq(chapters.id, id))
      .run()
    this.db.persist()
    return this.orm.select().from(chapters).where(eq(chapters.id, id)).get() ?? null
  }

  deleteChapter(id: string): boolean {
    const sceneIds = this.orm
      .select({ id: scenes.id })
      .from(scenes)
      .where(eq(scenes.chapterId, id))
      .all()
      .map((r) => r.id)
    if (sceneIds.length) {
      this.orm.delete(notes).where(inArray(notes.sceneId, sceneIds)).run()
      this.orm.delete(scenes).where(inArray(scenes.id, sceneIds)).run()
    }
    this.orm.delete(notes).where(eq(notes.chapterId, id)).run()
    this.orm.delete(chapters).where(eq(chapters.id, id)).run()
    this.db.persist()
    return true
  }

  reorderChapters(_projectId: string, orderedIds: string[]): void {
    this.setChapterOrder(orderedIds)
    this.db.persist()
  }

  // --- Scene --------------------------------------------------------------

  listScenes(projectId: string): Scene[] {
    return this.orm
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.sortOrder))
      .all()
  }

  getScene(id: string): Scene | null {
    return this.orm.select().from(scenes).where(eq(scenes.id, id)).get() ?? null
  }

  private sceneIdsOfChapter(chapterId: string): string[] {
    return this.orm
      .select({ id: scenes.id })
      .from(scenes)
      .where(eq(scenes.chapterId, chapterId))
      .orderBy(asc(scenes.sortOrder))
      .all()
      .map((r) => r.id)
  }

  createScene(projectId: string, chapterId: string, title: string): Scene {
    const ts = now()
    const scene: Scene = {
      id: randomUUID(),
      projectId,
      chapterId,
      title: title.trim() || 'Nuova scena',
      content: '',
      wordCount: 0,
      sortOrder: this.sceneIdsOfChapter(chapterId).length,
      createdAt: ts,
      updatedAt: ts
    }
    this.orm.insert(scenes).values(scene).run()
    this.db.persist()
    return scene
  }

  updateScene(id: string, patch: SceneUpdate): Scene | null {
    const current = this.getScene(id)
    if (!current) return null
    const content = patch.content !== undefined ? patch.content : current.content
    this.orm
      .update(scenes)
      .set({
        title: patch.title !== undefined ? patch.title : current.title,
        content,
        wordCount: countWords(content),
        updatedAt: now()
      })
      .where(eq(scenes.id, id))
      .run()
    this.db.persist()
    return this.getScene(id)
  }

  deleteScene(id: string): boolean {
    this.orm.delete(notes).where(eq(notes.sceneId, id)).run()
    this.orm.delete(scenes).where(eq(scenes.id, id)).run()
    this.db.persist()
    return true
  }

  reorderScenes(_chapterId: string, orderedIds: string[]): void {
    this.setSceneOrder(orderedIds)
    this.db.persist()
  }

  moveScene(sceneId: string, toChapterId: string, toIndex: number): void {
    const scene = this.getScene(sceneId)
    if (!scene) return
    const fromChapterId = scene.chapterId

    this.orm
      .update(scenes)
      .set({ chapterId: toChapterId, updatedAt: now() })
      .where(eq(scenes.id, sceneId))
      .run()

    const target = this.sceneIdsOfChapter(toChapterId).filter((id) => id !== sceneId)
    const index = Math.max(0, Math.min(toIndex, target.length))
    target.splice(index, 0, sceneId)
    this.setSceneOrder(target)

    if (fromChapterId !== toChapterId) {
      this.setSceneOrder(this.sceneIdsOfChapter(fromChapterId))
    }
    this.db.persist()
  }

  // --- Note (US-2.6) ------------------------------------------------------

  listNotes(projectId: string, scope?: NoteScope): Note[] {
    const rows = this.orm
      .select()
      .from(notes)
      .where(eq(notes.projectId, projectId))
      .orderBy(asc(notes.createdAt))
      .all()
    if (!scope) return rows
    if ('sceneId' in scope) return rows.filter((n) => n.sceneId === scope.sceneId)
    return rows.filter((n) => n.chapterId === scope.chapterId)
  }

  createNote(projectId: string, scope: NoteScope, content: string): Note {
    const ts = now()
    const note: Note = {
      id: randomUUID(),
      projectId,
      chapterId: 'chapterId' in scope ? scope.chapterId : null,
      sceneId: 'sceneId' in scope ? scope.sceneId : null,
      content,
      createdAt: ts,
      updatedAt: ts
    }
    this.orm.insert(notes).values(note).run()
    this.db.persist()
    return note
  }

  updateNote(id: string, content: string): Note | null {
    this.orm.update(notes).set({ content, updatedAt: now() }).where(eq(notes.id, id)).run()
    this.db.persist()
    return this.orm.select().from(notes).where(eq(notes.id, id)).get() ?? null
  }

  deleteNote(id: string): boolean {
    this.orm.delete(notes).where(eq(notes.id, id)).run()
    this.db.persist()
    return true
  }

  // --- Stats (US-2.5) -----------------------------------------------------

  getStats(projectId: string): ProjectStats {
    const sceneRows = this.orm
      .select({ w: scenes.wordCount })
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .all()
    const chapterCount = this.orm
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .all().length
    return {
      words: sceneRows.reduce((a, r) => a + (r.w ?? 0), 0),
      scenes: sceneRows.length,
      chapters: chapterCount
    }
  }

  // --- helper -------------------------------------------------------------

  /** Imposta sort_order = indice per ogni id, senza persistere (lo fa il chiamante). */
  private setChapterOrder(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      this.orm
        .update(chapters)
        .set({ sortOrder: index, updatedAt: now() })
        .where(eq(chapters.id, id))
        .run()
    })
  }

  private setSceneOrder(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      this.orm
        .update(scenes)
        .set({ sortOrder: index, updatedAt: now() })
        .where(eq(scenes.id, id))
        .run()
    })
  }
}
