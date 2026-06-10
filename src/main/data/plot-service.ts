import { asc, eq, inArray } from 'drizzle-orm'
import { analyzePacing } from '@shared/editor'
import type { PlotReport, SceneFlag } from '@shared/plot'
import type { DB } from './db'
import { beats, beatScenes, chapters, characters, eventCharacters, scenes, timelineEvents } from './schema'

const SHORT_SCENE_WORDS = 80

/**
 * Plot Intelligence deterministica (Epic 8): personaggi inutilizzati (US-8.3),
 * scene vuote/corte (US-8.2), beat scoperti e bilancio capitoli (US-8.4).
 * Le valutazioni qualitative (plot hole, utilità delle scene) restano all'AI.
 */
export class PlotService {
  constructor(private readonly db: DB) {}

  analyze(projectId: string): PlotReport {
    const orm = this.db.orm
    const chapterRows = orm
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, projectId))
      .orderBy(asc(chapters.sortOrder))
      .all()
    const sceneRows = orm
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.sortOrder))
      .all()
    const chapterTitle = new Map(chapterRows.map((c) => [c.id, c.title]))

    // --- US-8.3: personaggi mai menzionati nel manoscritto -------------------
    const fullText = sceneRows.map((s) => `${s.title}\n${s.content}`).join('\n').toLowerCase()
    const charRows = orm
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .all()
    const eventRows = orm
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.projectId, projectId))
      .all()
    const linkedCharIds = new Set(
      eventRows.length
        ? orm
            .select({ characterId: eventCharacters.characterId })
            .from(eventCharacters)
            .where(inArray(eventCharacters.eventId, eventRows.map((e) => e.id)))
            .all()
            .map((r) => r.characterId)
        : []
    )
    const unusedCharacters = charRows
      .filter((c) => {
        const full = c.name.trim().toLowerCase()
        const first = full.split(/\s+/)[0]
        const mentioned =
          (full.length >= 3 && fullText.includes(full)) ||
          (first.length >= 3 && fullText.includes(first))
        return !mentioned
      })
      .map((c) => ({ id: c.id, name: c.name, linkedToEvents: linkedCharIds.has(c.id) }))

    // --- US-8.2 (deterministico): scene vuote o molto corte ------------------
    const emptyScenes: SceneFlag[] = []
    const shortScenes: SceneFlag[] = []
    for (const s of sceneRows) {
      const flag: SceneFlag = {
        id: s.id,
        title: s.title,
        chapterTitle: chapterTitle.get(s.chapterId) ?? '',
        words: s.wordCount
      }
      if (s.wordCount === 0) emptyScenes.push(flag)
      else if (s.wordCount < SHORT_SCENE_WORDS) shortScenes.push(flag)
    }

    // --- beat scoperti --------------------------------------------------------
    const beatRows = orm.select().from(beats).where(eq(beats.projectId, projectId)).all()
    const coveredBeatIds = new Set(
      beatRows.length
        ? orm
            .select({ beatId: beatScenes.beatId })
            .from(beatScenes)
            .where(inArray(beatScenes.beatId, beatRows.map((b) => b.id)))
            .all()
            .map((r) => r.beatId)
        : []
    )
    const uncoveredBeats = beatRows.filter((b) => !coveredBeatIds.has(b.id)).length

    // --- US-8.4: bilancio capitoli --------------------------------------------
    const balances = chapterRows.map((ch) => {
      const content = sceneRows
        .filter((s) => s.chapterId === ch.id)
        .map((s) => s.content)
        .join('\n\n')
      const pacing = analyzePacing(content)
      return {
        id: ch.id,
        title: ch.title,
        words: pacing.words,
        dialogueRatio: pacing.dialogueRatio,
        flag: null as 'short' | 'long' | null
      }
    })
    const wordCounts = balances.map((b) => b.words).filter((w) => w > 0).sort((a, b) => a - b)
    if (balances.length >= 3 && wordCounts.length > 0) {
      const median = wordCounts[Math.floor(wordCounts.length / 2)]
      for (const b of balances) {
        if (b.words > 0 && b.words < median * 0.3) b.flag = 'short'
        else if (b.words > median * 2.5) b.flag = 'long'
      }
    }

    return {
      unusedCharacters,
      emptyScenes,
      shortScenes,
      uncoveredBeats,
      totalBeats: beatRows.length,
      chapters: balances
    }
  }
}
