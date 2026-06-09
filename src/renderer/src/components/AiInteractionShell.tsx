import { useEffect, useState } from 'react'

interface Props {
  /** Testo proposto dall'AI. */
  draft: string
  /** L'autore accetta il testo (eventualmente modificato). Mai applicato in automatico. */
  onAccept: (finalText: string) => void
  /** L'autore rifiuta la proposta. */
  onReject: () => void
}

/**
 * AI Interaction Shell — componente trasversale che incarna il principio cardine:
 * l'output AI non sovrascrive MAI il testo automaticamente. L'autore può sempre
 * Accettare, Modificare o Rifiutare (US-3.9 / Definition of Done).
 */
export function AiInteractionShell({ draft, onAccept, onReject }: Props): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(draft)

  useEffect(() => {
    setValue(draft)
    setEditing(false)
  }, [draft])

  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan">
        Proposta AI · controllo dell'autore
      </div>

      {editing ? (
        <textarea
          className="h-40 w-full resize-y rounded-lg border border-line bg-bg/60 p-3 text-sm text-ink outline-none focus:border-cyan"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-ink/90">{value}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-green/90 px-3 py-1.5 text-sm font-semibold text-bg hover:bg-green"
          onClick={() => onAccept(value)}
        >
          Accetta
        </button>
        <button
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:border-cyan"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? 'Anteprima' : 'Modifica'}
        </button>
        <button
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-yellow hover:text-yellow"
          onClick={onReject}
        >
          Rifiuta
        </button>
      </div>
    </div>
  )
}
