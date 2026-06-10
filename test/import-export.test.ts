import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { autowireToBeats, htmlToMarkdown, parseManuscript } from '../src/shared/import'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteStructureRepository } from '../src/main/data/structure-repository'
import {
  markdownToPlainParagraphs,
  modelToHtml,
  modelToMarkdown,
  type ManuscriptModel
} from '../src/main/export/builder'
import { buildDocx } from '../src/main/export/docx'
import { buildEpub } from '../src/main/export/epub'

const MODEL: ManuscriptModel = {
  title: 'Il Romanzo',
  genre: 'Fantasy',
  chapters: [
    {
      title: 'Capitolo 1',
      scenes: [
        { title: 'S1', content: 'Prima scena con **grassetto**.' },
        { title: 'S2', content: 'Seconda scena.' }
      ]
    },
    { title: 'Capitolo 2', scenes: [{ title: 'S1', content: 'Altro testo.' }] }
  ]
}

describe('parseManuscript (US-21.3)', () => {
  it('riconosce capitoli (#) e scene (##)', () => {
    const md = '# Cap uno\n## Scena A\ntesto a\n## Scena B\ntesto b\n# Cap due\ntesto c'
    const parsed = parseManuscript(md)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].title).toBe('Cap uno')
    expect(parsed[0].scenes.map((s) => s.title)).toEqual(['Scena A', 'Scena B'])
    expect(parsed[1].scenes[0].content).toBe('testo c')
  })

  it('usa *** e --- come separatori di scena', () => {
    const md = '# Cap\nprima parte\n\n***\n\nseconda parte\n\n---\n\nterza'
    const parsed = parseManuscript(md)
    expect(parsed[0].scenes).toHaveLength(3)
    expect(parsed[0].scenes[1].content).toBe('seconda parte')
  })

  it('testo senza heading → capitolo unico con una scena', () => {
    const parsed = parseManuscript('Solo prosa, nessuna struttura.\nSeconda riga.')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe('Capitolo 1')
    expect(parsed[0].scenes).toHaveLength(1)
    expect(parsed[0].scenes[0].content).toContain('Seconda riga')
  })

  it('testo vuoto → nessun capitolo', () => {
    expect(parseManuscript('')).toHaveLength(0)
  })
})

describe('htmlToMarkdown (US-21.1)', () => {
  it('converte heading, enfasi e paragrafi (output mammoth)', () => {
    const html = '<h1>Titolo</h1><p>Un <strong>forte</strong> e un <em>corsivo</em>.</p><p>Secondo&nbsp;paragrafo.</p>'
    const md = htmlToMarkdown(html)
    expect(md).toContain('# Titolo')
    expect(md).toContain('**forte**')
    expect(md).toContain('*corsivo*')
    expect(md).toContain('Secondo paragrafo.')
  })
})

describe('autowireToBeats (US-21.5)', () => {
  it('mappa per posizione: prima scena → primo beat, ultima → ultimo', () => {
    const scenes = ['s1', 's2', 's3', 's4', 's5', 's6']
    const beats = ['b1', 'b2', 'b3']
    const pairs = autowireToBeats(scenes, beats)
    expect(pairs[0]).toEqual({ scene: 's1', beat: 'b1' })
    expect(pairs[5]).toEqual({ scene: 's6', beat: 'b3' })
    // distribuzione uniforme: 2 scene per beat
    expect(pairs.filter((p) => p.beat === 'b2').map((p) => p.scene)).toEqual(['s3', 's4'])
  })

  it('con meno scene che beat, alcuni beat restano scoperti (corretto)', () => {
    const pairs = autowireToBeats(['s1', 's2'], ['b1', 'b2', 'b3', 'b4'])
    expect(pairs).toEqual([
      { scene: 's1', beat: 'b1' },
      { scene: 's2', beat: 'b3' }
    ])
  })

  it('gestisce liste vuote', () => {
    expect(autowireToBeats([], ['b1'])).toEqual([])
    expect(autowireToBeats(['s1'], [])).toEqual([])
  })

  it('integrazione: scene importate collegate ai beat del framework', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    const ms = new SqliteManuscriptRepository(db)
    const st = new SqliteStructureRepository(db)
    const beats = st.setFramework(pid, 'Three Act Structure') // 8 beat

    // simula l'import: 4 scene in ordine, poi lo stesso wiring del PublishingService
    const ch = ms.createChapter(pid, 'Cap 1')
    const ids = ['A', 'B', 'C', 'D'].map((t) => ms.createScene(pid, ch.id, t).id)
    const covered = new Set<string>()
    for (const { scene, beat } of autowireToBeats(ids, beats.map((b) => b.id))) {
      st.linkScene(beat, scene)
      covered.add(beat)
    }

    const links = st.links(pid)
    expect(links).toHaveLength(4)
    expect(covered.size).toBe(4)
    // prima scena → primo beat (Setup), ultima → beat in coda
    expect(links.find((l) => l.sceneId === ids[0])?.beatId).toBe(beats[0].id)
    expect(links.find((l) => l.sceneId === ids[3])?.beatId).toBe(beats[6].id)
  })
})

describe('export builder', () => {
  it('modelToMarkdown produce capitoli e separatori', () => {
    const md = modelToMarkdown(MODEL)
    expect(md).toContain('# Il Romanzo')
    expect(md).toContain('# Capitolo 1')
    expect(md).toContain('***')
  })

  it('modelToHtml produce un documento completo', () => {
    const html = modelToHtml(MODEL)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Il Romanzo')
    expect(html).toContain('<strong>grassetto</strong>')
  })

  it('markdownToPlainParagraphs spoglia la sintassi', () => {
    const paras = markdownToPlainParagraphs('# Titolo\n\nTesto **forte** e *corsivo*.\n\n- punto')
    expect(paras).toEqual(['Titolo', 'Testo forte e corsivo.', 'punto'])
  })
})

describe('buildDocx (US-16.1)', () => {
  it('genera un DOCX valido (zip non vuoto)', async () => {
    const buf = await buildDocx(MODEL)
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK') // firma zip
    const zip = await JSZip.loadAsync(buf)
    expect(zip.file('word/document.xml')).toBeTruthy()
    const xml = await zip.file('word/document.xml')!.async('string')
    expect(xml).toContain('Capitolo 1')
    expect(xml).toContain('Prima scena')
  })
})

describe('buildEpub (US-16.2)', () => {
  it('genera un EPUB con mimetype, OPF, nav e capitoli', async () => {
    const buf = await buildEpub(MODEL, '12345678-aaaa-bbbb-cccc-1234567890ab')
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK')
    const zip = await JSZip.loadAsync(buf)
    expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip')
    expect(zip.file('META-INF/container.xml')).toBeTruthy()
    const opf = await zip.file('OEBPS/content.opf')!.async('string')
    expect(opf).toContain('Il Romanzo')
    expect(opf).toContain('ch2.xhtml')
    const ch1 = await zip.file('OEBPS/ch1.xhtml')!.async('string')
    expect(ch1).toContain('Capitolo 1')
    expect(ch1).toContain('* * *') // separatore tra le due scene
    expect(zip.file('OEBPS/nav.xhtml')).toBeTruthy()
  })
})
