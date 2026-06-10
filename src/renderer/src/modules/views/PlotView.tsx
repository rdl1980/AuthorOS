import { useEffect, useState } from 'react'
import type { AssistKind } from '@shared/ai'
import type { PlotReport } from '@shared/plot'
import { useLibrary } from '../../store/useLibrary'
import { useUsageMeter } from '../../store/useUsageMeter'
import { useNav } from '../../store/useNav'

/** Plot Intelligence (Epic 8): report deterministico + analisi AI del manoscritto. */
export function PlotView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)
  const goTo = useNav((s) => s.goTo)

  const [report, setReport] = useState<PlotReport | null>(null)
  const [busy, setBusy] = useState<AssistKind | null>(null)
  const [aiOutput, setAiOutput] = useState<{ title: string; text: string } | null>(null)

  useEffect(() => {
    setReport(null)
    setAiOutput(null)
    if (project) void window.authoros.plot.analyze(project.id).then(setReport)
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🧩</div>
        <h2 className="text-2xl font-semibold">Plot Intelligence</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per analizzare la solidità della trama.
        </p>
      </div>
    )
  }

  const buildManuscript = async (): Promise<string> => {
    const [chs, scs] = await Promise.all([
      window.authoros.manuscript.chapters(project.id),
      window.authoros.manuscript.scenes(project.id)
    ])
    const parts: string[] = []
    for (const ch of chs) {
      parts.push(`# ${ch.title}`)
      for (const sc of scs.filter((s) => s.chapterId === ch.id)) {
        parts.push(`## ${sc.title}\n${sc.content}`)
      }
    }
    return parts.join('\n\n')
  }

  const runAi = async (kind: 'plot-holes' | 'plot-scene-audit', title: string): Promise<void> => {
    setBusy(kind)
    setAiOutput(null)
    try {
      const manuscript = await buildManuscript()
      if (!manuscript.trim()) {
        setAiOutput({ title, text: 'Il manoscritto è vuoto: non c’è nulla da analizzare.' })
        return
      }
      const res = await window.authoros.ai.assist(kind, manuscript)
      track(res.usage)
      setAiOutput({ title, text: res.text })
    } catch (e) {
      setAiOutput({ title, text: `Errore: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setBusy(null)
    }
  }

  const maxWords = report ? Math.max(1, ...report.chapters.map((c) => c.words)) : 1
  const cleanReport =
    report &&
    report.unusedCharacters.length === 0 &&
    report.emptyScenes.length === 0 &&
    report.shortScenes.length === 0 &&
    report.uncoveredBeats === 0 &&
    report.chapters.every((c) => c.flag === null)

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Plot Intelligence — {project.title}</h2>
      <p className="mt-1 text-muted">Controlli automatici locali e analisi AI dell'intero manoscritto.</p>

      {!report ? (
        <p className="mt-4 text-muted">Analizzo…</p>
      ) : (
        <div className="mt-5 space-y-4">
          {cleanReport && (
            <p className="rounded-2xl border border-green/40 bg-green/5 p-3 text-sm text-green">
              ✓ Nessun problema strutturale rilevato dai controlli automatici.
            </p>
          )}

          {/* US-8.3 personaggi inutilizzati */}
          {report.unusedCharacters.length > 0 && (
            <section className="rounded-2xl border border-yellow/40 bg-panel/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-yellow">
                🎭 Personaggi mai menzionati nel manoscritto
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {report.unusedCharacters.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong>
                    <span className="text-muted">
                      {' '}
                      — non compare in nessuna scena
                      {c.linkedToEvents ? ' (ma è collegato a eventi della timeline)' : ''}.
                      Valorizzalo o valuta di rimuoverlo.
                    </span>
                  </li>
                ))}
              </ul>
              <button className="mt-2 text-xs text-cyan hover:underline" onClick={() => goTo('characters')}>
                Apri Personaggi →
              </button>
            </section>
          )}

          {/* US-8.2 scene vuote/corte */}
          {(report.emptyScenes.length > 0 || report.shortScenes.length > 0) && (
            <section className="rounded-2xl border border-line bg-panel/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
                ✍️ Scene da rivedere
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {report.emptyScenes.map((s) => (
                  <li key={s.id}>
                    <strong className="text-ink">{s.title}</strong> ({s.chapterTitle}) — vuota.
                  </li>
                ))}
                {report.shortScenes.map((s) => (
                  <li key={s.id}>
                    <strong className="text-ink">{s.title}</strong> ({s.chapterTitle}) — solo {s.words} parole.
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* beat scoperti */}
          {report.totalBeats > 0 && report.uncoveredBeats > 0 && (
            <section className="rounded-2xl border border-line bg-panel/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">🧭 Struttura</h3>
              <p className="mt-1 text-sm text-muted">
                {report.uncoveredBeats} beat su {report.totalBeats} non hanno ancora scene associate.
              </p>
              <button className="mt-2 text-xs text-cyan hover:underline" onClick={() => goTo('structure')}>
                Apri Struttura →
              </button>
            </section>
          )}

          {/* US-8.4 bilancio capitoli */}
          {report.chapters.length > 0 && (
            <section className="rounded-2xl border border-line bg-panel/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
                ⚖️ Bilancio dei capitoli
              </h3>
              <div className="mt-3 space-y-2">
                {report.chapters.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="w-44 truncate" title={c.title}>
                      {c.title}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full ${c.flag ? 'bg-yellow' : 'bg-cyan/70'}`}
                        style={{ width: `${Math.max(2, (c.words / maxWords) * 100)}%` }}
                      />
                    </div>
                    <span className="w-32 text-right text-xs text-muted">
                      {c.words.toLocaleString('it-IT')} parole · {Math.round(c.dialogueRatio * 100)}% dial.
                    </span>
                    {c.flag && (
                      <span className="rounded-full bg-yellow/15 px-2 py-0.5 text-[10px] text-yellow">
                        {c.flag === 'short' ? 'molto corto' : 'molto lungo'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Analisi AI (US-8.1, US-8.2 qualitativa) */}
          <section className="rounded-2xl border border-line bg-panel/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">Analisi AI</h3>
            <p className="mt-1 text-xs text-muted">
              Inviano l'intero manoscritto all'AI configurata (in mock: anteprima gratuita del flusso).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-cyan disabled:opacity-50"
                onClick={() => runAi('plot-holes', 'Plot hole individuati')}
                disabled={busy !== null}
              >
                {busy === 'plot-holes' ? 'Analizzo…' : '🕳️ Trova plot hole'}
              </button>
              <button
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-cyan disabled:opacity-50"
                onClick={() => runAi('plot-scene-audit', 'Audit delle scene')}
                disabled={busy !== null}
              >
                {busy === 'plot-scene-audit' ? 'Analizzo…' : '🎬 Audit delle scene'}
              </button>
            </div>

            {aiOutput && (
              <div className="mt-3 rounded-xl border border-violet/40 bg-violet/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet">
                    {aiOutput.title}
                  </span>
                  <button className="text-xs text-muted hover:text-ink" onClick={() => setAiOutput(null)}>
                    Chiudi
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink/90">{aiOutput.text}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
