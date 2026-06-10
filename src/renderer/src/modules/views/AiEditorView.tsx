import { useEffect, useMemo, useState } from 'react'
import type { AssistKind } from '@shared/ai'
import type { Chapter, Scene } from '@shared/domain'
import { analyzePacing, analyzeRepetitions } from '@shared/editor'
import { useLibrary } from '../../store/useLibrary'
import { useUsageMeter } from '../../store/useUsageMeter'

const inputCls =
  'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

const AI_CHECKS: { kind: AssistKind; label: string; us: string }[] = [
  { kind: 'editor-info-dump', label: 'Info dump', us: 'US-10.2' },
  { kind: 'editor-dialogue', label: 'Dialoghi artificiali', us: 'US-10.3' },
  { kind: 'editor-pacing', label: 'Ritmo (AI)', us: 'US-10.4' },
  { kind: 'editor-show-dont-tell', label: "Show don't tell", us: 'US-10.5' }
]

export function AiEditorView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [sceneId, setSceneId] = useState('')
  const [busy, setBusy] = useState<AssistKind | null>(null)
  const [aiResults, setAiResults] = useState<Partial<Record<AssistKind, string>>>({})

  useEffect(() => {
    setSceneId('')
    setAiResults({})
    if (!project) return
    void Promise.all([
      window.authoros.manuscript.chapters(project.id),
      window.authoros.manuscript.scenes(project.id)
    ]).then(([chs, scs]) => {
      setChapters(chs)
      setScenes(scs)
    })
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const scene = scenes.find((s) => s.id === sceneId) ?? null

  // Analisi deterministica locale: istantanea, offline, a costo zero.
  const repetitions = useMemo(() => (scene ? analyzeRepetitions(scene.content) : []), [scene])
  const pacing = useMemo(() => (scene ? analyzePacing(scene.content) : null), [scene])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🔍</div>
        <h2 className="text-2xl font-semibold">AI Editor</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per revisionare il testo.
        </p>
      </div>
    )
  }

  const runCheck = async (kind: AssistKind): Promise<void> => {
    if (!scene || !scene.content.trim()) return
    setBusy(kind)
    try {
      const res = await window.authoros.ai.assist(kind, scene.content)
      track(res.usage)
      setAiResults((r) => ({ ...r, [kind]: res.text }))
    } catch (e) {
      setAiResults((r) => ({
        ...r,
        [kind]: `Errore durante l'analisi: ${e instanceof Error ? e.message : String(e)}`
      }))
    } finally {
      setBusy(null)
    }
  }

  const chapterTitle = (id: string): string => chapters.find((c) => c.id === id)?.title ?? ''

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">AI Editor</h2>
      <p className="mt-1 text-muted">
        Revisione intelligente: analisi locali immediate e controlli AI su richiesta.
      </p>

      {/* Selettore scena */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          className={`${inputCls} min-w-[260px]`}
          value={sceneId}
          onChange={(e) => {
            setSceneId(e.target.value)
            setAiResults({})
          }}
        >
          <option value="">Scegli una scena da revisionare…</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {chapterTitle(s.chapterId)} · {s.title} ({s.wordCount} parole)
            </option>
          ))}
        </select>
        {scenes.length === 0 && (
          <span className="text-xs text-muted">Scrivi qualche scena nel Workspace prima.</span>
        )}
      </div>

      {scene && !scene.content.trim() && (
        <p className="mt-4 text-muted">Questa scena è vuota: non c'è nulla da analizzare.</p>
      )}

      {scene && scene.content.trim() && (
        <div className="mt-5 space-y-4">
          {/* Ritmo — deterministico (US-10.4 base) */}
          {pacing && (
            <section className="rounded-2xl border border-line bg-panel/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
                Ritmo — misure locali
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-4">
                <span>{pacing.words} parole</span>
                <span>{pacing.sentences} frasi</span>
                <span>media {pacing.avgSentenceLen} parole/frase</span>
                <span>frase max {pacing.maxSentenceLen}</span>
                <span>{pacing.paragraphs} paragrafi</span>
                <span>media {pacing.avgParagraphLen} parole/par.</span>
                <span>par. max {pacing.maxParagraphLen}</span>
                <span>dialogo ~{Math.round(pacing.dialogueRatio * 100)}%</span>
              </div>
              {pacing.maxSentenceLen > 45 && (
                <p className="mt-2 text-xs text-yellow">
                  ⚠ C'è almeno una frase di {pacing.maxSentenceLen} parole: valuta di spezzarla.
                </p>
              )}
            </section>
          )}

          {/* Ripetizioni — deterministico (US-10.1) */}
          <section className="rounded-2xl border border-line bg-panel/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
              Ripetizioni
            </h3>
            {repetitions.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nessuna ripetizione ravvicinata rilevata. ✓</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {repetitions.map((r) => (
                  <li key={`${r.kind}:${r.term}`} className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        r.kind === 'phrase' ? 'bg-violet/15 text-violet' : 'bg-yellow/15 text-yellow'
                      }`}
                    >
                      {r.kind === 'phrase' ? 'locuzione' : 'parola'}
                    </span>
                    <strong>«{r.term}»</strong>
                    <span className="text-muted">
                      ×{r.count}
                      {r.kind === 'word' && r.minGap !== 0 && ` · a sole ${r.minGap} parole di distanza`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Controlli AI on-demand (US-10.2/10.3/10.4/10.5) */}
          <section className="rounded-2xl border border-line bg-panel/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
              Revisione AI
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {AI_CHECKS.map((c) => (
                <button
                  key={c.kind}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-cyan disabled:opacity-50"
                  onClick={() => runCheck(c.kind)}
                  disabled={busy !== null}
                  title={c.us}
                >
                  {busy === c.kind ? 'Analizzo…' : `✨ ${c.label}`}
                </button>
              ))}
            </div>

            {AI_CHECKS.filter((c) => aiResults[c.kind]).map((c) => (
              <div key={c.kind} className="mt-3 rounded-xl border border-violet/40 bg-violet/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet">
                    {c.label}
                  </span>
                  <button
                    className="text-xs text-muted hover:text-ink"
                    onClick={() => setAiResults((r) => ({ ...r, [c.kind]: undefined }))}
                  >
                    Chiudi
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink/90">{aiResults[c.kind]}</p>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}
