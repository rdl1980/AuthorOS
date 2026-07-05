import { useState } from 'react'
import type { Blueprint } from '@shared/copilot'
import { parseArc, parseBlueprint } from '@shared/copilot'
import { GENRES } from '@shared/frameworks'
import { useLibrary } from '../../store/useLibrary'
import { useNav } from '../../store/useNav'

type Step = 'idea' | 'review' | 'done'

/**
 * Author Copilot (Epic 20): dall'idea alla mappa del romanzo in 3 passi.
 * 1) l'autore descrive l'idea → 2) l'AI propone titolo, struttura, capitoli e
 * cast (tutto modificabile) → 3) un click crea il progetto completo: capitoli,
 * scene con sinossi, personaggi, beat del framework già collegati.
 * L'AI propone, l'autore decide: nulla viene creato senza conferma.
 */
export function CopilotView(): JSX.Element {
  const setActive = useLibrary((s) => s.setActive)
  const goTo = useNav((s) => s.goTo)

  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [genre, setGenre] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [raw, setRaw] = useState('')
  const [bp, setBp] = useState<Blueprint | null>(null)
  const [withArcs, setWithArcs] = useState(true)

  const generate = async (): Promise<void> => {
    if (!idea.trim()) return
    setBusy(true)
    setError(null)
    try {
      const payload = genre ? `Genere desiderato: ${genre}\n\nIdea: ${idea.trim()}` : idea.trim()
      const res = await window.authoros.ai.assist('copilot-blueprint', payload)
      setRaw(res.text)
      const parsed = parseBlueprint(res.text)
      if (!parsed) {
        setError('La risposta dell\'AI non è nel formato atteso. Riprova (o modifica l\'idea).')
      } else {
        setBp(parsed)
        setStep('review')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const createProject = async (): Promise<void> => {
    if (!bp) return
    setBusy(true)
    setError(null)
    try {
      setProgress('Creo progetto, capitoli e personaggi…')
      const project = await window.authoros.copilot.create(bp)

      if (withArcs) {
        // US-20.4: archi per i personaggi principali (max 3 per contenere i costi)
        const chars = await window.authoros.characters.list(project.id)
        const main = chars.slice(0, 3)
        for (const [i, c] of main.entries()) {
          setProgress(`Genero l'arco di ${c.name} (${i + 1}/${main.length})…`)
          try {
            const res = await window.authoros.ai.assist(
              'copilot-arc',
              `Storia: ${bp.logline}\nPersonaggio: ${c.name} — ${c.role}. ${c.summary}`
            )
            const arc = parseArc(res.text)
            if (arc) await window.authoros.characters.arcUpdate(c.id, arc)
          } catch {
            // un arco fallito non blocca la creazione del progetto
          }
        }
      }

      setActive(project)
      setStep('done')
      setProgress('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const patchChapter = (i: number, field: 'title' | 'synopsis', value: string): void => {
    if (!bp) return
    const chapters = bp.chapters.map((c, j) => (j === i ? { ...c, [field]: value } : c))
    setBp({ ...bp, chapters })
  }

  const removeChapter = (i: number): void => {
    if (!bp) return
    setBp({ ...bp, chapters: bp.chapters.filter((_, j) => j !== i) })
  }

  const removeCharacter = (i: number): void => {
    if (!bp) return
    setBp({ ...bp, characters: bp.characters.filter((_, j) => j !== i) })
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">🤖 Author Copilot</h2>
        <p className="text-sm text-muted">
          Dall&apos;idea alla mappa del romanzo: struttura, capitoli, personaggi e beat. Tu decidi,
          l&apos;AI prepara il terreno.
        </p>
      </div>

      {step === 'idea' && (
        <div className="space-y-3 rounded-2xl border border-line bg-panel/40 p-4">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">La tua idea (più dettagli dai, meglio è)</span>
            <textarea
              className="h-36 w-full resize-none rounded-xl border border-line bg-bg/60 p-3 text-sm outline-none focus:border-cyan"
              placeholder="Es. Una restauratrice scopre che il quadro su cui lavora nasconde una lettera che riscrive la storia della sua famiglia…"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-3">
            <select
              className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="">Genere: lascia decidere all&apos;AI</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <button
              className="ml-auto rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
              disabled={!idea.trim() || busy}
              onClick={generate}
            >
              {busy ? 'Genero la mappa…' : '✨ Genera la mappa del romanzo'}
            </button>
          </div>
          {error && (
            <div className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-xs text-yellow">
              {error}
              {raw && (
                <details className="mt-1 text-muted">
                  <summary>Risposta grezza</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{raw}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'review' && bp && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-line bg-panel/40 p-4">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Titolo proposto</span>
              <input
                className="w-full rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
                value={bp.title}
                onChange={(e) => setBp({ ...bp, title: e.target.value })}
              />
            </label>
            <p className="mt-2 text-sm text-muted">
              <span className="text-ink">{bp.genre}</span>
              {bp.framework ? <> · framework <span className="text-cyan">{bp.framework}</span></> : null}
            </p>
            {bp.logline && <p className="mt-1 text-sm italic text-muted">«{bp.logline}»</p>}
          </div>

          <div className="rounded-2xl border border-line bg-panel/40 p-4">
            <h3 className="mb-2 text-sm font-semibold">📖 Capitoli ({bp.chapters.length})</h3>
            <div className="space-y-2">
              {bp.chapters.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-6 shrink-0 text-right text-xs text-muted">{i + 1}.</span>
                  <div className="flex-1 space-y-1">
                    <input
                      className="w-full rounded-md border border-line bg-bg/60 px-2 py-1 text-sm outline-none focus:border-cyan"
                      value={c.title}
                      onChange={(e) => patchChapter(i, 'title', e.target.value)}
                    />
                    <input
                      className="w-full rounded-md border border-transparent bg-bg/30 px-2 py-1 text-xs text-muted outline-none focus:border-cyan"
                      value={c.synopsis}
                      placeholder="Sinossi…"
                      onChange={(e) => patchChapter(i, 'synopsis', e.target.value)}
                    />
                  </div>
                  <button
                    className="mt-2 text-xs text-muted hover:text-ink"
                    title="Rimuovi capitolo"
                    onClick={() => removeChapter(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel/40 p-4">
            <h3 className="mb-2 text-sm font-semibold">🎭 Personaggi ({bp.characters.length})</h3>
            <ul className="space-y-1 text-sm">
              {bp.characters.map((c, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-violet">{c.role}</span>
                  <span className="flex-1 truncate text-xs text-muted">{c.summary}</span>
                  <button
                    className="text-xs text-muted hover:text-ink"
                    title="Rimuovi personaggio"
                    onClick={() => removeCharacter(i)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={withArcs}
                onChange={(e) => setWithArcs(e.target.checked)}
              />
              Genera anche gli archi di trasformazione dei primi 3 personaggi (US-20.4)
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-xs text-yellow">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pb-4">
            <button
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-cyan"
              disabled={busy}
              onClick={() => setStep('idea')}
            >
              ← Modifica l&apos;idea
            </button>
            <button
              className="ml-auto rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
              disabled={busy || !bp.title.trim() || bp.chapters.length === 0}
              onClick={createProject}
            >
              {busy ? progress || 'Creo il progetto…' : '🚀 Crea il progetto'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-4xl">🎉</div>
          <h3 className="text-lg font-semibold">Progetto creato!</h3>
          <p className="max-w-md text-sm text-muted">
            Capitoli, scene con sinossi, personaggi e beat sono pronti. Ora tocca a te: la storia
            la scrivi tu.
          </p>
          <div className="flex gap-3">
            <button
              className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
              onClick={() => goTo('writing')}
            >
              ✍️ Vai al Workspace
            </button>
            <button
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-cyan"
              onClick={() => goTo('structure')}
            >
              🧭 Vedi la struttura
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
