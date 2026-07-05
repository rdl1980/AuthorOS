import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import type { Scene, SceneStatus } from '@shared/domain'
import { countWords } from '@shared/text'
import { useWorkspace } from '../../../store/useWorkspace'
import { usePrefs, EDITOR_FONTS, EDITOR_WIDTHS } from '../../../store/usePrefs'
import { useUsageMeter } from '../../../store/useUsageMeter'

/** Pannello AI inline: riscrittura della selezione (US-29.3) o continua (US-29.5). */
interface AiPanel {
  mode: 'rewrite' | 'continue'
  from: number
  to: number
  instruction: string
  text: string
  running: boolean
}

interface Props {
  scene: Scene
  onChange: (patch: { title?: string; content?: string; status?: SceneStatus }) => void
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

const STATUS_META: Record<SceneStatus, { label: string; dot: string }> = {
  draft: { label: 'Bozza', dot: 'bg-muted' },
  revision: { label: 'Revisione', dot: 'bg-yellow' },
  final: { label: 'Finale', dot: 'bg-green' }
}

/** Bozza di emergenza per il crash recovery (US-30.4). */
interface PendingDraft {
  content: string
  ts: number
}

const draftKey = (sceneId: string): string => `authoros:draft:${sceneId}`

/**
 * Editor della scena: WYSIWYG TipTap con Markdown come formato di salvataggio.
 * Epic 26: stato scena (US-26.2), annotazioni non stampabili (US-26.5),
 * typewriter mode (US-26.3), preferenze editor (US-26.6).
 */
export function SceneEditor({ scene, onChange, saving }: Props): JSX.Element {
  const [title, setTitle] = useState(scene.title)
  const [words, setWords] = useState(() => countWords(scene.content))
  const [recovered, setRecovered] = useState<PendingDraft | null>(null)
  const prefs = usePrefs()

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

  // US-26.3: typewriter mode — la riga del cursore resta centrata.
  useEffect(() => {
    if (!editor) return
    const center = (): void => {
      if (!useWorkspace.getState().typewriter) return
      try {
        const pos = editor.state.selection.head
        const dom = editor.view.domAtPos(pos).node
        const el = dom instanceof Element ? dom : dom.parentElement
        el?.scrollIntoView({ block: 'center' })
      } catch {
        // posizioni transitorie durante grosse modifiche: ignora
      }
    }
    editor.on('selectionUpdate', center)
    editor.on('update', center)
    return () => {
      editor.off('selectionUpdate', center)
      editor.off('update', center)
    }
  }, [editor])

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

  // US-26.5: annotazione inline non stampabile {>>testo<<} (esclusa dagli export).
  const insertAnnotation = (): void => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selected = editor.state.doc.textBetween(from, to, ' ')
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, `{>>${selected || 'promemoria'}<<}`)
      .run()
  }

  // --- AI inline (US-29.3 riscrivi selezione, US-29.5 continua) --------------
  const [aiPanel, setAiPanel] = useState<AiPanel | null>(null)
  const abortRef = useRef<(() => void) | null>(null)
  const track = useUsageMeter((s) => s.track)

  const openRewrite = (): void => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    setAiPanel({ mode: 'rewrite', from, to, instruction: '', text: '', running: false })
  }

  const openContinue = (): void => {
    if (!editor) return
    const end = editor.state.doc.content.size
    setAiPanel({ mode: 'continue', from: end, to: end, instruction: '', text: '', running: false })
  }

  const runAi = async (): Promise<void> => {
    if (!aiPanel || !editor) return
    const selected = editor.state.doc.textBetween(aiPanel.from, aiPanel.to, ' ')
    const fullMd = (editor.storage.markdown as { getMarkdown: () => string }).getMarkdown()
    setAiPanel((p) => p && { ...p, text: '', running: true })
    const req =
      aiPanel.mode === 'rewrite'
        ? {
            operation: 'rewrite' as const,
            prompt: `${aiPanel.instruction.trim() ? `Indicazione: ${aiPanel.instruction.trim()}.\n\n` : ''}${selected}`,
            projectId: scene.projectId,
            sceneId: scene.id
          }
        : {
            operation: 'continue' as const,
            prompt: fullMd || '(scena vuota: inizia tu)',
            projectId: scene.projectId,
            sceneId: scene.id
          }
    const { result, abort } = window.authoros.ai.generateStream(req, (chunk) =>
      setAiPanel((p) => p && { ...p, text: p.text + chunk })
    )
    abortRef.current = abort
    try {
      const res = await result
      track(res.usage)
    } catch {
      // interrotto o errore: si tiene il testo parziale già mostrato
    } finally {
      abortRef.current = null
      setAiPanel((p) => p && { ...p, running: false })
    }
  }

  const applyAi = (): void => {
    if (!aiPanel || !editor || !aiPanel.text.trim()) return
    if (aiPanel.mode === 'rewrite') {
      editor.chain().focus().insertContentAt({ from: aiPanel.from, to: aiPanel.to }, aiPanel.text).run()
    } else {
      editor.chain().focus('end').insertContent(`\n\n${aiPanel.text}`).run()
    }
    setAiPanel(null)
  }

  const closeAi = (): void => {
    abortRef.current?.()
    setAiPanel(null)
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
        {/* Stato scena (US-26.2) */}
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[scene.status].dot}`} />
        <select
          className="rounded-lg border border-line bg-bg/60 px-2 py-1 text-xs outline-none focus:border-cyan"
          value={scene.status}
          onChange={(e) => onChange({ status: e.target.value as SceneStatus })}
          title="Stato di lavorazione della scena"
        >
          {(Object.keys(STATUS_META) as SceneStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
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
        <button
          title="Annotazione non stampabile (esclusa dagli export)"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={insertAnnotation}
          className="min-w-[30px] rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-violet hover:text-violet"
        >
          💬
        </button>
        <button
          title="Riscrivi la selezione con l'AI (US-29.3)"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={openRewrite}
          className="min-w-[30px] rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-cyan hover:text-cyan"
        >
          ✨
        </button>
        <button
          title="Continua la scena dal fondo (US-29.5)"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={openContinue}
          className="min-w-[30px] rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-cyan hover:text-cyan"
        >
          ▶
        </button>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span>{words} parole</span>
          <span>·</span>
          <span>{saving ? 'Salvataggio…' : 'Salvato'}</span>
        </span>
      </div>

      {/* Pannello AI inline (US-29.3 / US-29.5) */}
      {aiPanel && (
        <div className="mb-2 rounded-xl border border-cyan/40 bg-cyan/5 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan">
              {aiPanel.mode === 'rewrite' ? '✨ Riscrivi selezione' : '▶ Continua la scena'}
            </span>
            {aiPanel.mode === 'rewrite' && (
              <input
                className="min-w-0 flex-1 rounded-md border border-line bg-bg/60 px-2 py-1 text-xs outline-none focus:border-cyan"
                placeholder="Indicazione (opz.): più teso, più breve, in prima persona…"
                value={aiPanel.instruction}
                onChange={(e) => setAiPanel((p) => p && { ...p, instruction: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && runAi()}
              />
            )}
            {!aiPanel.running ? (
              <button
                className="rounded-md bg-cyan px-2 py-1 text-xs font-semibold text-bg hover:opacity-90"
                onClick={runAi}
              >
                {aiPanel.text ? 'Rigenera' : 'Genera'}
              </button>
            ) : (
              <button
                className="rounded-md border border-line px-2 py-1 text-xs text-yellow"
                onClick={() => abortRef.current?.()}
              >
                ⏹ Ferma
              </button>
            )}
            <button className="rounded-md border border-line px-2 py-1 text-xs text-muted" onClick={closeAi}>
              ✕
            </button>
          </div>
          {(aiPanel.text || aiPanel.running) && (
            <>
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-bg/40 p-2 text-sm text-ink/90">
                {aiPanel.text}
                {aiPanel.running && <span className="animate-pulse text-cyan">▌</span>}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded-md bg-green/90 px-3 py-1 text-xs font-semibold text-bg hover:bg-green disabled:opacity-50"
                  onClick={applyAi}
                  disabled={aiPanel.running || !aiPanel.text.trim()}
                >
                  {aiPanel.mode === 'rewrite' ? 'Applica al testo' : 'Aggiungi alla scena'}
                </button>
                <button className="rounded-md border border-line px-3 py-1 text-xs text-muted" onClick={closeAi}>
                  Scarta
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div
        className={`min-h-0 flex-1 overflow-y-auto rounded-lg border border-line p-4 focus-within:border-cyan ${
          prefs.editorTheme === 'light' ? 'editor-light bg-[#f5f1e8]' : 'bg-bg/40'
        }`}
      >
        <div
          className="mx-auto h-full"
          style={{
            fontFamily: EDITOR_FONTS[prefs.editorFont],
            fontSize: `${prefs.editorSize}px`,
            maxWidth: EDITOR_WIDTHS[prefs.editorWidth]
          }}
        >
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  )
}
