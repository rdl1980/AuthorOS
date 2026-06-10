import { useMemo } from 'react'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

/** Anteprima del contenuto Markdown della scena (US-2.4). */
export function MarkdownPreview({ markdown }: { markdown: string }): JSX.Element {
  const html = useMemo(() => marked.parse(markdown || '*Niente da mostrare.*') as string, [markdown])
  return (
    <div
      className="prose-authoros max-w-none text-sm leading-relaxed text-ink/90"
      // marked produce HTML dal Markdown locale dell'autore (nessuna fonte esterna).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
