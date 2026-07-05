import { BrowserWindow, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import mammoth from 'mammoth'
import { autowireToBeats, htmlToMarkdown, parseManuscript } from '@shared/import'
import type { ExportResult, ImportResult } from '@shared/publishing'
import type { ManuscriptRepository, ProjectRepository, StructureRepository } from '../data/types'
import { assembleModel, modelToHtml, type ManuscriptModel } from './builder'
import { buildDocx } from './docx'
import { buildEpub } from './epub'

const sanitize = (s: string): string => s.replace(/[<>:"/\\|?*]+/g, '').trim() || 'manoscritto'

/** Export e import del manoscritto (Epic 16 + Epic 21). Vive nel main process. */
export class PublishingService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly manuscript: ManuscriptRepository,
    private readonly structure: StructureRepository
  ) {}

  /**
   * US-21.6: rimuove i capitoli segnaposto rimasti vuoti (es. "Capitolo 1" del
   * template onboarding) prima di aggiungere il manoscritto importato, così
   * l'albero non mostra duplicati fantasma. Tocca solo capitoli con titolo
   * generico e senza una parola scritta.
   */
  cleanupPlaceholders(projectId: string): number {
    const chapters = this.manuscript.listChapters(projectId)
    const scenes = this.manuscript.listScenes(projectId)
    let removed = 0
    for (const ch of chapters) {
      const own = scenes.filter((s) => s.chapterId === ch.id)
      const generic = /^(capitolo \d+|nuovo capitolo)$/i.test(ch.title.trim())
      const empty = own.every((s) => s.wordCount === 0 && !s.content.trim())
      if (generic && empty) {
        this.manuscript.deleteChapter(ch.id)
        removed += 1
      }
    }
    return removed
  }

  private model(projectId: string): ManuscriptModel | null {
    const project = this.projects.get(projectId)
    if (!project) return null
    return assembleModel(
      project,
      this.manuscript.listChapters(projectId),
      this.manuscript.listScenes(projectId)
    )
  }

  private async save(
    title: string,
    ext: string,
    filterName: string,
    data: Buffer
  ): Promise<ExportResult> {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: `${sanitize(title)}.${ext}`,
      filters: [{ name: filterName, extensions: [ext] }]
    })
    if (canceled || !filePath) return { ok: false, error: 'annullato' }
    writeFileSync(filePath, data)
    return { ok: true, path: filePath }
  }

  async exportDocx(projectId: string): Promise<ExportResult> {
    const model = this.model(projectId)
    if (!model) return { ok: false, error: 'progetto non trovato' }
    try {
      return await this.save(model.title, 'docx', 'Documento Word', await buildDocx(model))
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async exportEpub(projectId: string): Promise<ExportResult> {
    const model = this.model(projectId)
    if (!model) return { ok: false, error: 'progetto non trovato' }
    try {
      return await this.save(model.title, 'epub', 'EPUB', await buildEpub(model, randomUUID()))
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  /** PDF: HTML del manoscritto stampato da una finestra nascosta (US-16.3). */
  async exportPdf(projectId: string): Promise<ExportResult> {
    const model = this.model(projectId)
    if (!model) return { ok: false, error: 'progetto non trovato' }
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    try {
      const html = modelToHtml(model)
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      const pdf = await win.webContents.printToPDF({
        pageSize: 'A5',
        printBackground: false,
        margins: { top: 0.6, bottom: 0.6, left: 0.55, right: 0.55 }
      })
      return await this.save(model.title, 'pdf', 'PDF', pdf)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      win.destroy()
    }
  }

  /** Import DOCX/Markdown/TXT con riconoscimento capitoli e scene (Epic 21). */
  async importFile(projectId: string): Promise<ImportResult> {
    const project = this.projects.get(projectId)
    if (!project) return { ok: false, error: 'progetto non trovato' }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Manoscritti', extensions: ['docx', 'md', 'markdown', 'txt'] },
        { name: 'Tutti i file', extensions: ['*'] }
      ]
    })
    if (canceled || !filePaths[0]) return { ok: false, error: 'annullato' }
    const filePath = filePaths[0]

    try {
      let markdown: string
      if (extname(filePath).toLowerCase() === '.docx') {
        const { value: html } = await mammoth.convertToHtml({ path: filePath })
        markdown = htmlToMarkdown(html)
      } else {
        markdown = readFileSync(filePath, 'utf8')
      }

      const parsed = parseManuscript(markdown)
      if (parsed.length === 0) return { ok: false, error: 'nessun contenuto riconosciuto' }

      // US-21.6: via i capitoli segnaposto vuoti prima di aggiungere quelli veri.
      this.cleanupPlaceholders(projectId)

      let scenes = 0
      let words = 0
      const createdSceneIds: string[] = []
      for (const ch of parsed) {
        const title =
          parsed.length === 1 && ch.title === 'Capitolo 1'
            ? basename(filePath, extname(filePath))
            : ch.title
        const chapter = this.manuscript.createChapter(projectId, title)
        for (const sc of ch.scenes) {
          const scene = this.manuscript.createScene(projectId, chapter.id, sc.title)
          const updated = this.manuscript.updateScene(scene.id, { content: sc.content })
          createdSceneIds.push(scene.id)
          scenes += 1
          words += updated?.wordCount ?? 0
        }
      }

      // Autowire import→struttura (US-21.5): se il progetto ha un framework con
      // beat, le scene importate vengono associate per posizione narrativa.
      let beatsLinked: number | undefined
      const beats = this.structure.listBeats(projectId)
      if (beats.length > 0 && createdSceneIds.length > 0) {
        const covered = new Set<string>()
        for (const { scene, beat } of autowireToBeats(createdSceneIds, beats.map((b) => b.id))) {
          this.structure.linkScene(beat, scene)
          covered.add(beat)
        }
        beatsLinked = covered.size
      }

      return { ok: true, chapters: parsed.length, scenes, words, beatsLinked }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
}
