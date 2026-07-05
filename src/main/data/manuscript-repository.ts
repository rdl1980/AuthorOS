import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type {
  Chapter,
  DailyStat,
  ReplaceResult,
  Note,
  NoteScope,
  ProjectStats,
  Scene,
  SceneCharacterLink,
  SceneUpdate
} from '@shared/domain'
import { countWords } from '@shared/text'
import type { DB } from './db'
import { randomUUID as uuid } from 'node:crypto'
import { beatScenes, chapters, notes, sceneCharacters, scenes, writingStats } from './schema'
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
      this.orm.delete(beatScenes).where(inArray(beatScenes.sceneId, sceneIds)).run()
      this.orm.delete(sceneCharacters).where(inArray(sceneCharacters.sceneId, sceneIds)).run()
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
      status: 'draft',
      pov: '',
      locationId: null,
      synopsis: '',
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
    const newCount = countWords(content)
    this.orm
      .update(scenes)
      .set({
        title: patch.title !== undefined ? patch.title : current.title,
        content,
        wordCount: newCount,
        status: patch.status !== undefined ? patch.status : current.status,
        pov: patch.pov !== undefined ? patch.pov : current.pov,
        locationId: patch.locationId !== undefined ? patch.locationId : current.locationId,
        synopsis: patch.synopsis !== undefined ? patch.synopsis : current.synopsis,
        updatedAt: now()
      })
      .where(eq(scenes.id, id))
      .run()
    // US-27.1: registra il delta di parole nel giorno corrente.
    this.recordDelta(current.projectId, newCount - current.wordCount)
    this.db.persist()
    return this.getScene(id)
  }

  /** Upsert delle parole nette scritte oggi (US-27.1). */
  private recordDelta(projectId: string, delta: number): void {
    if (delta === 0) return
    const today = new Date().toISOString().slice(0, 10)
    const existing = this.orm
      .select()
      .from(writingStats)
      .where(and(eq(writingStats.projectId, projectId), eq(writingStats.date, today)))
      .get()
    if (existing) {
      this.orm
        .update(writingStats)
        .set({ wordsAdded: existing.wordsAdded + delta })
        .where(eq(writingStats.id, existing.id))
        .run()
    } else {
      this.orm
        .insert(writingStats)
        .values({ id: uuid(), projectId, date: today, wordsAdded: delta })
        .run()
    }
  }

  getDailyStats(projectId: string, sinceDays: number): DailyStat[] {
    const cutoff = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10)
    return this.orm
      .select({ date: writingStats.date, wordsAdded: writingStats.wordsAdded })
      .from(writingStats)
      .where(eq(writingStats.projectId, projectId))
      .all()
      .filter((r) => r.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /** Trova & sostituisci letterale (US-26.1). */
  replaceText(
    projectId: string,
    find: string,
    replaceWith: string,
    opts: { sceneId?: string; matchCase?: boolean } = {}
  ): ReplaceResult {
    if (!find) return { scenes: 0, occurrences: 0 }
    const all = this.listScenes(projectId).filter(
      (s) => !opts.sceneId || s.id === opts.sceneId
    )
    let touched = 0
    let occurrences = 0
    for (const scene of all) {
      let count = 0
      let next: string
      if (opts.matchCase) {
        count = scene.content.split(find).length - 1
        next = scene.content.split(find).join(replaceWith)
      } else {
        const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        next = scene.content.replace(re, () => {
          count += 1
          return replaceWith
        })
      }
      if (count > 0) {
        this.updateScene(scene.id, { content: next })
        touched += 1
        occurrences += count
      }
    }
    return { scenes: touched, occurrences }
  }

  deleteScene(id: string): boolean {
    this.orm.delete(beatScenes).where(eq(beatScenes.sceneId, id)).run()
    this.orm.delete(sceneCharacters).where(eq(sceneCharacters.sceneId, id)).run()
    this.orm.delete(notes).where(eq(notes.sceneId, id)).run()
    this.orm.delete(scenes).where(eq(scenes.id, id)).run()
    this.db.persist()
    return true
  }

  // --- Personaggi in scena (US-28.1) ---------------------------------------

  listSceneCharacters(projectId: string): SceneCharacterLink[] {
    const sceneIds = this.listScenes(projectId).map((s) => s.id)
    if (!sceneIds.length) return []
    return this.orm
      .select({ sceneId: sceneCharacters.sceneId, characterId: sceneCharacters.characterId })
      .from(sceneCharacters)
      .where(inArray(sceneCharacters.sceneId, sceneIds))
      .all()
  }

  linkSceneCharacter(sceneId: string, characterId: string): void {
    const exists = this.orm
      .select()
      .from(sceneCharacters)
      .where(
        and(eq(sceneCharacters.sceneId, sceneId), eq(sceneCharacters.characterId, characterId))
      )
      .get()
    if (exists) return
    this.orm.insert(sceneCharacters).values({ id: randomUUID(), sceneId, characterId }).run()
    this.db.persist()
  }

  unlinkSceneCharacter(sceneId: string, characterId: string): void {
    this.orm
      .delete(sceneCharacters)
      .where(
        and(eq(sceneCharacters.sceneId, sceneId), eq(sceneCharacters.characterId, characterId))
      )
      .run()
    this.db.persist()
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
