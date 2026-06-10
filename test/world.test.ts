import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb, tempDir } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteWorldRepository } from '../src/main/data/world-repository'
import { SearchService } from '../src/main/data/search-service'
import { SnapshotService } from '../src/main/data/snapshot-service'

let db: DB
let pid: string

beforeEach(async () => {
  db = await makeDb()
  pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
})

describe('WorldRepository (Epic 7)', () => {
  it('crea luoghi, organizzazioni e sistemi e filtra per tipo', () => {
    const world = new SqliteWorldRepository(db)
    world.create(pid, { kind: 'place', name: 'Il faro', description: 'Sulla scogliera nord' })
    world.create(pid, { kind: 'organization', name: 'La Gilda dei pescatori' })
    world.create(pid, { kind: 'system', name: 'Le maree', details: 'Regolano gli arrivi al porto' })
    expect(world.list(pid)).toHaveLength(3)
    expect(world.list(pid, 'place')).toHaveLength(1)
    expect(world.list(pid, 'organization')[0].name).toBe('La Gilda dei pescatori')
  })

  it('aggiorna ed elimina elementi', () => {
    const world = new SqliteWorldRepository(db)
    const el = world.create(pid, { kind: 'place', name: 'Il faro' })
    const u = world.update(el.id, { details: 'Spento da tre giorni' })
    expect(u?.details).toBe('Spento da tre giorni')
    world.remove(el.id)
    expect(world.list(pid)).toHaveLength(0)
  })

  it('entra nella ricerca full-text come tipo world', () => {
    const world = new SqliteWorldRepository(db)
    world.create(pid, { kind: 'organization', name: 'La Gilda', description: 'Controlla il porto' })
    const results = new SearchService(db).search(pid, 'porto')
    expect(results.some((r) => r.kind === 'world' && r.title === 'La Gilda')).toBe(true)
  })

  it('è incluso in duplicate, remove e snapshot del progetto', () => {
    const projects = new SqliteProjectRepository(db)
    const world = new SqliteWorldRepository(db)
    world.create(pid, { kind: 'place', name: 'Il faro' })

    // duplicate profondo
    const copy = projects.duplicate(pid)!
    expect(world.list(copy.id)).toHaveLength(1)
    expect(world.list(copy.id)[0].id).not.toBe(world.list(pid)[0].id)

    // snapshot roundtrip
    const snaps = new SnapshotService(db, tempDir())
    const snap = snaps.create(pid, 'Con mondo')!
    world.remove(world.list(pid)[0].id)
    expect(world.list(pid)).toHaveLength(0)
    snaps.restore(pid, snap.file)
    expect(world.list(pid)).toHaveLength(1)

    // remove a cascata
    projects.remove(pid)
    expect(world.list(pid)).toHaveLength(0)
  })
})
