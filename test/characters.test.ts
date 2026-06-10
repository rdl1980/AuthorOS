import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'

let db: DB
let pid: string

beforeEach(async () => {
  db = await makeDb()
  pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
})

describe('CharacterRepository — schede (Epic 6)', () => {
  it('crea, aggiorna ed elenca personaggi', () => {
    const repo = new SqliteCharacterRepository(db)
    const c = repo.createCharacter(pid, { name: 'Ada', role: 'Protagonista' })
    expect(c.name).toBe('Ada')
    const u = repo.updateCharacter(c.id, { summary: 'Ladra gentiluomo', traits: 'astuta' })
    expect(u?.summary).toBe('Ladra gentiluomo')
    expect(repo.listCharacters(pid)).toHaveLength(1)
  })

  it('gestisce le relazioni tra personaggi (US-6.2)', () => {
    const repo = new SqliteCharacterRepository(db)
    const a = repo.createCharacter(pid, { name: 'Ada' })
    const b = repo.createCharacter(pid, { name: 'Bruno' })
    const rel = repo.addRelationship(pid, a.id, b.id, 'mentore di')
    expect(repo.listRelationships(pid)).toHaveLength(1)
    repo.removeRelationship(rel.id)
    expect(repo.listRelationships(pid)).toHaveLength(0)
  })

  it('eliminare un personaggio rimuove arco, tappe e relazioni', () => {
    const repo = new SqliteCharacterRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const a = repo.createCharacter(pid, { name: 'Ada' })
    const b = repo.createCharacter(pid, { name: 'Bruno' })
    repo.addRelationship(pid, a.id, b.id, 'ama')
    repo.addRelationship(pid, b.id, a.id, 'odia')
    const arc = repo.getArc(a.id)
    const ch = ms.createChapter(pid, 'Cap 1')
    repo.addArcStep(arc.id, ch.id, 'prima incrinatura')
    repo.deleteCharacter(a.id)
    expect(repo.listCharacters(pid)).toHaveLength(1)
    expect(repo.listRelationships(pid)).toHaveLength(0)
    expect(repo.listArcSteps(arc.id)).toHaveLength(0)
  })
})

describe('CharacterRepository — arco (Epic 5)', () => {
  it('crea l’arco lazy e lo aggiorna (US-5.1/5.2)', () => {
    const repo = new SqliteCharacterRepository(db)
    const c = repo.createCharacter(pid, { name: 'Ada' })
    const arc = repo.getArc(c.id)
    expect(arc.desire).toBe('')
    // secondo accesso: stesso arco, non un duplicato
    expect(repo.getArc(c.id).id).toBe(arc.id)
    const u = repo.updateArc(c.id, { desire: 'libertà', lie: 'non merito amore' })
    expect(u.desire).toBe('libertà')
    expect(u.lie).toBe('non merito amore')
  })

  it('collega tappe dell’arco ai capitoli in ordine (US-5.3)', () => {
    const repo = new SqliteCharacterRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const c = repo.createCharacter(pid, { name: 'Ada' })
    const arc = repo.getArc(c.id)
    const c1 = ms.createChapter(pid, 'Cap 1')
    const c2 = ms.createChapter(pid, 'Cap 2')
    repo.addArcStep(arc.id, c1.id, 'nega la ferita')
    const s2 = repo.addArcStep(arc.id, c2.id, 'affronta la paura')
    const steps = repo.listArcSteps(arc.id)
    expect(steps.map((s) => s.description)).toEqual(['nega la ferita', 'affronta la paura'])
    repo.removeArcStep(s2.id)
    expect(repo.listArcSteps(arc.id)).toHaveLength(1)
  })
})
