import { useState } from 'react'
import type { AIOperation, AIResult } from '@shared/ai'
import { AiInteractionShell } from '../../components/AiInteractionShell'
import { useUsageMeter } from '../../store/useUsageMeter'

const OPERATIONS: { value: AIOperation; label: string }[] = [
  { value: 'scene', label: 'Genera scena' },
  { value: 'dialogue', label: 'Genera dialogo' },
  { value: 'description', label: 'Genera descrizione' },
  { value: 'expand', label: 'Espandi bozza' },
  { value: 'rewrite', label: 'Riscrivi' },
  { value: 'tone', label: 'Cambia tono' }
]

/**
 * Modulo AI Assistant (Epic 3) — dimostra il flusso completo end-to-end:
 * prompt → AI Gateway (mock) via IPC → AI Interaction Shell (accept/edit/reject) → usage meter.
 */
export function AiAssistantView(): JSX.Element {
  const [operation, setOperation] = useState<AIOperation>('scene')
  const [prompt, setPrompt] = useState('')
  const [styleProfile, setStyleProfile] = useState('')
  const [result, setResult] = useState<AIResult | null>(null)
  const [accepted, setAccepted] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const track = useUsageMeter((s) => s.track)

  const generate = async (): Promise<void> => {
    if (!prompt.trim()) return
    setBusy(true)
    setAccepted(null)
    try {
      const res = await window.authoros.ai.generate({
        operation,
        prompt,
        styleProfile: styleProfile.trim() || undefined
      })
      setResult(res)
      track(res.usage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">AI Assistant</h2>
      <p className="mt-1 text-muted">
        L'AI propone, tu decidi. Ogni output passa dal controllo manuale e non sovrascrive mai il testo.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
          value={operation}
          onChange={(e) => setOperation(e.target.value as AIOperation)}
        >
          {OPERATIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
          placeholder="Profilo di stile (Author Voice, opz.)"
          value={styleProfile}
          onChange={(e) => setStyleProfile(e.target.value)}
        />
      </div>

      <textarea
        className="mt-3 h-28 w-full resize-y rounded-lg border border-line bg-bg/60 p-3 text-sm outline-none focus:border-cyan"
        placeholder="Descrivi cosa vuoi generare…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        className="mt-3 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
        onClick={generate}
        disabled={busy || !prompt.trim()}
      >
        {busy ? 'Genero…' : 'Genera con AI'}
      </button>

      {result && accepted === null && (
        <div className="mt-5">
          <AiInteractionShell
            draft={result.text}
            onAccept={(finalText) => setAccepted(finalText)}
            onReject={() => setResult(null)}
          />
          <p className="mt-2 text-xs text-muted">
            Provider: {result.provider} · modello: {result.model} · ~{result.usage.credits} crediti
          </p>
        </div>
      )}

      {accepted !== null && (
        <div className="mt-5 rounded-2xl border border-green/40 bg-green/5 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-green">
            Testo accettato dall'autore
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink/90">{accepted}</p>
        </div>
      )}
    </div>
  )
}
