// Parsing per l'import di manoscritti (Epic 21). Funzioni pure e deterministiche.

export interface ParsedScene {
  title: string
  content: string
}

export interface ParsedChapter {
  title: string
  scenes: ParsedScene[]
}

/**
 * Riconosce la struttura di un manoscritto Markdown/testo (US-21.3):
 * - `# Titolo`  → nuovo capitolo
 * - `## Titolo` → nuova scena nel capitolo corrente
 * - `***`, `* * *` o `---` su riga propria → separatore di scena
 * - testo senza heading → un capitolo unico con una scena
 */
export function parseManuscript(text: string): ParsedChapter[] {
  const chapters: ParsedChapter[] = []
  let chapter: ParsedChapter | null = null
  let scene: ParsedScene | null = null
  let buffer: string[] = []
  let sceneCounter = 0
  /** Il primo capitolo è stato aperto implicitamente (testo prima di un heading)? */
  let firstChapterAuto = false

  const flushScene = (): void => {
    const content = buffer.join('\n').trim()
    buffer = []
    if (!chapter) return
    if (scene) {
      scene.content = content
      if (scene.content || scene.title) chapter.scenes.push(scene)
      scene = null
    } else if (content) {
      // US-21.7: le scene senza titolo sono numerate "Scena x.y" (x = capitolo).
      sceneCounter += 1
      chapter.scenes.push({ title: `Scena ${chapters.length}.${sceneCounter}`, content })
    }
  }

  const openChapter = (title: string, auto = false): void => {
    flushScene()
    sceneCounter = 0
    if (chapters.length === 0) firstChapterAuto = auto
    chapter = { title: title.trim() || `Capitolo ${chapters.length + 1}`, scenes: [] }
    chapters.push(chapter)
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw

    const h1 = line.match(/^#\s+(.*)$/)
    if (h1) {
      openChapter(h1[1])
      continue
    }

    const h2 = line.match(/^##\s+(.*)$/)
    if (h2) {
      if (!chapter) openChapter('Capitolo 1', true)
      flushScene()
      scene = { title: h2[1].trim() || 'Scena', content: '' }
      continue
    }

    if (/^(\*\s*\*\s*\*|-{3,})\s*$/.test(line.trim())) {
      if (!chapter) openChapter('Capitolo 1', true)
      flushScene()
      continue
    }

    if (!chapter && line.trim()) openChapter('Capitolo 1', true)
    buffer.push(line)
  }
  flushScene()

  // US-21.6: il testo prima del primo vero capitolo non deve mascherarsi da
  // "Capitolo 1" — se seguono altri capitoli espliciti diventa "Premessa".
  if (firstChapterAuto && chapters.length > 1) chapters[0].title = 'Premessa'

  // Capitoli senza scene (es. solo heading) → scena vuota per mantenerli navigabili
  chapters.forEach((ch, i) => {
    if (ch.scenes.length === 0) ch.scenes.push({ title: `Scena ${i + 1}.1`, content: '' })
  })
  return chapters
}

/**
 * Autowire import→struttura (US-21.5): mappa le scene importate sui beat del
 * framework selezionato in proporzione alla posizione narrativa. La prima scena
 * cade sul primo beat, l'ultima sull'ultimo, le altre distribuite linearmente.
 */
export function autowireToBeats<S, B>(scenes: S[], beats: B[]): { scene: S; beat: B }[] {
  if (scenes.length === 0 || beats.length === 0) return []
  return scenes.map((scene, i) => ({
    scene,
    beat: beats[Math.min(beats.length - 1, Math.floor((i / scenes.length) * beats.length))]
  }))
}

/**
 * Conversione HTML→Markdown minimale per l'output di mammoth (US-21.1):
 * gestisce h1-h3, p, br, strong/b, em/i, li. Sufficiente per testi narrativi.
 */
export function htmlToMarkdown(html: string): string {
  let s = html
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, t) => `\n# ${t.trim()}\n`)
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, t) => `\n## ${t.trim()}\n`)
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, t) => `\n### ${t.trim()}\n`)
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `- ${t.trim()}\n`)
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, t) => `${t.trim()}\n\n`)
  s = s.replace(/<[^>]+>/g, '') // tag residui
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
  return s.replace(/\n{3,}/g, '\n\n').trim()
}
