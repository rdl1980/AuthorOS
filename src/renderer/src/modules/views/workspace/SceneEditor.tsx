import { useEffect, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import type { Scene } from '@shared/domain'
import { countWords } from '@shared/text'

interface Props {
  scene: Scene
  onChange: (patch: { title?: string; content?: string }) => void
  saving: boolean
}

interface ToolButton {
  label: string
  title: string
  isActive: (e: Editor) => boolean
  run: (e: Editor) => void
}

const TOOLS: ToolButton[] = [
  {
    label: 'G',
    title: 'Grassetto (Ctrl+B)',
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run()
  },
  {
    label: 'C',
    title: 'Corsivo (Ctrl+I)',
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run()
  },
  {
    label: 'T1',
    title: 'Titolo',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    label: 'T2',
    title: 'Sottotitolo',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    label: '•',
    title: 'Elenco puntato',
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run()
  },
  {
    label: '"',
    title: 'Citazione',
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run()
  }
]

/**
 * Editor della scena (US-2.1/2.4/2.5): scrittura WYSIWYG con TipTap.
 * Il contenuto resta Markdown nel database (tiptap-markdown), così export,
 * import, word count e AI Editor continuano a lavorare sullo stesso formato.
 */
/** Bozza di emergenza per il crash recovery (US-30.4). */
interface PendingDraft {
  content: string
  ts: number
}

const draftKey = (sceneId: string): string => `authoros:draft:${sceneId}`

export function SceneEditor({ scene, onChange, saving }: Props): JSX.Element {
  const [title, setTitle] = useState(scene.title)
  const [words, setWords] = useState(() => countWords(scene.content))
  const [recovered, setRecovered] = useState<PendingDraft | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Scrivi qui la tua scena…' }),
      Markdown.configure({ html: false, transformPastedText: true })
    ],
    content: scene.content,
    onUpdate: ({ editor: e }) => {
      const md = (e.storage.markdown as { getMarkdown: () => string }).getMarkdown()
      setWords(countWords(md))
      // US-30.4: bozza di emergenza scritta subito (il salvataggio vero è debounced).
      try {
        localStorage.setItem(draftKey(scene.id), JSON.stringify({ content: md, ts: Date.now() }))
      } catch {
        // storage pieno/non disponibile: il salvataggio normale resta attivo
      }
      onChange({ content: md })
    }
  })

  // Cambio scena: ricarica titolo e contenuto (senza emettere onUpdate).
  useEffect(() => {
    setTitle(scene.title)
    setWords(countWords(scene.content))
    if (editor && !editor.isDestroyed) editor.commands.setContent(scene.content)
    // US-30.4: se esiste una bozza più recente dell'ultimo salvataggio (crash),
    // proponi il recupero invece di applicarla in silenzio.
    setRecovered(null)
    try {
      const raw = localStorage.getItem(draftKey(scene.id))
      if (raw) {
        const draft = JSON.parse(raw) as PendingDraft
        if (draft.content !== scene.content && draft.ts > Date.parse(scene.updatedAt) + 2000) {
          setRecovered(draft)
        } else {
          localStorage.removeItem(draftKey(scene.id))
        }
      }
    } catch {
      // bozza corrotta: ignorata
    }
  }, [scene.id, editor]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyRecovered = (): void => {
    if (!recovered || !editor) return
    editor.commands.setContent(recovered.content)
    setWords(countWords(recovered.content))
    onChange({ content: recovered.content })
    setRecovered(null)
  }
  const discardRecovered = (): void => {
    localStorage.removeItem(draftKey(scene.id))
    setRecovered(null)
  }

  return (
    <div className="flex h-full flex-col">
      {recovered && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-yellow/50 bg-yellow/10 px-3 py-2 text-sm">
          <span className="text-yellow">
            ⚠ Trovata una bozza non salvata più recente ({new Date(recovered.ts).toLocaleTimeString('it-IT')}).
          </span>
          <button
            className="ml-auto rounded-md bg-yellow px-2 py-1 text-xs font-semibold text-bg hover:opacity-90"
            onClick={applyRecovered}
          >
            Ripristina
          </button>
          <button className="rounded-md border border-line px-2 py-1 text-xs text-muted" onClick={discardRecovered}>
            Ignora
          </button>
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <input
          className="flex-1 rounded-lg bg-transparent px-2 py-1 text-xl font-semibold outline-none hover:bg-white/5 focus:bg-white/10"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            onChange({ title: e.target.value })
          }}
        />
      </div>

      <div className="mb-2 flex items-center gap-1">
        {editor &&
          TOOLS.map((t) => (
            <button
              key={t.title}
              title={t.title}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => t.run(editor)}
              className={`min-w-[30px] rounded-md border px-2 py-1 text-xs font-semibold ${
                t.isActive(editor)
                  ? 'border-cyan bg-cyan/15 text-cyan'
                  : 'border-line text-muted hover:border-cyan hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span>{words} parole</span>
          <span>·</span>
          <span>{saving ? 'Salvataggio…' : 'Salvato'}</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-line bg-bg/40 p-4 focus-within:border-cyan">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}
