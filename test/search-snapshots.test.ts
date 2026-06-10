import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb, tempDir } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'
import { SqliteTimelineRepository } from '../src/main/data/timeline-repository'
import { SqliteStructureRepository } from '../src/main/data/structure-repository'
import { SearchService } from '../src/main/data/search-service'
import { SnapshotService } from '../src/main/data/snapshot-service'

let db: DB
let pid: string

beforeEach(async () => {
  db = await makeDb()
  pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
})

function seedContent() {
  const ms = new SqliteManuscriptRepository(db)
  const chars = new SqliteCharacterRepository(db)
  const tl = new SqliteTimelineRepository(db)
  const ch = ms.createChapter(pid, 'Il faro')
  const sc = ms.createScene(pid, ch.id, 'Tempesta')
  ms.updateScene(sc.id, { content: 'La lanterna del faro tremava sotto la tempesta di mezzanotte.' })
  ms.createNote(pid, { sceneId: sc.id }, 'Ricordare: la lanterna del faro è un simbolo.')
  chars.createCharacter(pid, { name: 'Guardiano Elia', summary: 'Custode del faro da trent’anni.' })
  tl.createEvent(pid, { title: 'Naufragio', description: 'Una nave si schianta vicino al faro.' })
  return { ms, ch, sc }
}

describe('SearchService (US-24.1)', () => {
  it('trova corrispondenze in scene, capitoli, note, personaggi ed eventi', () => {
    seedContent()
    const search = new SearchService(db)
    const results = search.search(pid, 'faro')
    const kinds = results.map((r) => r.kind).sort()
    expect(kinds).toEqual(['chapter', 'character', 'event', 'note', 'scene'])
  })

  it('è case-insensitive e produce snippet con contesto', () => {
    seedContent()
    const search = new SearchService(db)
    const [scene] = new SearchService(db).search(pid, 'MEZZANOTTE').filter((r) => r.kind === 'scene')
    expect(scene).toBeDefined()
    expect(scene.snippet.toLowerCase()).toContain('mezzanotte')
    expect(search.search(pid, 'inesistentexyz')).toHaveLength(0)
  })

  it('ignora query troppo corte', () => {
    seedContent()
    expect(new SearchService(db).search(pid, 'f')).toHaveLength(0)
  })
})

describe('SnapshotService (US-24.2/24.3)', () => {
  it('crea, elenca e ripristina uno snapshot (roundtrip completo)', () => {
    const { ms, sc } = seedContent()
    new SqliteStructureRepository(db).setFramework(pid, 'Three Act Structure')
    const snaps = new SnapshotService(db, tempDir())

    const created = snaps.create(pid, 'Prima stesura')
    expect(created?.label).toBe('Prima stesura')
    expect(created?.words).toBeGreaterThan(0)

    // modifica distruttiva: svuota la scena e cancella il capitolo
    ms.updateScene(sc.id, { content: '' })
    expect(ms.getStats(pid).words).toBe(0)

    // ripristino: contenuti tornati + snapshot di sicurezza creato
    expect(snaps.restore(pid, created!.file)).toBe(true)
    expect(ms.getStats(pid).words).toBeGreaterThan(0)
    expect(ms.getScene(sc.id)?.content).toContain('lanterna')
    const labels = snaps.list(pid).map((s) => s.label)
    expect(labels).toContain('Pre-ripristino')
    // struttura ripristinata
    expect(new SqliteStructureRepository(db).listBeats(pid)).toHaveLength(8)
  })

  it('autoSnapshot salta se i dati non sono cambiati e ruota i vecchi', () => {
    const { ms, sc } = seedContent()
    const snaps = new SnapshotService(db, tempDir())

    expect(snaps.autoSnapshot(pid)).not.toBeNull()
    // nessuna modifica → nessun nuovo snapshot
    expect(snaps.autoSnapshot(pid)).toBeNull()

    // 12 modifiche → 12 auto-snapshot, ma ne restano max 10
    for (let i = 0; i < 12; i++) {
      ms.updateScene(sc.id, { content: `revisione numero ${i}` })
      expect(snaps.autoSnapshot(pid)).not.toBeNull()
    }
    const autos = snaps.list(pid).filter((s) => s.kind === 'auto')
    expect(autos.length).toBeLessThanOrEqual(10)
  })

  it('remove elimina il file e restore su file mancante fallisce pulito', () => {
    seedContent()
    const snaps = new SnapshotService(db, tempDir())
    const created = snaps.create(pid, 'Da cancellare')!
    expect(snaps.remove(pid, created.file)).toBe(true)
    expect(snaps.list(pid)).toHaveLength(0)
    expect(snaps.restore(pid, created.file)).toBe(false)
  })
})
