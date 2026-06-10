// Plot Intelligence (Epic 8) — report deterministico sulla solidità del manoscritto.

export interface UnusedCharacter {
  id: string
  name: string
  /** Il personaggio è almeno collegato a eventi della timeline. */
  linkedToEvents: boolean
}

export interface SceneFlag {
  id: string
  title: string
  chapterTitle: string
  words: number
}

export interface ChapterBalance {
  id: string
  title: string
  words: number
  /** Quota di dialogo 0..1 (da analyzePacing). */
  dialogueRatio: number
  flag: 'short' | 'long' | null
}

export interface PlotReport {
  /** US-8.3: personaggi mai menzionati nel testo del manoscritto. */
  unusedCharacters: UnusedCharacter[]
  /** US-8.2 (parte deterministica): scene vuote o molto corte. */
  emptyScenes: SceneFlag[]
  shortScenes: SceneFlag[]
  /** Beat del framework senza scene associate. */
  uncoveredBeats: number
  totalBeats: number
  /** US-8.4: distribuzione del peso narrativo per capitolo. */
  chapters: ChapterBalance[]
}
