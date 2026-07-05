import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { stripAnnotations } from '../src/main/export/builder'

let db: DB
let pid: string
let ms: SqliteManuscriptRepository

beforeEach(async () => {
  db = await makeDb()
  pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
  ms = new SqliteManuscriptRepository(db)
})

describe('Stato scena (US-26.2)', () => {
  it('parte da draft e si aggiorna', () => {
    const ch = ms.createChapter(pid, 'C')
    const sc = ms.createScene(pid, ch.id, 'S')
    expect(sc.status).toBe('draft')
    const u = ms.updateScene(sc.id, { status: 'final' })
    expect(u?.status).toBe('final')
    // il contenuto non viene toccato dal cambio stato
    expect(u?.content).toBe('')
  })
})

describe('Trova & sostituisci (US-26.1)', () => {
  it('sostituisce in tutto il progetto, case-insensitive di default', () => {
    const ch = ms.createChapter(pid, 'C')
    const s1 = ms.createScene(pid, ch.id, 'S1')
    const s2 = ms.createScene(pid, ch.id, 'S2')
    ms.updateScene(s1.id, { content: 'Il Faro brillava. il faro chiamava.' })
    ms.updateScene(s2.id, { content: 'Nessun faro qui? Sì: FARO.' })

    const res = ms.replaceText(pid, 'faro', 'molo')
    expect(res.occurrences).toBe(4)
    expect(res.scenes).toBe(2)
    expect(ms.getScene(s1.id)?.content).toBe('Il molo brillava. il molo chiamava.')
    expect(ms.getScene(s2.id)?.content).toBe('Nessun molo qui? Sì: molo.')
  })

  it('rispetta matchCase e il limite a una scena', () => {
    const ch = ms.createChapter(pid, 'C')
    const s1 = ms.createScene(pid, ch.id, 'S1')
    const s2 = ms.createScene(pid, ch.id, 'S2')
    ms.updateScene(s1.id, { content: 'Faro faro Faro' })
    ms.updateScene(s2.id, { content: 'Faro' })

    const res = ms.replaceText(pid, 'Faro', 'Molo', { sceneId: s1.id, matchCase: true })
    expect(res.occurrences).toBe(2)
    expect(res.scenes).toBe(1)
    expect(ms.getScene(s1.id)?.content).toBe('Molo faro Molo')
    expect(ms.getScene(s2.id)?.content).toBe('Faro')
  })

  it('gestisce caratteri speciali regex nel termine cercato', () => {
    const ch = ms.createChapter(pid, 'C')
    const s = ms.createScene(pid, ch.id, 'S')
    ms.updateScene(s.id, { content: 'Costa 5.00 (circa). Ripeto: 5.00 (circa).' })
    const res = ms.replaceText(pid, '5.00 (circa)', 'poco')
    expect(res.occurrences).toBe(2)
    expect(ms.getScene(s.id)?.content).toBe('Costa poco. Ripeto: poco.')
  })
})

describe('Statistiche giornaliere (US-27.1)', () => {
  it('registra il delta netto di parole del giorno', () => {
    const ch = ms.createChapter(pid, 'C')
    const sc = ms.createScene(pid, ch.id, 'S')
    ms.updateScene(sc.id, { content: 'una due tre quattro cinque' }) // +5
    ms.updateScene(sc.id, { content: 'una due tre' }) // -2
    ms.updateScene(sc.id, { content: 'una due tre quattro' }) // +1

    const daily = ms.getDailyStats(pid, 7)
    expect(daily).toHaveLength(1)
    expect(daily[0].wordsAdded).toBe(4)
    expect(daily[0].date).toBe(new Date().toISOString().slice(0, 10))
  })

  it('il cambio di solo stato/titolo non genera statistiche', () => {
    const ch = ms.createChapter(pid, 'C')
    const sc = ms.createScene(pid, ch.id, 'S')
    ms.updateScene(sc.id, { status: 'revision' })
    ms.updateScene(sc.id, { title: 'Nuovo titolo' })
    expect(ms.getDailyStats(pid, 7)).toHaveLength(0)
  })
})

describe('Annotazioni non stampabili (US-26.5)', () => {
  it('stripAnnotations rimuove i blocchi {>>…<<} preservando il testo', () => {
    const md = 'La corriera partì. {>>rivedere il ritmo qui<<} Marta scese.\n\nAltro {>>todo<<}paragrafo.'
    const out = stripAnnotations(md)
    expect(out).not.toContain('>>')
    expect(out).toContain('La corriera partì.')
    expect(out).toContain('Marta scese.')
    expect(out).toContain('Altro paragrafo.')
  })
})
