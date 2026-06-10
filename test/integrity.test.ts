// Test delle correzioni emerse dalla review: cascata, duplicazione profonda,
// pulizia dei link beat↔scena alla cancellazione di scene/capitoli.
import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteStructureRepository } from '../src/main/data/structure-repository'
import { SqliteStyleRepository } from '../src/main/data/style-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'

let db: DB

beforeEach(async () => {
  db = await makeDb()
})

function seedFullProject() {
  const projects = new SqliteProjectRepository(db)
  const ms = new SqliteManuscriptRepository(db)
  const st = new SqliteStructureRepository(db)
  const styles = new SqliteStyleRepository(db)
  const chars = new SqliteCharacterRepository(db)

  const p = projects.create({ title: 'Originale', genre: 'Fantasy' })
  const ch = ms.createChapter(p.id, 'Cap 1')
  const sc = ms.createScene(p.id, ch.id, 'Scena 1')
  ms.updateScene(sc.id, { content: 'tre parole qui' })
  ms.createNote(p.id, { sceneId: sc.id }, 'nota di scena')
  const beats = st.setFramework(p.id, 'Seven Point Story Structure')
  st.linkScene(beats[0].id, sc.id)
  styles.create(p.id, { name: 'Voce', tone: 'asciutto' })
  const a = chars.createCharacter(p.id, { name: 'Ada' })
  const b = chars.createCharacter(p.id, { name: 'Bruno' })
  chars.addRelationship(p.id, a.id, b.id, 'ama')
  const arc = chars.getArc(a.id)
  chars.updateArc(a.id, { desire: 'libertà' })
  chars.addArcStep(arc.id, ch.id, 'svolta')

  return { projects, ms, st, styles, chars, p, ch, sc, beats }
}

describe('deleteScene/deleteChapter puliscono i link beat↔scena', () => {
  it('deleteScene rimuove i link al beat', () => {
    const { ms, st, p, sc } = seedFullProject()
    expect(st.links(p.id)).toHaveLength(1)
    ms.deleteScene(sc.id)
    expect(st.links(p.id)).toHaveLength(0)
  })

  it('deleteChapter rimuove i link delle sue scene', () => {
    const { ms, st, p, ch } = seedFullProject()
    ms.deleteChapter(ch.id)
    expect(st.links(p.id)).toHaveLength(0)
    expect(ms.listScenes(p.id)).toHaveLength(0)
  })
})

describe('remove progetto a cascata', () => {
  it('elimina manoscritto, struttura, stili e personaggi', () => {
    const { projects, ms, st, styles, chars, p } = seedFullProject()
    projects.remove(p.id)
    expect(ms.listChapters(p.id)).toHaveLength(0)
    expect(ms.listScenes(p.id)).toHaveLength(0)
    expect(ms.listNotes(p.id)).toHaveLength(0)
    expect(st.listBeats(p.id)).toHaveLength(0)
    expect(st.links(p.id)).toHaveLength(0)
    expect(styles.list(p.id)).toHaveLength(0)
    expect(chars.listCharacters(p.id)).toHaveLength(0)
    expect(chars.listRelationships(p.id)).toHaveLength(0)
  })
})

describe('duplicate profondo (US-1.4)', () => {
  it('copia manoscritto, note, beat+link, stili e personaggi con id rimappati', () => {
    const { projects, ms, st, styles, chars, p } = seedFullProject()
    const copy = projects.duplicate(p.id)!
    expect(copy.title).toBe('Originale (copia)')

    // manoscritto copiato con contenuto e word count
    const copiedScenes = ms.listScenes(copy.id)
    expect(ms.listChapters(copy.id)).toHaveLength(1)
    expect(copiedScenes).toHaveLength(1)
    expect(copiedScenes[0].content).toBe('tre parole qui')
    expect(copiedScenes[0].wordCount).toBe(3)
    expect(ms.listNotes(copy.id)).toHaveLength(1)

    // struttura: beat e link rimappati sulla copia
    expect(st.listBeats(copy.id)).toHaveLength(7)
    const copiedLinks = st.links(copy.id)
    expect(copiedLinks).toHaveLength(1)
    expect(copiedLinks[0].sceneId).toBe(copiedScenes[0].id)

    // stili e personaggi
    expect(styles.list(copy.id)).toHaveLength(1)
    const copiedChars = chars.listCharacters(copy.id)
    expect(copiedChars).toHaveLength(2)
    expect(chars.listRelationships(copy.id)).toHaveLength(1)
    const ada = copiedChars.find((c) => c.name === 'Ada')!
    const arc = chars.getArc(ada.id)
    expect(arc.desire).toBe('libertà')
    expect(chars.listArcSteps(arc.id)).toHaveLength(1)

    // l'originale resta intatto e indipendente
    ms.deleteScene(copiedScenes[0].id)
    expect(ms.listScenes(p.id)).toHaveLength(1)
  })
})
