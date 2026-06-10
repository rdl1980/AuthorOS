import { useEffect, useState } from 'react'
import type { AIResult } from '@shared/ai'
import type { Beat, BeatLink, Scene, StyleProfile } from '@shared/domain'
import { FRAMEWORKS } from '@shared/frameworks'
import { useLibrary } from '../../store/useLibrary'
import { useUsageMeter } from '../../store/useUsageMeter'
import { AiInteractionShell } from '../../components/AiInteractionShell'

export function StructureView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)

  const [beats, setBeats] = useState<Beat[]>([])
  const [links, setLinks] = useState<BeatLink[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [activeStyle, setActiveStyle] = useState<StyleProfile | null>(null)
  const [gen, setGen] = useState<{ beatId: string; result: AIResult } | null>(null)
  const [busyBeat, setBusyBeat] = useState<string | null>(null)

  const reload = async (): Promise<void> => {
    if (!project) return
    const [b, l, s, st] = await Promise.all([
      window.authoros.structure.beats(project.id),
      window.authoros.structure.links(project.id),
      window.authoros.manuscript.scenes(project.id),
      window.authoros.style.active(project.id)
    ])
    setBeats(b)
    setLinks(l)
    setScenes(s)
    setActiveStyle(st)
  }
  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🧭</div>
        <h2 className="text-2xl font-semibold">Struttura narrativa</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per scegliere un framework.
        </p>
      </div>
    )
  }

  const chooseFramework = async (framework: string): Promise<void> => {
    setBeats(await window.authoros.structure.setFramework(project.id, framework))
    await window.authoros.projects.update(project.id, { framework: framework || null })
    await reload()
  }

  const scenesOfBeat = (beatId: string): Scene[] => {
    const ids = new Set(links.filter((l) => l.beatId === beatId).map((l) => l.sceneId))
    return scenes.filter((s) => ids.has(s.id))
  }

  const link = async (beatId: string, sceneId: string): Promise<void> => {
    if (!sceneId) return
    await window.authoros.structure.link(beatId, sceneId)
    setLinks(await window.authoros.structure.links(project.id))
  }
  const unlink = async (beatId: string, sceneId: string): Promise<void> => {
    await window.authoros.structure.unlink(beatId, sceneId)
    setLinks(await window.authoros.structure.links(project.id))
  }

  const generate = async (beat: Beat): Promise<void> => {
    setBusyBeat(beat.id)
    setGen(null)
    try {
      const styleProfile = activeStyle ? `${activeStyle.tone}\n${activeStyle.instructions}`.trim() : undefined
      const res = await window.authoros.ai.generate({
        operation: 'scene',
        prompt: `Scrivi la scena per il beat "${beat.title}" del framework ${beat.framework}. ${beat.description}`,
        styleProfile
      })
      track(res.usage)
      setGen({ beatId: beat.id, result: res })
    } finally {
      setBusyBeat(null)
    }
  }

  // US-4.5: accetta la scena generata → crea una scena reale e la collega al beat.
  const acceptGenerated = async (beat: Beat, text: string): Promise<void> => {
    let chapters = await window.authoros.manuscript.chapters(project.id)
    if (chapters.length === 0) {
      await window.authoros.manuscript.chapterCreate(project.id, 'Capitolo 1')
      chapters = await window.authoros.manuscript.chapters(project.id)
    }
    const scene = await window.authoros.manuscript.sceneCreate(project.id, chapters[0].id, beat.title)
    await window.authoros.manuscript.sceneUpdate(scene.id, { content: text })
    await window.authoros.structure.link(beat.id, scene.id)
    setGen(null)
    await reload()
  }

  // Picker framework
  if (beats.length === 0) {
    return (
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold">Scegli un framework narrativo</h2>
        <p className="mt-1 text-muted">
          Una guida strutturale per collocare scene e capitoli (US-4.1).
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FRAMEWORKS.map((f) => (
            <button
              key={f}
              className="rounded-2xl border border-line bg-panel/60 p-4 text-left hover:border-cyan"
              onClick={() => chooseFramework(f)}
            >
              <div className="font-semibold">{f}</div>
              {project.framework === f && (
                <div className="mt-1 text-xs text-cyan">suggerito per il tuo genere</div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const total = beats.length
  const covered = beats.filter((b) => scenesOfBeat(b.id).length > 0).length

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">{beats[0].framework}</h2>
        <span className="text-sm text-muted">
          {covered}/{total} beat coperti
        </span>
        <button
          className="ml-auto rounded-md border border-line px-3 py-1 text-xs hover:border-cyan"
          onClick={() => chooseFramework('')}
        >
          Cambia framework
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {beats.map((b, i) => {
          const linked = scenesOfBeat(b.id)
          const missing = linked.length === 0
          const available = scenes.filter((s) => !linked.some((l) => l.id === s.id))
          return (
            <article
              key={b.id}
              className={`rounded-2xl border bg-panel/50 p-4 ${missing ? 'border-yellow/40' : 'border-line'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{i + 1}</span>
                <h3 className="font-semibold">{b.title}</h3>
                {missing && (
                  <span className="rounded-full bg-yellow/15 px-2 py-0.5 text-[10px] text-yellow">
                    beat mancante
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{b.description}</p>

              {/* Scene collegate */}
              {linked.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {linked.map((s) => (
                    <span
                      key={s.id}
                      className="flex items-center gap-1 rounded-full border border-line bg-bg/40 px-2 py-0.5 text-xs"
                    >
                      {s.title}
                      <button className="text-muted hover:text-red" onClick={() => unlink(b.id, s.id)}>
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {available.length > 0 && (
                  <select
                    className="rounded-md border border-line bg-bg/60 px-2 py-1 text-xs outline-none focus:border-cyan"
                    value=""
                    onChange={(e) => link(b.id, e.target.value)}
                  >
                    <option value="">+ Collega scena…</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="rounded-md border border-line px-2 py-1 text-xs hover:border-cyan disabled:opacity-50"
                  onClick={() => generate(b)}
                  disabled={busyBeat === b.id}
                >
                  {busyBeat === b.id ? 'Genero…' : '✨ Genera scena AI'}
                </button>
              </div>

              {gen?.beatId === b.id && (
                <div className="mt-3">
                  <AiInteractionShell
                    draft={gen.result.text}
                    onAccept={(text) => acceptGenerated(b, text)}
                    onReject={() => setGen(null)}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Accettando, viene creata una scena collegata a questo beat.
                  </p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
