import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useLibrary } from '../../store/useLibrary'
import { useUsageMeter } from '../../store/useUsageMeter'

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
}

/** Cronologie chat per progetto (in memoria per la sessione). */
interface ChatStore {
  byProject: Record<string, ChatMsg[]>
  append: (projectId: string, msg: ChatMsg) => void
  clear: (projectId: string) => void
}

const useChatStore = create<ChatStore>((set) => ({
  byProject: {},
  append: (projectId, msg) =>
    set((s) => ({
      byProject: { ...s.byProject, [projectId]: [...(s.byProject[projectId] ?? []), msg] }
    })),
  clear: (projectId) => set((s) => ({ byProject: { ...s.byProject, [projectId]: [] } }))
}))

/** Chat di progetto (US-29.6): l'assistente conosce struttura, cast e mondo del libro. */
export function ChatView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)
  const { byProject, append, clear } = useChatStore()

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = project ? (byProject[project.id] ?? []) : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, busy])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">💬</div>
        <h2 className="text-2xl font-semibold">Chat di progetto</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per ragionare sul tuo libro con l'AI.
        </p>
      </div>
    )
  }

  const send = async (): Promise<void> => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    append(project.id, { role: 'user', text })
    setBusy(true)
    try {
      const history = [...(byProject[project.id] ?? []), { role: 'user' as const, text }]
      const res = await window.authoros.ai.chat(project.id, history)
      track(res.usage)
      append(project.id, { role: 'assistant', text: res.text })
    } catch (e) {
      append(project.id, {
        role: 'assistant',
        text: `⚠ Errore: ${e instanceof Error ? e.message : String(e)}`
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full max-w-3xl flex-col">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">Chat — {project.title}</h2>
        {messages.length > 0 && (
          <button
            className="ml-auto rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-red hover:text-red"
            onClick={() => clear(project.id)}
          >
            Svuota
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        L'assistente conosce capitoli, scene, personaggi, mondo e framework del progetto.
      </p>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-panel/40 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Esempi: «Dove potrei inserire un colpo di scena?» · «Il movente di Elia regge?» ·
            «Riassumimi cosa succede nel Capitolo 2».
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
              m.role === 'user'
                ? 'ml-auto bg-cyan/15 text-ink'
                : 'mr-auto border border-line bg-bg/40 text-ink/90'
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && <div className="mr-auto animate-pulse rounded-2xl border border-line bg-bg/40 px-4 py-2 text-sm text-muted">…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
          placeholder="Chiedi qualcosa sul tuo libro…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
          onClick={send}
          disabled={busy || !input.trim()}
        >
          Invia
        </button>
      </div>
    </div>
  )
}
