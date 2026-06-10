import { useState } from 'react'
import type { Note } from '@shared/domain'

interface Props {
  scopeLabel: string
  notes: Note[]
  onAdd: (content: string) => void
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
}

/** Pannello note collegate a scena/capitolo (US-2.6). */
export function NotesPanel({ scopeLabel, notes, onAdd, onUpdate, onDelete }: Props): JSX.Element {
  const [draft, setDraft] = useState('')

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Note · {scopeLabel}
      </div>

      <div className="mb-2">
        <textarea
          className="h-20 w-full resize-none rounded-lg border border-line bg-bg/40 p-2 text-sm outline-none focus:border-cyan"
          placeholder="Aggiungi una nota…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="mt-1 w-full rounded-md bg-cyan/90 px-2 py-1 text-xs font-semibold text-bg hover:bg-cyan disabled:opacity-50"
          onClick={() => {
            if (!draft.trim()) return
            onAdd(draft.trim())
            setDraft('')
          }}
          disabled={!draft.trim()}
        >
          Aggiungi nota
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {notes.length === 0 && <p className="text-xs text-muted">Nessuna nota.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-line bg-panel/60 p-2">
            <textarea
              className="w-full resize-none rounded bg-transparent text-sm outline-none focus:bg-white/5"
              rows={Math.min(6, Math.max(2, n.content.split('\n').length))}
              defaultValue={n.content}
              onBlur={(e) => e.target.value !== n.content && onUpdate(n.id, e.target.value)}
            />
            <button
              className="mt-1 text-[11px] text-muted hover:text-red"
              onClick={() => onDelete(n.id)}
            >
              Elimina
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
