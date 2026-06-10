import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq, inArray } from 'drizzle-orm'
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
  timelineEvents
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
}

const MAX_AUTO_SNAPSHOTS = 10

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
        : []
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
    this.db.persist()
    return true
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
