import { useState } from 'react'
import type { AssistKind } from '@shared/ai'
import { useLibrary } from '../../store/useLibrary'
import { buildBookOverview } from '../../lib/bookPayload'

interface Tool {
  kind: AssistKind
  icon: string
  title: string
  desc: string
  us: string
}

const TOOLS: Tool[] = [
  {
    kind: 'marketing-synopsis',
    icon: '📃',
    title: 'Sinossi',
    desc: 'Sinossi editoriale completa (300-500 parole, finale incluso) per editor e agenti.',
    us: 'US-14.1'
  },
  {
    kind: 'marketing-blurb',
    icon: '📕',
    title: 'Quarta di copertina',
    desc: 'Testo da retro copertina: aggancio, conflitto, nessuno spoiler.',
    us: 'US-14.2'
  },
  {
    kind: 'marketing-pitch',
    icon: '🎯',
    title: 'Pitch',
    desc: 'Elevator pitch, "X incontra Y" e versione social: il libro in pochi secondi.',
    us: 'US-14.4'
  }
]

/**
 * Marketing & Lancio (Epic 14): genera i materiali promozionali dalla
 * panoramica reale del libro (capitoli, sinossi delle scene, cast).
 * Come sempre: l'AI propone, l'autore copia/rielabora.
 */
export function MarketingView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const [busy, setBusy] = useState<AssistKind | null>(null)
  const [results, setResults] = useState<Partial<Record<AssistKind, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<AssistKind | null>(null)

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">📣</div>
        <h2 className="text-2xl font-semibold">Marketing & Lancio</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per generare sinossi, quarta e pitch.
        </p>
      </div>
    )
  }

  const run = async (kind: AssistKind): Promise<void> => {
    setBusy(kind)
    setError(null)
    try {
      const overview = await buildBookOverview(project)
      const res = await window.authoros.ai.assist(kind, overview)
      setResults((r) => ({ ...r, [kind]: res.text }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const copy = async (kind: AssistKind): Promise<void> => {
    const text = results[kind]
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">📣 Marketing & Lancio — {project.title}</h2>
      <p className="mt-1 text-sm text-muted">
        I materiali sono generati dalla panoramica reale del libro: più sinossi scrivi nelle scene
        (bacheca), migliore sarà il risultato.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-xs text-yellow">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {TOOLS.map((t) => (
          <section key={t.kind} className="rounded-2xl border border-line bg-panel/40 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-xs text-muted">{t.desc}</p>
              </div>
              <div className="ml-auto flex gap-2">
                {results[t.kind] && (
                  <button
                    className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-cyan"
                    onClick={() => copy(t.kind)}
                  >
                    {copied === t.kind ? '✓ Copiato' : '📋 Copia'}
                  </button>
                )}
                <button
                  className="rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => run(t.kind)}
                >
                  {busy === t.kind ? 'Genero…' : results[t.kind] ? '↻ Rigenera' : '✨ Genera'}
                </button>
              </div>
            </div>
            {results[t.kind] && (
              <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-bg/40 p-3 font-sans text-sm leading-relaxed">
                {results[t.kind]}
              </pre>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
