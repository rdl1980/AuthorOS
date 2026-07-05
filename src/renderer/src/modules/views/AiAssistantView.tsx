import { useEffect, useRef, useState } from 'react'
import { costUsd, type AIOperation, type AIResult, type AIStatus } from '@shared/ai'
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
 * AI Assistant (Epic 3 + Epic 29): streaming (US-29.2), varianti confrontabili
 * (US-29.4, realizza US-3.7), contesto automatico dal progetto (US-29.1) e
 * stima dei costi prima dell'invio (US-29.7).
 */
export function AiAssistantView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)

  const [operation, setOperation] = useState<AIOperation>('scene')
  const [prompt, setPrompt] = useState('')
  const [variantCount, setVariantCount] = useState(1)
  const [activeStyle, setActiveStyle] = useState<StyleProfile | null>(null)
  const [status, setStatus] = useState<AIStatus | null>(null)

  const [streamText, setStreamText] = useState('')
  const [result, setResult] = useState<AIResult | null>(null)
  const [variants, setVariants] = useState<AIResult[] | null>(null)
  const [accepted, setAccepted] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    void window.authoros.ai.status().then(setStatus)
  }, [])

  useEffect(() => {
    if (project) void window.authoros.style.active(project.id).then(setActiveStyle)
    else setActiveStyle(null)
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (): void => {
    setResult(null)
    setVariants(null)
    setAccepted(null)
    setStreamText('')
  }

  const baseRequest = () => ({
    operation,
    prompt,
    styleProfile: activeStyle ? `${activeStyle.tone}\n${activeStyle.instructions}`.trim() : undefined,
    projectId: project?.id
  })

  const generate = async (): Promise<void> => {
    if (!prompt.trim()) return
    setBusy(true)
    reset()
    try {
      if (variantCount <= 1) {
        // Streaming (US-29.2)
        const { result: promise, abort } = window.authoros.ai.generateStream(baseRequest(), (t) =>
          setStreamText((s) => s + t)
        )
        abortRef.current = abort
        const res = await promise
        setResult(res)
        track(res.usage)
      } else {
        // Varianti in parallelo (US-29.4)
        const outs = await Promise.all(
          Array.from({ length: variantCount }, () => window.authoros.ai.generate(baseRequest()))
        )
        outs.forEach((r) => track(r.usage))
        setVariants(outs)
      }
    } catch (e) {
      setResult({
        text: `Errore durante la generazione: ${e instanceof Error ? e.message : String(e)}`,
        provider: status?.provider ?? '—',
        model: status?.model ?? '—',
        usage: { promptTokens: 0, completionTokens: 0, credits: 0 }
      })
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }

  // US-29.7: stima prudente prima dell'invio (input prompt+contesto, output medio).
  const estimate =
    status?.mode === 'live'
      ? costUsd(status.model, Math.ceil(prompt.length / 4) + 1500, 800) * variantCount
      : 0

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">AI Assistant</h2>
      <p className="mt-1 text-muted">
        L'AI propone, tu decidi. Con un progetto aperto, ogni generazione conosce scena, personaggi,
        mondo e voce.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {status && (
          <span className={`rounded-full px-2 py-0.5 ${status.mode === 'live' ? 'bg-green/15 text-green' : 'bg-yellow/15 text-yellow'}`}>
            {status.mode === 'live' ? 'AI reale' : 'mock'} · {status.provider} · {status.model}
          </span>
        )}
        {activeStyle && (
          <span className="rounded-full bg-violet/15 px-2 py-0.5 text-violet">voce: {activeStyle.name}</span>
        )}
        {project && (
          <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-cyan">contesto: {project.title}</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
        <select
          className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
          value={variantCount}
          onChange={(e) => setVariantCount(Number(e.target.value))}
          title="Varianti confrontabili (US-29.4)"
        >
          <option value={1}>1 versione</option>
          <option value={2}>2 varianti</option>
          <option value={3}>3 varianti</option>
        </select>
      </div>

      <textarea
        className="mt-3 h-28 w-full resize-y rounded-lg border border-line bg-bg/60 p-3 text-sm outline-none focus:border-cyan"
        placeholder="Descrivi cosa vuoi generare…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="mt-3 flex items-center gap-3">
        {!busy ? (
          <button
            className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
            onClick={generate}
            disabled={!prompt.trim()}
          >
            Genera con AI
          </button>
        ) : (
          <button
            className="rounded-lg border border-yellow px-4 py-2 text-sm text-yellow"
            onClick={() => abortRef.current?.()}
          >
            ⏹ Ferma
          </button>
        )}
        {estimate > 0 && (
          <span className="text-xs text-muted" title="Stima prudente: prompt + contesto + output medio">
            stima ≈ ${estimate.toFixed(4)}
          </span>
        )}
      </div>

      {/* Streaming live */}
      {busy && variantCount <= 1 && streamText && (
        <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-cyan/40 bg-cyan/5 p-4 text-sm text-ink/90">
          {streamText}
          <span className="animate-pulse text-cyan">▌</span>
        </p>
      )}

      {/* Risultato singolo → shell accetta/modifica/rifiuta */}
      {result && accepted === null && !variants && (
        <div className="mt-5">
          <AiInteractionShell
            draft={result.text}
            onAccept={(finalText) => setAccepted(finalText)}
            onReject={reset}
          />
          <p className="mt-2 text-xs text-muted">
            {result.provider} · {result.model} · ~{result.usage.credits} crediti
            {result.costUsd ? ` · $${result.costUsd.toFixed(4)}` : ''}
          </p>
        </div>
      )}

      {/* Varianti fianco a fianco (US-29.4) */}
      {variants && accepted === null && (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {variants.map((v, i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-line bg-panel/60 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet">
                Variante {i + 1}
              </div>
              <p className="max-h-64 flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-ink/90">
                {v.text}
              </p>
              <button
                className="mt-2 rounded-md bg-green/90 px-2 py-1 text-xs font-semibold text-bg hover:bg-green"
                onClick={() => setAccepted(v.text)}
              >
                Usa questa
              </button>
            </div>
          ))}
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
