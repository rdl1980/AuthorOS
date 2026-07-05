import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq, inArray } from 'drizzle-orm'
import type { Project } from '@shared/domain'
import type { SnapshotMeta } from '@shared/search'
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
  scenes,
  styleProfiles,
  timelineEvents,
  worldElements
} from './schema'

interface SnapshotFile {
  label: string
  kind: 'manual' | 'auto'
  createdAt: string
  data: ProjectData
}

interface ProjectData {
  project: typeof projects.$inferSelect
  chapters: (typeof chapters.$inferSelect)[]
  scenes: (typeof scenes.$inferSelect)[]
  notes: (typeof notes.$inferSelect)[]
  beats: (typeof beats.$inferSelect)[]
  beatScenes: (typeof beatScenes.$inferSelect)[]
  styleProfiles: (typeof styleProfiles.$inferSelect)[]
  characters: (typeof characters.$inferSelect)[]
  relationships: (typeof relationships.$inferSelect)[]
  characterArcs: (typeof characterArcs.$inferSelect)[]
  arcSteps: (typeof arcSteps.$inferSelect)[]
  timelineEvents: (typeof timelineEvents.$inferSelect)[]
  eventCharacters: (typeof eventCharacters.$inferSelect)[]
  worldElements: (typeof worldElements.$inferSelect)[]
}

const MAX_AUTO_SNAPSHOTS = 10
const MAX_BACKUPS_PER_PROJECT = 10

/** Formato del file di scambio .authoros (US-30.2). */
export interface AuthorosFile {
  format: 'authoros'
  version: 1
  exportedAt: string
  data: ProjectData
}

/**
 * Snapshot locali del progetto (US-24.2/24.3): fotografie JSON complete in
 * userData/snapshots/<projectId>/. Il ripristino sostituisce i contenuti del
 * progetto preservando gli id (gli snapshot sono internamente coerenti).
 */
export class SnapshotService {
  /** Hash dell'ultimo auto-snapshot per progetto: evita snapshot identici. */
  private lastAutoHash = new Map<string, string>()

  constructor(
    private readonly db: DB,
    private readonly dataDir: string
  ) {}

  private dir(projectId: string): string {
    const d = join(this.dataDir, 'snapshots', projectId)
    if (!existsSync(d)) mkdirSync(d, { recursive: true })
    return d
  }

  // --- serializzazione ------------------------------------------------------

  serialize(projectId: string): ProjectData | null {
    const orm = this.db.orm
    const project = orm.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) return null
    const beatRows = orm.select().from(beats).where(eq(beats.projectId, projectId)).all()
    const charRows = orm.select().from(characters).where(eq(characters.projectId, projectId)).all()
    const arcRows = charRows.length
      ? orm
          .select()
          .from(characterArcs)
          .where(inArray(characterArcs.characterId, charRows.map((c) => c.id)))
          .all()
      : []
    const eventRows = orm
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.projectId, projectId))
      .all()
    return {
      project,
      chapters: orm.select().from(chapters).where(eq(chapters.projectId, projectId)).all(),
      scenes: orm.select().from(scenes).where(eq(scenes.projectId, projectId)).all(),
      notes: orm.select().from(notes).where(eq(notes.projectId, projectId)).all(),
      beats: beatRows,
      beatScenes: beatRows.length
        ? orm
            .select()
            .from(beatScenes)
            .where(inArray(beatScenes.beatId, beatRows.map((b) => b.id)))
            .all()
        : [],
      styleProfiles: orm
        .select()
        .from(styleProfiles)
        .where(eq(styleProfiles.projectId, projectId))
        .all(),
      characters: charRows,
      relationships: orm
        .select()
        .from(relationships)
        .where(eq(relationships.projectId, projectId))
        .all(),
      characterArcs: arcRows,
      arcSteps: arcRows.length
        ? orm
            .select()
            .from(arcSteps)
            .where(inArray(arcSteps.arcId, arcRows.map((a) => a.id)))
            .all()
        : [],
      timelineEvents: eventRows,
      eventCharacters: eventRows.length
        ? orm
            .select()
            .from(eventCharacters)
            .where(inArray(eventCharacters.eventId, eventRows.map((e) => e.id)))
            .all()
        : [],
      worldElements: orm
        .select()
        .from(worldElements)
        .where(eq(worldElements.projectId, projectId))
        .all()
    }
  }

  /** Svuota i contenuti del progetto mantenendo la riga progetto. */
  private wipeContent(projectId: string): void {
    const orm = this.db.orm
    const data = this.serialize(projectId)
    if (!data) return
    if (data.beats.length)
      orm.delete(beatScenes).where(inArray(beatScenes.beatId, data.beats.map((b) => b.id))).run()
    orm.delete(beats).where(eq(beats.projectId, projectId)).run()
    if (data.characterArcs.length)
      orm.delete(arcSteps).where(inArray(arcSteps.arcId, data.characterArcs.map((a) => a.id))).run()
    if (data.characters.length)
      orm
        .delete(characterArcs)
        .where(inArray(characterArcs.characterId, data.characters.map((c) => c.id)))
        .run()
    orm.delete(relationships).where(eq(relationships.projectId, projectId)).run()
    if (data.timelineEvents.length)
      orm
        .delete(eventCharacters)
        .where(inArray(eventCharacters.eventId, data.timelineEvents.map((e) => e.id)))
        .run()
    orm.delete(timelineEvents).where(eq(timelineEvents.projectId, projectId)).run()
    orm.delete(characters).where(eq(characters.projectId, projectId)).run()
    orm.delete(notes).where(eq(notes.projectId, projectId)).run()
    orm.delete(scenes).where(eq(scenes.projectId, projectId)).run()
    orm.delete(chapters).where(eq(chapters.projectId, projectId)).run()
    orm.delete(styleProfiles).where(eq(styleProfiles.projectId, projectId)).run()
    orm.delete(worldElements).where(eq(worldElements.projectId, projectId)).run()
  }

  // --- API ------------------------------------------------------------------

  create(projectId: string, label: string, kind: 'manual' | 'auto' = 'manual'): SnapshotMeta | null {
    const data = this.serialize(projectId)
    if (!data) return null
    const createdAt = new Date().toISOString()
    const file = `${createdAt.replace(/[:.]/g, '-')}-${kind}.json`
    const payload: SnapshotFile = { label: label.trim() || (kind === 'auto' ? 'Automatico' : 'Snapshot'), kind, createdAt, data }
    writeFileSync(join(this.dir(projectId), file), JSON.stringify(payload), 'utf8')
    return this.meta(file, payload)
  }

  private meta(file: string, s: SnapshotFile): SnapshotMeta {
    return {
      file,
      label: s.label,
      kind: s.kind,
      createdAt: s.createdAt,
      words: s.data.scenes.reduce((a, sc) => a + sc.wordCount, 0)
    }
  }

  list(projectId: string): SnapshotMeta[] {
    const dir = this.dir(projectId)
    const out: SnapshotMeta[] = []
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      try {
        out.push(this.meta(file, JSON.parse(readFileSync(join(dir, file), 'utf8')) as SnapshotFile))
      } catch {
        // file corrotto: ignorato
      }
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  remove(projectId: string, file: string): boolean {
    const path = join(this.dir(projectId), file)
    if (!existsSync(path)) return false
    rmSync(path)
    return true
  }

  /** Ripristina uno snapshot, creando prima uno snapshot di sicurezza. */
  restore(projectId: string, file: string): boolean {
    const path = join(this.dir(projectId), file)
    if (!existsSync(path)) return false
    const snap = JSON.parse(readFileSync(path, 'utf8')) as SnapshotFile

    this.create(projectId, 'Pre-ripristino', 'manual')
    this.wipeContent(projectId)

    const orm = this.db.orm
    const d = snap.data
    orm
      .update(projects)
      .set({
        title: d.project.title,
        genre: d.project.genre,
        framework: d.project.framework,
        targetWordCount: d.project.targetWordCount,
        updatedAt: new Date().toISOString()
      })
      .where(eq(projects.id, projectId))
      .run()
    for (const r of d.chapters) orm.insert(chapters).values(r).run()
    for (const r of d.scenes) orm.insert(scenes).values(r).run()
    for (const r of d.notes) orm.insert(notes).values(r).run()
    for (const r of d.beats) orm.insert(beats).values(r).run()
    for (const r of d.beatScenes) orm.insert(beatScenes).values(r).run()
    for (const r of d.styleProfiles) orm.insert(styleProfiles).values(r).run()
    for (const r of d.characters) orm.insert(characters).values(r).run()
    for (const r of d.relationships) orm.insert(relationships).values(r).run()
    for (const r of d.characterArcs) orm.insert(characterArcs).values(r).run()
    for (const r of d.arcSteps) orm.insert(arcSteps).values(r).run()
    for (const r of d.timelineEvents) orm.insert(timelineEvents).values(r).run()
    for (const r of d.eventCharacters) orm.insert(eventCharacters).values(r).run()
    for (const r of d.worldElements ?? []) orm.insert(worldElements).values(r).run()
    this.db.persist()
    return true
  }

  // --- Export/Import .authoros (US-30.2) ------------------------------------

  exportData(projectId: string): AuthorosFile | null {
    const data = this.serialize(projectId)
    if (!data) return null
    return { format: 'authoros', version: 1, exportedAt: new Date().toISOString(), data }
  }

  writeExport(projectId: string, filePath: string): boolean {
    const file = this.exportData(projectId)
    if (!file) return false
    writeFileSync(filePath, JSON.stringify(file), 'utf8')
    return true
  }

  /**
   * Importa un progetto da dati .authoros creando un NUOVO progetto con tutti
   * gli id rimappati (nessuna collisione con progetti esistenti).
   */
  importData(file: AuthorosFile): Project {
    if (file.format !== 'authoros' || !file.data?.project) {
      throw new Error('file .authoros non valido')
    }
    const d = file.data
    const orm = this.db.orm
    const now = new Date().toISOString()
    const remap = new Map<string, string>()
    const rid = (oldId: string): string => {
      const existing = remap.get(oldId)
      if (existing) return existing
      const fresh = randomUUID()
      remap.set(oldId, fresh)
      return fresh
    }

    const projectId = randomUUID()
    const project: Project = {
      id: projectId,
      title: d.project.title,
      genre: d.project.genre,
      framework: d.project.framework,
      targetWordCount: d.project.targetWordCount,
      deadline: d.project.deadline ?? null,
      status: 'active',
      ownerId: null,
      createdAt: now,
      updatedAt: now
    }
    orm.insert(projects).values(project).run()

    for (const r of d.chapters)
      orm.insert(chapters).values({ ...r, id: rid(r.id), projectId, createdAt: now, updatedAt: now }).run()
    for (const r of d.scenes)
      orm
        .insert(scenes)
        .values({ ...r, id: rid(r.id), projectId, chapterId: rid(r.chapterId), createdAt: now, updatedAt: now })
        .run()
    for (const r of d.notes)
      orm
        .insert(notes)
        .values({
          ...r,
          id: randomUUID(),
          projectId,
          chapterId: r.chapterId ? rid(r.chapterId) : null,
          sceneId: r.sceneId ? rid(r.sceneId) : null,
          createdAt: now,
          updatedAt: now
        })
        .run()
    for (const r of d.beats)
      orm.insert(beats).values({ ...r, id: rid(r.id), projectId, createdAt: now }).run()
    for (const r of d.beatScenes)
      orm
        .insert(beatScenes)
        .values({ id: randomUUID(), beatId: rid(r.beatId), sceneId: rid(r.sceneId) })
        .run()
    for (const r of d.styleProfiles)
      orm
        .insert(styleProfiles)
        .values({ ...r, id: randomUUID(), projectId, createdAt: now, updatedAt: now })
        .run()
    for (const r of d.characters)
      orm.insert(characters).values({ ...r, id: rid(r.id), projectId, createdAt: now, updatedAt: now }).run()
    for (const r of d.relationships)
      orm
        .insert(relationships)
        .values({ id: randomUUID(), projectId, fromId: rid(r.fromId), toId: rid(r.toId), label: r.label, createdAt: now })
        .run()
    for (const r of d.characterArcs)
      orm
        .insert(characterArcs)
        .values({ ...r, id: rid(r.id), characterId: rid(r.characterId), createdAt: now, updatedAt: now })
        .run()
    for (const r of d.arcSteps)
      orm
        .insert(arcSteps)
        .values({ ...r, id: randomUUID(), arcId: rid(r.arcId), chapterId: rid(r.chapterId), createdAt: now })
        .run()
    for (const r of d.timelineEvents)
      orm.insert(timelineEvents).values({ ...r, id: rid(r.id), projectId, createdAt: now, updatedAt: now }).run()
    for (const r of d.eventCharacters)
      orm
        .insert(eventCharacters)
        .values({ id: randomUUID(), eventId: rid(r.eventId), characterId: rid(r.characterId) })
        .run()
    for (const r of d.worldElements ?? [])
      orm.insert(worldElements).values({ ...r, id: randomUUID(), projectId, createdAt: now, updatedAt: now }).run()

    this.db.persist()
    return project
  }

  readImport(filePath: string): Project {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as AuthorosFile
    return this.importData(parsed)
  }

  // --- Backup su cartella esterna (US-30.1) ----------------------------------

  private lastBackupHash = new Map<string, string>()

  /**
   * Scrive un backup .authoros nella cartella scelta, solo se i dati sono
   * cambiati dall'ultimo backup; mantiene gli ultimi MAX_BACKUPS_PER_PROJECT.
   */
  backupTo(dir: string, projectId: string): { written: boolean; path?: string } {
    if (!existsSync(dir)) return { written: false }
    const file = this.exportData(projectId)
    if (!file) return { written: false }
    const hash = createHash('sha1').update(JSON.stringify(file.data)).digest('hex')
    if (this.lastBackupHash.get(projectId) === hash) return { written: false }
    this.lastBackupHash.set(projectId, hash)

    const safeTitle = file.data.project.title.replace(/[<>:"/\\|?*]+/g, '').trim() || 'progetto'
    const stamp = file.exportedAt.replace(/[:.]/g, '-')
    const marker = `.${projectId.slice(0, 8)}.`
    const name = `${safeTitle}${marker}${stamp}.authoros`
    writeFileSync(join(dir, name), JSON.stringify(file), 'utf8')

    // Rotazione: tiene gli ultimi N backup di QUESTO progetto.
    const mine = readdirSync(dir)
      .filter((f) => f.includes(marker) && f.endsWith('.authoros'))
      .sort()
      .reverse()
    for (const old of mine.slice(MAX_BACKUPS_PER_PROJECT)) rmSync(join(dir, old))

    return { written: true, path: join(dir, name) }
  }

  /**
   * Auto-snapshot (US-24.3): crea solo se i dati sono cambiati dall'ultimo giro;
   * mantiene al massimo MAX_AUTO_SNAPSHOTS automatici (i manuali non si toccano).
   */
  autoSnapshot(projectId: string): SnapshotMeta | null {
    const data = this.serialize(projectId)
    if (!data) return null
    const hash = createHash('sha1').update(JSON.stringify(data)).digest('hex')
    if (this.lastAutoHash.get(projectId) === hash) return null
    this.lastAutoHash.set(projectId, hash)

    const meta = this.create(projectId, 'Automatico', 'auto')
    const autos = this.list(projectId).filter((s) => s.kind === 'auto')
    for (const old of autos.slice(MAX_AUTO_SNAPSHOTS)) this.remove(projectId, old.file)
    return meta
  }
}
