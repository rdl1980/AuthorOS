import { describe, it, expect } from 'vitest'
import { parseArc, parseBlueprint } from '../src/shared/copilot'
import { AIGateway, type GatewaySettings } from '../src/main/ai/gateway'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'
import { SqliteWorldRepository } from '../src/main/data/world-repository'
import { PlotService } from '../src/main/data/plot-service'
import { SnapshotService } from '../src/main/data/snapshot-service'
import { tempDir } from './helpers'

const mockSettings = (): GatewaySettings => ({
  resolveAi: () => ({ mode: 'mock', provider: 'mock', model: 'authoros-mock-1', apiKey: null }),
  getMonthlyBudgetUsd: () => null,
  getAiSpentUsd: () => 0,
  addAiSpend: () => undefined
})

describe('Copilot parser (Epic 20)', () => {
  it('parseBlueprint legge titolo, framework, capitoli e personaggi', () => {
    const text = [
      'TITOLO: Il faro delle nebbie',
      'GENERE: Giallo / Mystery',
      'LOGLINE: Una giornalista indaga su un faro che non avrebbe mai dovuto spegnersi.',
      'FRAMEWORK: Seven Point Story Structure',
      'CAPITOLI:',
      '1. L\'arrivo — Marta raggiunge l\'isola in tempesta',
      '2. Il custode scomparso — nessuno vuole parlarne',
      '3. La verità — il faro nascondeva un segnale',
      'PERSONAGGI:',
      '- Marta Renzi | Protagonista | Giornalista testarda',
      '- Elia | Antagonista | Il custode che sa troppo'
    ].join('\n')
    const bp = parseBlueprint(text)
    expect(bp).not.toBeNull()
    expect(bp!.title).toBe('Il faro delle nebbie')
    expect(bp!.framework).toBe('Seven Point Story Structure')
    expect(bp!.chapters).toHaveLength(3)
    expect(bp!.chapters[0]).toEqual({
      title: "L'arrivo",
      synopsis: "Marta raggiunge l'isola in tempesta"
    })
    expect(bp!.characters).toHaveLength(2)
    expect(bp!.characters[1]).toEqual({
      name: 'Elia',
      role: 'Antagonista',
      summary: 'Il custode che sa troppo'
    })
  })

  it('parseBlueprint tollera grassetti markdown e ritorna null su testo non valido', () => {
    const bold = parseBlueprint('**TITOLO:** X\n**CAPITOLI:**\n1. Uno — inizio')
    expect(bold?.title).toBe('X')
    expect(parseBlueprint('Ciao, ecco qualche idea generica senza formato.')).toBeNull()
  })

  it('parseArc mappa le sei etichette italiane sui campi arco', () => {
    const arc = parseArc(
      'DESIDERIO: vincere\nBISOGNO: perdonarsi\nPAURA: il buio\nFERITA: un lutto\nBUGIA: è colpa sua\nTRASFORMAZIONE: accetta il passato'
    )
    expect(arc).not.toBeNull()
    expect(arc!.need).toBe('perdonarsi')
    expect(arc!.transformation).toBe('accetta il passato')
    expect(parseArc('nessuna etichetta qui')).toBeNull()
  })

  it('il MockProvider risponde nel formato blueprint/arco (wizard provabile senza API key)', async () => {
    const gw = new AIGateway(mockSettings())
    const bpRes = await gw.assist('copilot-blueprint', 'Un ladro gentiluomo a Venezia')
    expect(parseBlueprint(bpRes.text)).not.toBeNull()
    const arcRes = await gw.assist('copilot-arc', 'Scheda: ladro gentiluomo')
    expect(parseArc(arcRes.text)).not.toBeNull()
  })
})

describe('Metadati scena & personaggi in scena (Epic 28)', () => {
  it('updateScene salva POV, luogo e sinossi; i link personaggio↔scena funzionano', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const world = new SqliteWorldRepository(db)

    const ch = ms.createChapter(pid, 'Cap 1')
    const sc = ms.createScene(pid, ch.id, 'Scena 1.1')
    expect(sc.pov).toBe('')
    expect(sc.synopsis).toBe('')

    const posto = world.create(pid, { kind: 'place', name: 'Il faro' })
    const updated = ms.updateScene(sc.id, {
      pov: 'Marta',
      locationId: posto.id,
      synopsis: 'Marta scopre il segnale.'
    })
    expect(updated?.pov).toBe('Marta')
    expect(updated?.locationId).toBe(posto.id)
    expect(updated?.synopsis).toBe('Marta scopre il segnale.')

    const marta = chars.createCharacter(pid, { name: 'Marta' })
    ms.linkSceneCharacter(sc.id, marta.id)
    ms.linkSceneCharacter(sc.id, marta.id) // idempotente
    expect(ms.listSceneCharacters(pid)).toEqual([{ sceneId: sc.id, characterId: marta.id }])

    ms.unlinkSceneCharacter(sc.id, marta.id)
    expect(ms.listSceneCharacters(pid)).toHaveLength(0)
  })

  it('eliminare scena o capitolo elimina anche i link personaggio↔scena', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const c = chars.createCharacter(pid, { name: 'Ada' })

    const ch = ms.createChapter(pid, 'Cap')
    const s1 = ms.createScene(pid, ch.id, 'S1')
    const s2 = ms.createScene(pid, ch.id, 'S2')
    ms.linkSceneCharacter(s1.id, c.id)
    ms.linkSceneCharacter(s2.id, c.id)

    ms.deleteScene(s1.id)
    expect(ms.listSceneCharacters(pid)).toHaveLength(1)
    ms.deleteChapter(ch.id)
    expect(ms.listSceneCharacters(pid)).toHaveLength(0)
  })

  it('la duplicazione del progetto rimappa luogo e presenze sui nuovi id', async () => {
    const db = await makeDb()
    const projects = new SqliteProjectRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const world = new SqliteWorldRepository(db)

    const pid = projects.create({ title: 'Orig' }).id
    const ch = ms.createChapter(pid, 'Cap')
    const sc = ms.createScene(pid, ch.id, 'S')
    const posto = world.create(pid, { kind: 'place', name: 'Molo' })
    const ada = chars.createCharacter(pid, { name: 'Ada' })
    ms.updateScene(sc.id, { pov: 'Ada', locationId: posto.id, synopsis: 'sinossi' })
    ms.linkSceneCharacter(sc.id, ada.id)

    const copy = projects.duplicate(pid)!
    const copiedScenes = ms.listScenes(copy.id)
    expect(copiedScenes).toHaveLength(1)
    expect(copiedScenes[0].pov).toBe('Ada')
    expect(copiedScenes[0].synopsis).toBe('sinossi')
    // luogo rimappato sul NUOVO world element, non sull'originale
    const copiedPlaces = world.list(copy.id, 'place')
    expect(copiedScenes[0].locationId).toBe(copiedPlaces[0].id)
    expect(copiedScenes[0].locationId).not.toBe(posto.id)
    // presenza rimappata sul nuovo personaggio
    const links = ms.listSceneCharacters(copy.id)
    expect(links).toHaveLength(1)
    expect(links[0].sceneId).toBe(copiedScenes[0].id)
    expect(links[0].characterId).not.toBe(ada.id)

    // la rimozione a cascata pulisce anche i link
    projects.remove(copy.id)
    expect(ms.listSceneCharacters(copy.id)).toHaveLength(0)
  })

  it('US-28.5: un personaggio collegato a una scena non è più "inutilizzato"', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const ch = ms.createChapter(pid, 'Cap')
    const sc = ms.createScene(pid, ch.id, 'S')
    ms.updateScene(sc.id, { content: 'Una scena senza nomi propri.' })

    const fantasma = chars.createCharacter(pid, { name: 'Personaggio Fantasma' })
    const plot = new PlotService(db)
    expect(plot.analyze(pid).unusedCharacters.map((c) => c.id)).toContain(fantasma.id)

    ms.linkSceneCharacter(sc.id, fantasma.id)
    expect(plot.analyze(pid).unusedCharacters.map((c) => c.id)).not.toContain(fantasma.id)
  })

  it('export/import .authoros conserva metadati e presenze (id rimappati)', async () => {
    const db = await makeDb()
    const projects = new SqliteProjectRepository(db)
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const world = new SqliteWorldRepository(db)
    const snaps = new SnapshotService(db, tempDir())

    const pid = projects.create({ title: 'Da esportare' }).id
    const ch = ms.createChapter(pid, 'Cap')
    const sc = ms.createScene(pid, ch.id, 'S')
    const posto = world.create(pid, { kind: 'place', name: 'Faro' })
    const ada = chars.createCharacter(pid, { name: 'Ada' })
    ms.updateScene(sc.id, { pov: 'Ada', locationId: posto.id, synopsis: 'la sinossi' })
    ms.linkSceneCharacter(sc.id, ada.id)

    const file = snaps.exportData(pid)!
    const imported = snaps.importData(file)

    const scenes = ms.listScenes(imported.id)
    expect(scenes[0].pov).toBe('Ada')
    expect(scenes[0].synopsis).toBe('la sinossi')
    const importedPlaces = world.list(imported.id, 'place')
    expect(scenes[0].locationId).toBe(importedPlaces[0].id)
    const links = ms.listSceneCharacters(imported.id)
    expect(links).toHaveLength(1)
    expect(links[0].sceneId).toBe(scenes[0].id)
  })
})
