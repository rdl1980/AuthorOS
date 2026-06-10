import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteStructureRepository } from '../src/main/data/structure-repository'
import { SqliteStyleRepository } from '../src/main/data/style-repository'

let db: DB

beforeEach(async () => {
  db = await makeDb()
})

describe('ProjectRepository (Epic 1)', () => {
  it('crea, elenca e recupera progetti', () => {
    const repo = new SqliteProjectRepository(db)
    const p = repo.create({ title: 'Romanzo', genre: 'Fantasy', framework: "Hero's Journey" })
    expect(p.id).toBeTruthy()
    expect(p.status).toBe('active')
    expect(p.ownerId).toBeNull()
    expect(repo.list()).toHaveLength(1)
    expect(repo.get(p.id)?.genre).toBe('Fantasy')
    expect(repo.get('inesistente')).toBeNull()
  })

  it('duplica un progetto con suffisso (copia)', () => {
    const repo = new SqliteProjectRepository(db)
    const p = repo.create({ title: 'Originale' })
    const copy = repo.duplicate(p.id)
    expect(copy?.title).toBe('Originale (copia)')
    expect(repo.list()).toHaveLength(2)
  })

  it('archivia/ripristina e filtra dalla lista', () => {
    const repo = new SqliteProjectRepository(db)
    const p = repo.create({ title: 'Da archiviare' })
    repo.setArchived(p.id, true)
    expect(repo.list()).toHaveLength(0)
    expect(repo.list(true)).toHaveLength(1)
    repo.setArchived(p.id, false)
    expect(repo.list()).toHaveLength(1)
  })

  it('aggiorna campi e rimuove', () => {
    const repo = new SqliteProjectRepository(db)
    const p = repo.create({ title: 'X' })
    const u = repo.update(p.id, { title: 'Y', targetWordCount: 50000 })
    expect(u?.title).toBe('Y')
    expect(u?.targetWordCount).toBe(50000)
    expect(repo.remove(p.id)).toBe(true)
    expect(repo.list(true)).toHaveLength(0)
  })
})

describe('ManuscriptRepository (Epic 2)', () => {
  function seedProject(): string {
    return new SqliteProjectRepository(db).create({ title: 'Libro' }).id
  }

  it('crea capitoli e scene mantenendo l’ordine', () => {
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const c1 = ms.createChapter(pid, 'Cap 1')
    const c2 = ms.createChapter(pid, 'Cap 2')
    expect(ms.listChapters(pid).map((c) => c.id)).toEqual([c1.id, c2.id])
    ms.createScene(pid, c1.id, 'S1')
    ms.createScene(pid, c1.id, 'S2')
    expect(ms.listScenes(pid)).toHaveLength(2)
  })

  it('aggiorna il contenuto e ricalcola il word count', () => {
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const c = ms.createChapter(pid, 'C')
    const s = ms.createScene(pid, c.id, 'S')
    const updated = ms.updateScene(s.id, { content: 'Era una notte buia e tempestosa' })
    expect(updated?.wordCount).toBe(6)
    expect(ms.getStats(pid).words).toBe(6)
  })

  it('riordina le scene', () => {
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const c = ms.createChapter(pid, 'C')
    const s1 = ms.createScene(pid, c.id, 'S1')
    const s2 = ms.createScene(pid, c.id, 'S2')
    ms.reorderScenes(c.id, [s2.id, s1.id])
    expect(ms.listScenes(pid).map((s) => s.id)).toEqual([s2.id, s1.id])
  })

  it('sposta una scena tra capitoli', () => {
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const c1 = ms.createChapter(pid, 'C1')
    const c2 = ms.createChapter(pid, 'C2')
    const s = ms.createScene(pid, c1.id, 'S')
    ms.moveScene(s.id, c2.id, 0)
    expect(ms.getScene(s.id)?.chapterId).toBe(c2.id)
  })

  it('elimina un capitolo a cascata (scene + note)', () => {
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const c = ms.createChapter(pid, 'C')
    const s = ms.createScene(pid, c.id, 'S')
    ms.createNote(pid, { sceneId: s.id }, 'nota')
    ms.deleteChapter(c.id)
    expect(ms.listScenes(pid)).toHaveLength(0)
    expect(ms.listNotes(pid)).toHaveLength(0)
  })

  it('gestisce le note con scope (US-2.6)', () => {
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const c = ms.createChapter(pid, 'C')
    const s = ms.createScene(pid, c.id, 'S')
    const n = ms.createNote(pid, { sceneId: s.id }, 'prima nota')
    expect(ms.listNotes(pid, { sceneId: s.id })).toHaveLength(1)
    ms.updateNote(n.id, 'aggiornata')
    expect(ms.listNotes(pid)[0].content).toBe('aggiornata')
    ms.deleteNote(n.id)
    expect(ms.listNotes(pid)).toHaveLength(0)
  })
})

describe('StructureRepository (Epic 4)', () => {
  function seedProject(): string {
    return new SqliteProjectRepository(db).create({ title: 'Libro' }).id
  }

  it('genera i beat dal template del framework (US-4.1/4.2)', () => {
    const st = new SqliteStructureRepository(db)
    const pid = seedProject()
    const beats = st.setFramework(pid, "Hero's Journey")
    expect(beats).toHaveLength(9)
    expect(st.listBeats(pid)[0].title).toBe('Ordinary World')
  })

  it('associa e dissocia scene ai beat (US-4.3)', () => {
    const st = new SqliteStructureRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const beats = st.setFramework(pid, 'Three Act Structure')
    const c = ms.createChapter(pid, 'C')
    const s = ms.createScene(pid, c.id, 'S')
    st.linkScene(beats[0].id, s.id)
    expect(st.links(pid)).toHaveLength(1)
    st.linkScene(beats[0].id, s.id) // idempotente
    expect(st.links(pid)).toHaveLength(1)
    st.unlinkScene(beats[0].id, s.id)
    expect(st.links(pid)).toHaveLength(0)
  })

  it('cambiando framework rigenera i beat e pulisce i link', () => {
    const st = new SqliteStructureRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const pid = seedProject()
    const b = st.setFramework(pid, "Hero's Journey")
    const c = ms.createChapter(pid, 'C')
    const s = ms.createScene(pid, c.id, 'S')
    st.linkScene(b[0].id, s.id)
    const seven = st.setFramework(pid, 'Seven Point Story Structure')
    expect(seven).toHaveLength(7)
    expect(st.links(pid)).toHaveLength(0)
    st.clear(pid)
    expect(st.listBeats(pid)).toHaveLength(0)
  })
})

describe('StyleRepository (Epic 23)', () => {
  function seedProject(): string {
    return new SqliteProjectRepository(db).create({ title: 'Libro' }).id
  }

  it('il primo profilo è attivo; setActive sposta l’attivo', () => {
    const sr = new SqliteStyleRepository(db)
    const pid = seedProject()
    const a = sr.create(pid, { name: 'Voce A', tone: 'ironico' })
    expect(a.isActive).toBe(true)
    const b = sr.create(pid, { name: 'Voce B' })
    expect(b.isActive).toBe(false)
    expect(sr.getActive(pid)?.id).toBe(a.id)
    sr.setActive(pid, b.id)
    expect(sr.getActive(pid)?.id).toBe(b.id)
  })

  it('aggiorna e rimuove un profilo', () => {
    const sr = new SqliteStyleRepository(db)
    const pid = seedProject()
    const a = sr.create(pid, { name: 'Voce' })
    const u = sr.update(a.id, { instructions: 'frasi brevi' })
    expect(u?.instructions).toBe('frasi brevi')
    sr.remove(a.id)
    expect(sr.list(pid)).toHaveLength(0)
  })
})
