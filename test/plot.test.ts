import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'
import { SqliteStructureRepository } from '../src/main/data/structure-repository'
import { SqliteTimelineRepository } from '../src/main/data/timeline-repository'
import { PlotService } from '../src/main/data/plot-service'

let db: DB
let pid: string

beforeEach(async () => {
  db = await makeDb()
  pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
})

describe('PlotService (Epic 8, parte deterministica)', () => {
  it('rileva personaggi mai menzionati nel manoscritto (US-8.3)', () => {
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const tl = new SqliteTimelineRepository(db)
    const ch = ms.createChapter(pid, 'Cap 1')
    const sc = ms.createScene(pid, ch.id, 'Apertura')
    ms.updateScene(sc.id, { content: 'Marta scese dalla corriera e guardò il faro spento.' })

    chars.createCharacter(pid, { name: 'Marta Renzi' }) // menzionata (primo nome)
    const elia = chars.createCharacter(pid, { name: 'Elia Marchetti' }) // mai menzionato
    const ev = tl.createEvent(pid, { title: 'Naufragio' })
    tl.linkCharacter(ev.id, elia.id)

    const report = new PlotService(db).analyze(pid)
    expect(report.unusedCharacters).toHaveLength(1)
    expect(report.unusedCharacters[0].name).toBe('Elia Marchetti')
    expect(report.unusedCharacters[0].linkedToEvents).toBe(true)
  })

  it('segnala scene vuote e molto corte (US-8.2)', () => {
    const ms = new SqliteManuscriptRepository(db)
    const ch = ms.createChapter(pid, 'Cap 1')
    ms.createScene(pid, ch.id, 'Vuota')
    const corta = ms.createScene(pid, ch.id, 'Corta')
    ms.updateScene(corta.id, { content: 'Poche parole appena.' })
    const piena = ms.createScene(pid, ch.id, 'Piena')
    ms.updateScene(piena.id, { content: 'parola '.repeat(120).trim() })

    const report = new PlotService(db).analyze(pid)
    expect(report.emptyScenes.map((s) => s.title)).toEqual(['Vuota'])
    expect(report.shortScenes.map((s) => s.title)).toEqual(['Corta'])
  })

  it('conta i beat scoperti', () => {
    const st = new SqliteStructureRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const beats = st.setFramework(pid, 'Seven Point Story Structure')
    const ch = ms.createChapter(pid, 'Cap 1')
    const sc = ms.createScene(pid, ch.id, 'S1')
    st.linkScene(beats[0].id, sc.id)

    const report = new PlotService(db).analyze(pid)
    expect(report.totalBeats).toBe(7)
    expect(report.uncoveredBeats).toBe(6)
  })

  it('bilancio capitoli: flag su capitoli fuori scala rispetto alla mediana (US-8.4)', () => {
    const ms = new SqliteManuscriptRepository(db)
    const sizes = [1000, 1100, 1200, 100, 4000] // mediana ~1100 → 100=short, 4000=long
    sizes.forEach((words, i) => {
      const ch = ms.createChapter(pid, `Cap ${i + 1}`)
      const sc = ms.createScene(pid, ch.id, 'S')
      ms.updateScene(sc.id, { content: 'parola '.repeat(words).trim() })
    })

    const report = new PlotService(db).analyze(pid)
    const byTitle = new Map(report.chapters.map((c) => [c.title, c.flag]))
    expect(byTitle.get('Cap 4')).toBe('short')
    expect(byTitle.get('Cap 5')).toBe('long')
    expect(byTitle.get('Cap 1')).toBeNull()
  })

  it('manoscritto pulito → report senza segnalazioni', () => {
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const ch = ms.createChapter(pid, 'Cap 1')
    const sc = ms.createScene(pid, ch.id, 'S1')
    ms.updateScene(sc.id, { content: 'Anna camminava. ' + 'parola '.repeat(100).trim() })
    chars.createCharacter(pid, { name: 'Anna' })

    const report = new PlotService(db).analyze(pid)
    expect(report.unusedCharacters).toHaveLength(0)
    expect(report.emptyScenes).toHaveLength(0)
    expect(report.shortScenes).toHaveLength(0)
    expect(report.uncoveredBeats).toBe(0)
    expect(report.chapters.every((c) => c.flag === null)).toBe(true)
  })
})
