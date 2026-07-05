import { marked } from 'marked'
import type { Chapter, Project, Scene } from '@shared/domain'

export interface ManuscriptModel {
  title: string
  genre: string | null
  chapters: { title: string; scenes: { title: string; content: string }[] }[]
}

/** Rimuove le annotazioni non stampabili {>>...<<} dagli export (US-26.5). */
export function stripAnnotations(markdown: string): string {
  return markdown.replace(/\{>>[\s\S]*?<<\}/g, '').replace(/[ \t]+$/gm, '')
}

/** Assembla il modello del manoscritto da progetto, capitoli e scene ordinati. */
export function assembleModel(project: Project, chapters: Chapter[], scenes: Scene[]): ManuscriptModel {
  return {
    title: project.title,
    genre: project.genre,
    chapters: chapters.map((ch) => ({
      title: ch.title,
      scenes: scenes
        .filter((s) => s.chapterId === ch.id)
        .map((s) => ({ title: s.title, content: stripAnnotations(s.content) }))
    }))
  }
}

/** Manoscritto completo come unico documento Markdown. */
export function modelToMarkdown(model: ManuscriptModel): string {
  const parts: string[] = [`# ${model.title}`]
  for (const ch of model.chapters) {
    parts.push(`\n# ${ch.title}`)
    ch.scenes.forEach((s, i) => {
      if (i > 0) parts.push('\n***')
      parts.push(`\n${s.content}`.trimEnd())
    })
  }
  return parts.join('\n').trim() + '\n'
}

const PAGE_CSS = `
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.6;
         max-width: 42em; margin: 0 auto; padding: 2em; color: #111; }
  h1.book-title { text-align: center; font-size: 24pt; margin: 3em 0; page-break-after: always; }
  h1 { font-size: 18pt; margin-top: 2.5em; page-break-before: always; }
  hr.scene { border: none; text-align: center; margin: 1.6em 0; }
  hr.scene::after { content: '* * *'; color: #555; }
  p { text-indent: 1.4em; margin: 0 0 .2em; text-align: justify; }
`

/** Manoscritto come documento HTML autonomo (base per la stampa PDF). */
export function modelToHtml(model: ManuscriptModel): string {
  marked.setOptions({ gfm: true, breaks: true })
  const body: string[] = [`<h1 class="book-title">${escapeHtml(model.title)}</h1>`]
  for (const ch of model.chapters) {
    body.push(`<h1>${escapeHtml(ch.title)}</h1>`)
    ch.scenes.forEach((s, i) => {
      if (i > 0) body.push('<hr class="scene" />')
      body.push(marked.parse(s.content) as string)
    })
  }
  return (
    `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"/>` +
    `<title>${escapeHtml(model.title)}</title><style>${PAGE_CSS}</style></head>` +
    `<body>${body.join('\n')}</body></html>`
  )
}

/** Rimuove la sintassi Markdown più comune per ottenere testo semplice (per il DOCX). */
export function markdownToPlainParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n+/)
    .map((p) =>
      p
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^[-*]\s+/gm, '')
        .replace(/\n/g, ' ')
        .trim()
    )
    .filter((p) => p.length > 0)
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
