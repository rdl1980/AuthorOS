import { useEffect, useState } from 'react'
import type { Scene } from '@shared/domain'
import { countWords } from '@shared/text'
import { MarkdownPreview } from '../../../components/MarkdownPreview'

interface Props {
  scene: Scene
  onChange: (patch: { title?: string; content?: string }) => void
  saving: boolean
}

/** Editor Markdown della scena (US-2.1, 2.4, 2.5). */
export function SceneEditor({ scene, onChange, saving }: Props): JSX.Element {
  const [title, setTitle] = useState(scene.title)
  const [content, setContent] = useState(scene.content)
  const [preview, setPreview] = useState(false)

  // Reset dello stato locale quando si seleziona un'altra scena.
  useEffect(() => {
    setTitle(scene.title)
    setContent(scene.content)
  }, [scene.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const words = countWords(content)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-lg bg-transparent px-2 py-1 text-xl font-semibold outline-none hover:bg-white/5 focus:bg-white/10"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            onChange({ title: e.target.value })
          }}
        />
        <button
          className="rounded-md border border-line px-2 py-1 text-xs hover:border-cyan"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Modifica' : 'Anteprima'}
        </button>
      </div>

      <div className="mb-2 flex items-center gap-3 text-xs text-muted">
        <span>{words} parole</span>
        <span>·</span>
        <span>{saving ? 'Salvataggio…' : 'Salvato'}</span>
        <span className="ml-auto">Markdown</span>
      </div>

      {preview ? (
        <div className="flex-1 overflow-y-auto rounded-lg border border-line bg-bg/40 p-4">
          <MarkdownPreview markdown={content} />
        </div>
      ) : (
        <textarea
          className="flex-1 resize-none rounded-lg border border-line bg-bg/40 p-4 font-mono text-sm leading-relaxed outline-none focus:border-cyan"
          placeholder="Scrivi qui la tua scena, in Markdown…"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            onChange({ content: e.target.value })
          }}
        />
      )}
    </div>
  )
}
