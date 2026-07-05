import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import type { Chapter, Project, Scene } from '../src/shared/domain'
import { assembleModel } from '../src/main/export/builder'
import { buildDocx, buildDocxShunn } from '../src/main/export/docx'
import { buildEpub } from '../src/main/export/epub'
import { composeAssist } from '../src/main/ai/prompt'
import type { AssistKind } from '../src/shared/ai'

const now = new Date().toISOString()
const project: Project = {
  id: 'p1',
  title: 'Il faro',
  genre: 'Giallo / Mystery',
  framework: null,
  targetWordCount: null,
  deadline: null,
  status: 'active',
  ownerId: null,
  createdAt: now,
  updatedAt: now
}
const chapter = (id: string, title: string, sortOrder: number): Chapter => ({
  id,
  projectId: 'p1',
  title,
  sortOrder,
  createdAt: now,
  updatedAt: now
})
const scene = (id: string, chapterId: string, content: string): Scene => ({
  id,
  projectId: 'p1',
  chapterId,
  title: id,
  content,
  wordCount: content.split(/\s+/).filter(Boolean).length,
  status: 'draft',
  pov: '',
  locationId: null,
  synopsis: '',
  sortOrder: 0,
  createdAt: now,
  updatedAt: now
})

const chapters = [chapter('c1', 'Capitolo uno', 0), chapter('c2', 'Capitolo due', 1)]
const scenes = [
  scene('s1', 'c1', 'La notte era buia e la lanterna spenta.'),
  scene('s2', 'c2', 'Marta salì i gradini del faro contando i respiri.')
]

describe('Export Pro (Epic 31)', () => {
  it('US-31.4: chapterIds limita il modello ai capitoli scelti (parole incluse)', () => {
    const full = assembleModel(project, chapters, scenes)
    expect(full.chapters).toHaveLength(2)
    expect(full.words).toBe(scenes[0].wordCount + scenes[1].wordCount)

    const partial = assembleModel(project, chapters, scenes, { chapterIds: ['c2'] })
    expect(partial.chapters).toHaveLength(1)
    expect(partial.chapters[0].title).toBe('Capitolo due')
    expect(partial.words).toBe(scenes[1].wordCount)
  })

  it('US-31.1: il DOCX Shunn si genera ed è diverso dal template standard', async () => {
    const model = assembleModel(project, chapters, scenes, {
      frontMatter: { author: 'Rita De Luca' }
    })
    const standard = await buildDocx(model)
    const shunn = await buildDocxShunn(model)
    expect(standard.length).toBeGreaterThan(1000)
    expect(shunn.length).toBeGreaterThan(1000)
    expect(shunn.equals(standard)).toBe(false)
    // il documento Shunn contiene l'intestazione con il cognome
    const zip = await JSZip.loadAsync(shunn)
    const header = await Promise.all(
      Object.keys(zip.files)
        .filter((f) => f.startsWith('word/header'))
        .map((f) => zip.files[f].async('string'))
    )
    expect(header.join('')).toContain('De Luca / IL FARO')
    const doc = await zip.files['word/document.xml'].async('string')
    expect(doc).toContain('Times New Roman')
    expect(doc).toContain('CAPITOLO UNO')
  })

  it('US-31.2/31.3: EPUB con front matter e copertina', async () => {
    const model = assembleModel(project, chapters, scenes, {
      frontMatter: { author: 'Rita De Luca', copyright: '© 2026 RDL', dedication: 'A chi legge' }
    })
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
      'hex'
    )
    const epub = await buildEpub(model, 'uid-test', { data: png, mediaType: 'image/png' })
    const zip = await JSZip.loadAsync(epub)
    expect(zip.files['OEBPS/cover.png']).toBeTruthy()
    expect(zip.files['OEBPS/cover.xhtml']).toBeTruthy()
    expect(zip.files['OEBPS/title.xhtml']).toBeTruthy()
    expect(zip.files['OEBPS/dedication.xhtml']).toBeTruthy()
    const opf = await zip.files['OEBPS/content.opf'].async('string')
    expect(opf).toContain('properties="cover-image"')
    expect(opf).toContain('<dc:creator>Rita De Luca</dc:creator>')
    const title = await zip.files['OEBPS/title.xhtml'].async('string')
    expect(title).toContain('Il faro')
    expect(title).toContain('© 2026 RDL')
  })

  it('senza copertina lo spine parte dal frontespizio', async () => {
    const model = assembleModel(project, chapters, scenes)
    const epub = await buildEpub(model, 'uid-test-2')
    const zip = await JSZip.loadAsync(epub)
    expect(zip.files['OEBPS/cover.xhtml']).toBeFalsy()
    const opf = await zip.files['OEBPS/content.opf'].async('string')
    expect(opf).toContain('<itemref idref="title"/>')
  })
})

describe('Marketing & Reader Simulator (Epic 14 + 11)', () => {
  it('i prompt dei nuovi AssistKind sono composti e distinti', () => {
    const kinds: AssistKind[] = [
      'marketing-synopsis',
      'marketing-blurb',
      'marketing-pitch',
      'reader-genre',
      'reader-editor',
      'reader-agent',
      'reader-booktoker',
      'reader-reviewer'
    ]
    const systems = kinds.map((k) => composeAssist(k, 'panoramica del libro').system)
    for (const s of systems) expect(s.length).toBeGreaterThan(50)
    expect(new Set(systems).size).toBe(kinds.length)
    // la quarta di copertina non deve chiedere il finale, la sinossi sì
    expect(composeAssist('marketing-synopsis', 'x').system).toContain('finale')
    expect(composeAssist('marketing-blurb', 'x').system).toContain('NON rivelare il finale')
  })
})
