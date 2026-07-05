import { and, eq, inArray } from 'drizzle-orm'
import type { DB } from '../data/db'
import {
  beats,
  beatScenes,
  chapters,
  characterArcs,
  characters,
  scenes,
  styleProfiles,
  worldElements
} from '../data/schema'

const SCENE_TAIL_CHARS = 2600
const MAX_CHARACTERS = 5
const MAX_PLACES = 3

/**
 * US-29.1 — Contesto automatico dal codex: assembla in un blocco di testo tutto
 * ciò che l'AI deve sapere per generare in modo coerente col libro: voce
 * dell'autore, scena corrente, beat associato, schede dei personaggi CITATI
 * nella scena/prompt e luoghi rilevanti. Deterministico e testabile.
 */
export class ContextBuilder {
  constructor(private readonly db: DB) {}

  /** Contesto per una generazione dentro (o vicino a) una scena. */
  build(projectId: string, sceneId?: string, extraText = ''): string {
    const orm = this.db.orm
    const parts: string[] = []

    // Voce dell'autore (Epic 23)
    const voice = orm
      .select()
      .from(styleProfiles)
      .where(and(eq(styleProfiles.projectId, projectId), eq(styleProfiles.isActive, true)))
      .get()
    if (voice && (voice.tone || voice.instructions)) {
      parts.push(`VOCE DELL'AUTORE:\n${[voice.tone, voice.instructions].filter(Boolean).join('\n')}`)
    }

    // Scena corrente (coda, per dare l'attacco giusto) + capitolo + beat
    let sceneText = ''
    if (sceneId) {
      const scene = orm.select().from(scenes).where(eq(scenes.id, sceneId)).get()
      if (scene) {
        sceneText = scene.content
        const chapter = orm.select().from(chapters).where(eq(chapters.id, scene.chapterId)).get()
        const tail =
          scene.content.length > SCENE_TAIL_CHARS
            ? '…' + scene.content.slice(-SCENE_TAIL_CHARS)
            : scene.content
        parts.push(
          `SCENA CORRENTE — «${scene.title}»${chapter ? ` (${chapter.title})` : ''}:\n${tail || '(vuota)'}`
        )
        const link = orm.select().from(beatScenes).where(eq(beatScenes.sceneId, sceneId)).get()
        if (link) {
          const beat = orm.select().from(beats).where(eq(beats.id, link.beatId)).get()
          if (beat) parts.push(`BEAT NARRATIVO: ${beat.title} — ${beat.description}`)
        }
      }
    }

    // Personaggi citati nella scena o nel testo extra (prompt/selezione)
    const haystack = `${sceneText}\n${extraText}`.toLowerCase()
    const cast = orm.select().from(characters).where(eq(characters.projectId, projectId)).all()
    const mentioned = cast
      .filter((c) => {
        const first = c.name.trim().toLowerCase().split(/\s+/)[0]
        return first.length >= 3 && haystack.includes(first)
      })
      .slice(0, MAX_CHARACTERS)
    if (mentioned.length) {
      const arcs = orm
        .select()
        .from(characterArcs)
        .where(inArray(characterArcs.characterId, mentioned.map((c) => c.id)))
        .all()
      const cards = mentioned.map((c) => {
        const arc = arcs.find((a) => a.characterId === c.id)
        const arcBits = arc
          ? [arc.desire && `desiderio: ${arc.desire}`, arc.fear && `paura: ${arc.fear}`, arc.lie && `menzogna: ${arc.lie}`]
              .filter(Boolean)
              .join('; ')
          : ''
        return `- ${c.name}${c.role ? ` (${c.role})` : ''}: ${c.summary}${c.traits ? ` Tratti: ${c.traits}.` : ''}${arcBits ? ` Arco — ${arcBits}.` : ''}`
      })
      parts.push(`PERSONAGGI IN SCENA:\n${cards.join('\n')}`)
    }

    // Luoghi citati (World Building)
    const places = orm
      .select()
      .from(worldElements)
      .where(and(eq(worldElements.projectId, projectId), eq(worldElements.kind, 'place')))
      .all()
      .filter((p) => {
        const key = p.name.trim().toLowerCase()
        return key.length >= 3 && haystack.includes(key)
      })
      .slice(0, MAX_PLACES)
    if (places.length) {
      parts.push(
        `LUOGHI:\n${places.map((p) => `- ${p.name}: ${p.description}${p.details ? ` ${p.details}` : ''}`).join('\n')}`
      )
    }

    return parts.join('\n\n')
  }

  /** Panoramica del progetto per la chat (US-29.6). */
  buildProjectOverview(projectId: string): string {
    const orm = this.db.orm
    const parts: string[] = []
    const chapterRows = orm
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .all()
    const sceneRows = orm.select().from(scenes).where(eq(scenes.projectId, projectId)).all()
    parts.push(
      `STRUTTURA: ${chapterRows.length} capitoli, ${sceneRows.length} scene.\n` +
        chapterRows
          .map((ch) => {
            const own = sceneRows.filter((s) => s.chapterId === ch.id)
            return `- ${ch.title}: ${own.map((s) => s.title).join(', ') || '(vuoto)'}`
          })
          .join('\n')
    )
    const cast = orm.select().from(characters).where(eq(characters.projectId, projectId)).all()
    if (cast.length) {
      parts.push(
        `PERSONAGGI:\n${cast.map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ''}: ${c.summary}`).join('\n')}`
      )
    }
    const world = orm.select().from(worldElements).where(eq(worldElements.projectId, projectId)).all()
    if (world.length) {
      parts.push(`MONDO:\n${world.map((w) => `- [${w.kind}] ${w.name}: ${w.description}`).join('\n')}`)
    }
    const beatRows = orm.select().from(beats).where(eq(beats.projectId, projectId)).all()
    if (beatRows.length) {
      parts.push(`FRAMEWORK: ${beatRows[0].framework} (${beatRows.length} beat).`)
    }
    return parts.join('\n\n')
  }
}
