import { useEffect, useState } from 'react'
import type { AIOperation, AIResult, AIStatus } from '@shared/ai'
import type { StyleProfile } from '@shared/domain'
import { AiInteractionShell } from '../../components/AiInteractionShell'
import { useUsageMeter } from '../../store/useUsageMeter'
import { useLibrary } from '../../store/useLibrary'

const OPERATIONS: { value: AIOperation; label: string }[] = [
  { value: 'scene', label: 'Genera scena' },
  { value: 'dialogue', label: 'Genera dialogo' },
  { value: 'description', label: 'Genera descrizione' },
  { value: 'expand', label: 'Espandi bozza' },
  { value: 'rewrite', label: 'Riscrivi' },
  { value: 'tone', label: 'Cambia tono' }
]

/**
 * Modulo AI Assistant (Epic 3) — flusso end-to-end: prompt → AI Gateway (mock o reale)
 * via IPC, con la voce dell'autore (profilo attivo) → AI Interaction Shell → usage meter.
 */
export function AiAssistantView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)

  const [operation, setOperation] = useState<AIOperation>('scene')
  const [prompt, setPrompt] = useState('')
  const [activeStyle, setActiveStyle] = useState<StyleProfile | null>(null)
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [result, setResult] = useState<AIResult | null>(null)
  const [accepted, setAccepted] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.authoros.ai.status().then(setStatus)
  }, [])

  useEffect(() => {
    if (project) void window.authoros.style.active(project.id).then(setActiveStyle)
    else setActiveStyle(null)
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async (): Promise<void> => {
    if (!prompt.trim()) return
    setBusy(true)
    setAccepted(null)
    try {
      const styleProfile = activeStyle
        ? `${activeStyle.tone}\n${activeStyle.instructions}`.trim()
        : undefined
      const res = await window.authoros.ai.generate({ operation, prompt, styleProfile })
      setResult(res)
      track(res.usage)
    } catch (e) {
      setResult({
        text: `Errore durante la generazione: ${e instanceof Error ? e.message : String(e)}`,
        provider: status?.provider ?? '—',
        model: status?.model ?? '—',
        usage: { promptTokens: 0, completionTokens: 0, credits: 0 }
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">AI Assistant</h2>
      <p className="mt-1 text-muted">
        L'AI propone, tu decidi. Ogni output passa dal controllo manuale e non sovrascrive mai il
        testo.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {status && (
          <span className={`rounded-full px-2 py-0.5 ${status.mode === 'live' ? 'bg-green/15 text-green' : 'bg-yellow/15 text-yellow'}`}>
            {status.mode === 'live' ? 'AI reale' : 'mock'} · {status.provider} · {status.model}
          </span>
        )}
        {activeStyle && (
          <span className="rounded-full bg-violet/15 px-2 py-0.5 text-violet">
            voce: {activeStyle.name}
          </span>
        )}
      </div>

      <div className="mt-4">
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
