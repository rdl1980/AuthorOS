import type { Project } from '@shared/domain'

/**
 * Assembla i payload testuali per Marketing (Epic 14) e Reader Simulator (Epic 11):
 * panoramica del libro (capitoli con sinossi, cast) ed estratto del manoscritto.
 * I testi sono tagliati per stare comodi nei prompt.
 */
export async function buildBookOverview(project: Project): Promise<string> {
  const [chapters, scenes, characters] = await Promise.all([
    window.authoros.manuscript.chapters(project.id),
    window.authoros.manuscript.scenes(project.id),
    window.authoros.characters.list(project.id)
  ])
  const words = scenes.reduce((a, s) => a + s.wordCount, 0)
  const lines: string[] = [
    `TITOLO: ${project.title}`,
    `GENERE: ${project.genre ?? 'non specificato'}`,
    `LUNGHEZZA: ${words.toLocaleString('it-IT')} parole, ${chapters.length} capitoli`
  ]
  if (characters.length) {
    lines.push(
      'PERSONAGGI:',
      ...characters
        .slice(0, 8)
        .map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.summary ? `: ${c.summary}` : ''}`)
    )
  }
  lines.push('CAPITOLI:')
  for (const [i, ch] of chapters.entries()) {
    const syn = scenes
      .filter((s) => s.chapterId === ch.id && s.synopsis)
      .map((s) => s.synopsis)
      .join(' ')
    lines.push(`${i + 1}. ${ch.title}${syn ? ` — ${syn}` : ''}`)
  }
  return lines.join('\n').slice(0, 6000)
}

/** Estratto del manoscritto: dall'inizio (o da un capitolo), max ~7000 caratteri. */
export async function buildExcerpt(project: Project, chapterId?: string): Promise<string> {
  const scenes = await window.authoros.manuscript.scenes(project.id)
  const chosen = chapterId ? scenes.filter((s) => s.chapterId === chapterId) : scenes
  const text = chosen
    .map((s) => s.content)
    .filter(Boolean)
    .join('\n\n* * *\n\n')
  return text.slice(0, 7000)
}
