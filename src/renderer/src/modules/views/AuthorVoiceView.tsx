import { useEffect, useState } from 'react'
import type { StyleProfile } from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'
import { useUsageMeter } from '../../store/useUsageMeter'

/** Modulo Author Voice (Epic 23): definisci e applica la voce dell'autore. */
export function AuthorVoiceView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)

  const [profiles, setProfiles] = useState<StyleProfile[]>([])
  const [name, setName] = useState('')
  const [tone, setTone] = useState('')
  const [instructions, setInstructions] = useState('')
  const [sample, setSample] = useState('')
  const [deriving, setDeriving] = useState(false)

  const reload = async (): Promise<void> => {
    if (!project) return
    setProfiles(await window.authoros.style.list(project.id))
  }
  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🎙️</div>
        <h2 className="text-2xl font-semibold">Author Voice</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per gestire i profili di stile.
        </p>
      </div>
    )
  }

  const create = async (): Promise<void> => {
    if (!name.trim()) return
    await window.authoros.style.create(project.id, {
      name: name.trim(),
      tone: tone.trim(),
      instructions: instructions.trim()
    })
    setName('')
    setTone('')
    setInstructions('')
    await reload()
  }

  const deriveFromSample = async (): Promise<void> => {
    if (!sample.trim()) return
    setDeriving(true)
    try {
      const res = await window.authoros.ai.deriveStyle(sample)
      track(res.usage)
      setInstructions(res.text)
    } finally {
      setDeriving(false)
    }
  }

  const setActive = async (id: string): Promise<void> => {
    await window.authoros.style.setActive(project.id, id)
    await reload()
  }
  const remove = async (id: string): Promise<void> => {
    await window.authoros.style.remove(id)
    await reload()
  }

  const inputCls =
    'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold">Author Voice — {project.title}</h2>
      <p className="mt-1 text-muted">
        Definisci la tua voce: l'AI la rispetterà in ogni generazione. «Scrivi più veloce, senza
        perdere la tua voce.»
      </p>

      {/* Nuovo profilo */}
      <section className="mt-6 space-y-2 rounded-2xl border border-line bg-panel/50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">Nuovo profilo</h3>
        <input
          className={`${inputCls} w-full`}
          placeholder="Nome (es. Voce principale)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${inputCls} w-full`}
          placeholder="Tono/registro (es. ironico, asciutto, prima persona)"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        />
        <textarea
          className={`${inputCls} h-28 w-full resize-y`}
          placeholder="Istruzioni di stile per l'AI…"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />

        <details className="rounded-lg border border-line bg-bg/40 p-2">
          <summary className="cursor-pointer text-xs text-cyan">
            Genera le istruzioni da un mio testo campione (AI)
          </summary>
          <textarea
            className={`${inputCls} mt-2 h-24 w-full resize-y`}
            placeholder="Incolla un brano scritto da te…"
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
          <button
            className="mt-2 rounded-lg border border-line px-3 py-1.5 text-xs hover:border-cyan disabled:opacity-50"
            onClick={deriveFromSample}
            disabled={deriving || !sample.trim()}
          >
            {deriving ? 'Analizzo…' : 'Analizza stile → istruzioni'}
          </button>
        </details>

        <button
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
          onClick={create}
          disabled={!name.trim()}
        >
          Crea profilo
        </button>
      </section>

      {/* Profili esistenti */}
      <section className="mt-4 space-y-2">
        {profiles.length === 0 && <p className="text-muted">Nessun profilo di stile.</p>}
        {profiles.map((p) => (
          <article
            key={p.id}
            className={`rounded-2xl border bg-panel/60 p-4 ${
              p.isActive ? 'border-green' : 'border-line'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">
                {p.name}
                {p.isActive && <span className="ml-2 text-xs text-green">attivo</span>}
              </h3>
              <div className="flex gap-2">
                {!p.isActive && (
                  <button
                    className="rounded-md border border-line px-2 py-1 text-xs hover:border-green hover:text-green"
                    onClick={() => setActive(p.id)}
                  >
                    Attiva
                  </button>
                )}
                <button
                  className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-red hover:text-red"
                  onClick={() => remove(p.id)}
                >
                  Elimina
                </button>
              </div>
            </div>
            {p.tone && <p className="mt-1 text-sm text-violet">{p.tone}</p>}
            {p.instructions && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{p.instructions}</p>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}
