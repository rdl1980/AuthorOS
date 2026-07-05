import { describe, it, expect } from 'vitest'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initDatabase, SCHEMA_VERSION } from '../src/main/data/db'
import { makeDb, tempDir } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'
import { SqliteStructureRepository } from '../src/main/data/structure-repository'
import { SnapshotService } from '../src/main/data/snapshot-service'

describe('Migrazioni schema (US-30.3)', () => {
  it('DB nuovo parte alla versione corrente e la mantiene alla riapertura', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'authoros-mig-'))
    const db1 = await initDatabase(dir)
    expect(db1.schemaVersion).toBe(SCHEMA_VERSION)
    // riapertura: nessuna rimigrazione, versione stabile
    const db2 = await initDatabase(dir)
    expect(db2.schemaVersion).toBe(SCHEMA_VERSION)
    // i dati sopravvivono alla riapertura
    const p = new SqliteProjectRepository(db2).create({ title: 'Persistente' })
    const db3 = await initDatabase(dir)
    expect(new SqliteProjectRepository(db3).get(p.id)?.title).toBe('Persistente')
  })
})

describe('Export/Import .authoros (US-30.2)', () => {
  it('roundtrip completo con id rimappati e contenuti identici', async () => {
    const db = await makeDb()
    const projects = new SqliteProjectRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const st = new SqliteStructureRepository(db)
    const snaps = new SnapshotService(db, tempDir())

    const p = projects.create({ title: 'Da esportare', genre: 'Thriller' })
    const ch = ms.createChapter(p.id, 'Cap 1')
    const sc = ms.createScene(p.id, ch.id, 'S1')
    ms.updateScene(sc.id, { content: 'contenuto originale del manoscritto' })
    const beats = st.setFramework(p.id, 'Three Act Structure')
    st.linkScene(beats[0].id, sc.id)
    const ada = chars.createCharacter(p.id, { name: 'Ada' })
    chars.updateArc(ada.id, { desire: 'fuggire' })

    const file = snaps.exportData(p.id)!
    expect(file.format).toBe('authoros')

    // import: nuovo progetto, id diversi, contenuti uguali
    const imported = snaps.importData(file)
    expect(imported.id).not.toBe(p.id)
    expect(imported.title).toBe('Da esportare')
    const impScenes = ms.listScenes(imported.id)
    expect(impScenes).toHaveLength(1)
    expect(impScenes[0].content).toBe('contenuto originale del manoscritto')
    expect(impScenes[0].id).not.toBe(sc.id)
    expect(st.listBeats(imported.id)).toHaveLength(8)
    expect(st.links(imported.id)).toHaveLength(1)
    const impChars = chars.listCharacters(imported.id)
    expect(impChars).toHaveLength(1)
    expect(chars.getArc(impChars[0].id).desire).toBe('fuggire')
    // l'originale è intatto
    expect(ms.listScenes(p.id)[0].id).toBe(sc.id)
  })

  it('rifiuta file non validi', async () => {
    const db = await makeDb()
    const snaps = new SnapshotService(db, tempDir())
    expect(() =>
      snaps.importData({ format: 'altro' } as unknown as Parameters<typeof snaps.importData>[0])
    ).toThrow()
  })
})

describe('Backup su cartella esterna (US-30.1)', () => {
  it('scrive solo se cambiato e ruota oltre il limite', async () => {
    const db = await makeDb()
    const projects = new SqliteProjectRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const snaps = new SnapshotService(db, tempDir())
    const backupDir = tempDir()

    const p = projects.create({ title: 'Backup Test' })
    const ch = ms.createChapter(p.id, 'C')
    const sc = ms.createScene(p.id, ch.id, 'S')

    // primo backup: scritto
    expect(snaps.backupTo(backupDir, p.id).written).toBe(true)
    // nessuna modifica: saltato
    expect(snaps.backupTo(backupDir, p.id).written).toBe(false)

    // 12 modifiche → 12 backup, ma ne restano max 10
    for (let i = 0; i < 12; i++) {
      ms.updateScene(sc.id, { content: `revisione ${i}` })
      expect(snaps.backupTo(backupDir, p.id).written).toBe(true)
    }
    const files = readdirSync(backupDir).filter((f) => f.endsWith('.authoros'))
    expect(files.length).toBeLessThanOrEqual(10)

    // il backup è reimportabile
    const latest = files.sort().reverse()[0]
    const imported = snaps.readImport(join(backupDir, latest))
    expect(imported.title).toBe('Backup Test')
  })
})
