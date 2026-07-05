import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import type { NewProject, Project, ProjectUpdate } from '@shared/domain'
import type { DB } from './db'
import {
  arcSteps,
  beatScenes,
  beats,
  characterArcs,
  characters,
  chapters,
  eventCharacters,
  notes,
  projects,
  relationships,
  sceneCharacters,
  scenes,
  styleProfiles,
  timelineEvents,
  worldElements,
  writingStats,
  type ProjectRow
} from './schema'
import type { ProjectRepository } from './types'

const toDomain = (row: ProjectRow): Project => ({
  id: row.id,
  title: row.title,
  genre: row.genre,
  framework: row.framework,
  targetWordCount: row.targetWordCount,
  deadline: row.deadline,
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
      deadline: null,
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
      deadline: patch.deadline !== undefined ? patch.deadline : current.deadline,
      updatedAt: new Date().toISOString()
    }
    this.db.orm
      .update(projects)
      .set({
        title: updated.title,
        genre: updated.genre,
        framework: updated.framework,
        targetWordCount: updated.targetWordCount,
        deadline: updated.deadline,
        status: updated.status,
        updatedAt: updated.updatedAt
      })
      .where(eq(projects.id, id))
      .run()
    this.db.persist()
    return updated
  }

  /**
   * Duplicazione profonda (US-1.4 "varianti o versioni alternative"): copia
   * manoscritto, note, struttura (beat + link), profili di stile e personaggi
   * (relazioni, archi, tappe) rimappando tutti gli id.
   */
  duplicate(id: string): Project | null {
    const src = this.get(id)
    if (!src) return null
    const orm = this.db.orm
    const now = new Date().toISOString()

    const copy = this.create({
      title: `${src.title} (copia)`,
      genre: src.genre ?? undefined,
      framework: src.framework ?? undefined,
      targetWordCount: src.targetWordCount ?? undefined
    })

    // Capitoli e scene (con mappa vecchio→nuovo id)
    const chapterMap = new Map<string, string>()
    for (const ch of orm.select().from(chapters).where(eq(chapters.projectId, id)).all()) {
      const nid = randomUUID()
      chapterMap.set(ch.id, nid)
      orm
        .insert(chapters)
        .values({ ...ch, id: nid, projectId: copy.id, createdAt: now, updatedAt: now })
        .run()
    }
    // World Building copiato prima delle scene: serve la mappa per scenes.locationId
    const worldMap = new Map<string, string>()
    for (const w of orm.select().from(worldElements).where(eq(worldElements.projectId, id)).all()) {
      const nid = randomUUID()
      worldMap.set(w.id, nid)
      orm
        .insert(worldElements)
        .values({ ...w, id: nid, projectId: copy.id, createdAt: now, updatedAt: now })
        .run()
    }

    const sceneMap = new Map<string, string>()
    const srcScenes = orm.select().from(scenes).where(eq(scenes.projectId, id)).all()
    for (const sc of srcScenes) {
      const nid = randomUUID()
      sceneMap.set(sc.id, nid)
      orm
        .insert(scenes)
        .values({
          ...sc,
          id: nid,
          projectId: copy.id,
          chapterId: chapterMap.get(sc.chapterId) ?? sc.chapterId,
          locationId: sc.locationId ? (worldMap.get(sc.locationId) ?? null) : null,
          createdAt: now,
          updatedAt: now
        })
        .run()
    }

    // Note (scope rimappato)
    for (const n of orm.select().from(notes).where(eq(notes.projectId, id)).all()) {
      orm
        .insert(notes)
        .values({
          ...n,
          id: randomUUID(),
          projectId: copy.id,
          chapterId: n.chapterId ? (chapterMap.get(n.chapterId) ?? null) : null,
          sceneId: n.sceneId ? (sceneMap.get(n.sceneId) ?? null) : null,
          createdAt: now,
          updatedAt: now
        })
        .run()
    }

    // Struttura: beat + link scena↔beat
    const beatMap = new Map<string, string>()
    const srcBeats = orm.select().from(beats).where(eq(beats.projectId, id)).all()
    for (const b of srcBeats) {
      const nid = randomUUID()
      beatMap.set(b.id, nid)
      orm.insert(beats).values({ ...b, id: nid, projectId: copy.id, createdAt: now }).run()
    }
    if (srcBeats.length) {
      const links = orm
        .select()
        .from(beatScenes)
        .where(inArray(beatScenes.beatId, srcBeats.map((b) => b.id)))
        .all()
      for (const l of links) {
        const beatId = beatMap.get(l.beatId)
        const sceneId = sceneMap.get(l.sceneId)
        if (beatId && sceneId) {
          orm.insert(beatScenes).values({ id: randomUUID(), beatId, sceneId }).run()
        }
      }
    }

    // Profili di stile
    for (const sp of orm.select().from(styleProfiles).where(eq(styleProfiles.projectId, id)).all()) {
      orm
        .insert(styleProfiles)
        .values({ ...sp, id: randomUUID(), projectId: copy.id, createdAt: now, updatedAt: now })
        .run()
    }

    // Personaggi: schede, relazioni, archi e tappe
    const charMap = new Map<string, string>()
    const srcChars = orm.select().from(characters).where(eq(characters.projectId, id)).all()
    for (const c of srcChars) {
      const nid = randomUUID()
      charMap.set(c.id, nid)
      orm
        .insert(characters)
        .values({ ...c, id: nid, projectId: copy.id, createdAt: now, updatedAt: now })
        .run()
    }
    for (const r of orm.select().from(relationships).where(eq(relationships.projectId, id)).all()) {
      const fromId = charMap.get(r.fromId)
      const toId = charMap.get(r.toId)
      if (fromId && toId) {
        orm
          .insert(relationships)
          .values({ id: randomUUID(), projectId: copy.id, fromId, toId, label: r.label, createdAt: now })
          .run()
      }
    }
    if (srcChars.length) {
      const arcs = orm
        .select()
        .from(characterArcs)
        .where(inArray(characterArcs.characterId, srcChars.map((c) => c.id)))
        .all()
      for (const a of arcs) {
        const characterId = charMap.get(a.characterId)
        if (!characterId) continue
        const newArcId = randomUUID()
        orm
          .insert(characterArcs)
          .values({ ...a, id: newArcId, characterId, createdAt: now, updatedAt: now })
          .run()
        const steps = orm.select().from(arcSteps).where(eq(arcSteps.arcId, a.id)).all()
        for (const s of steps) {
          orm
            .insert(arcSteps)
            .values({
              ...s,
              id: randomUUID(),
              arcId: newArcId,
              chapterId: chapterMap.get(s.chapterId) ?? s.chapterId,
              createdAt: now
            })
            .run()
        }
      }
    }

    // Presenze personaggio↔scena (US-28.1), rimappate su nuovi id
    if (srcScenes.length) {
      const scLinks = orm
        .select()
        .from(sceneCharacters)
        .where(inArray(sceneCharacters.sceneId, srcScenes.map((s) => s.id)))
        .all()
      for (const l of scLinks) {
        const sceneId = sceneMap.get(l.sceneId)
        const characterId = charMap.get(l.characterId)
        if (sceneId && characterId) {
          orm.insert(sceneCharacters).values({ id: randomUUID(), sceneId, characterId }).run()
        }
      }
    }

    // Timeline: eventi + collegamenti ai personaggi (rimappati)
    const srcEvents = orm
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.projectId, id))
      .all()
    const eventMap = new Map<string, string>()
    for (const ev of srcEvents) {
      const nid = randomUUID()
      eventMap.set(ev.id, nid)
      orm
        .insert(timelineEvents)
        .values({ ...ev, id: nid, projectId: copy.id, createdAt: now, updatedAt: now })
        .run()
    }
    if (srcEvents.length) {
      const evLinks = orm
        .select()
        .from(eventCharacters)
        .where(inArray(eventCharacters.eventId, srcEvents.map((e) => e.id)))
        .all()
      for (const l of evLinks) {
        const eventId = eventMap.get(l.eventId)
        const characterId = charMap.get(l.characterId)
        if (eventId && characterId) {
          orm.insert(eventCharacters).values({ id: randomUUID(), eventId, characterId }).run()
        }
      }
    }

    this.db.persist()
    return copy
  }

  setArchived(id: string, archived: boolean): Project | null {
    return this.update(id, { status: archived ? 'archived' : 'active' })
  }

  /** Rimozione a cascata: elimina tutti i dati del progetto, non solo la riga. */
  remove(id: string): boolean {
    const existing = this.get(id)
    if (!existing) return false
    const orm = this.db.orm

    const beatIds = orm
      .select({ id: beats.id })
      .from(beats)
      .where(eq(beats.projectId, id))
      .all()
      .map((r) => r.id)
    if (beatIds.length) orm.delete(beatScenes).where(inArray(beatScenes.beatId, beatIds)).run()
    orm.delete(beats).where(eq(beats.projectId, id)).run()

    const charIds = orm
      .select({ id: characters.id })
      .from(characters)
      .where(eq(characters.projectId, id))
      .all()
      .map((r) => r.id)
    if (charIds.length) {
      const arcIds = orm
        .select({ id: characterArcs.id })
        .from(characterArcs)
        .where(inArray(characterArcs.characterId, charIds))
        .all()
        .map((r) => r.id)
      if (arcIds.length) orm.delete(arcSteps).where(inArray(arcSteps.arcId, arcIds)).run()
      orm.delete(characterArcs).where(inArray(characterArcs.characterId, charIds)).run()
    }
    orm.delete(relationships).where(eq(relationships.projectId, id)).run()
    orm.delete(characters).where(eq(characters.projectId, id)).run()

    const eventIds = orm
      .select({ id: timelineEvents.id })
      .from(timelineEvents)
      .where(eq(timelineEvents.projectId, id))
      .all()
      .map((r) => r.id)
    if (eventIds.length) {
      orm.delete(eventCharacters).where(inArray(eventCharacters.eventId, eventIds)).run()
    }
    orm.delete(timelineEvents).where(eq(timelineEvents.projectId, id)).run()

    orm.delete(notes).where(eq(notes.projectId, id)).run()
    const sceneIds = orm
      .select({ id: scenes.id })
      .from(scenes)
      .where(eq(scenes.projectId, id))
      .all()
      .map((r) => r.id)
    if (sceneIds.length)
      orm.delete(sceneCharacters).where(inArray(sceneCharacters.sceneId, sceneIds)).run()
    orm.delete(scenes).where(eq(scenes.projectId, id)).run()
    orm.delete(chapters).where(eq(chapters.projectId, id)).run()
    orm.delete(styleProfiles).where(eq(styleProfiles.projectId, id)).run()
    orm.delete(worldElements).where(eq(worldElements.projectId, id)).run()
    orm.delete(writingStats).where(eq(writingStats.projectId, id)).run()
    orm.delete(projects).where(eq(projects.id, id)).run()

    this.db.persist()
    return true
  }
}
