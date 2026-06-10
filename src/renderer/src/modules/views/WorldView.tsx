import { useEffect, useState } from 'react'
import type { WorldElement, WorldKind } from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'

const inputCls =
  'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

const KINDS: { kind: WorldKind; icon: string; label: string; placeholder: string; us: string }[] = [
  { kind: 'place', icon: '📍', label: 'Luoghi', placeholder: 'es. Il faro, La locanda del porto…', us: 'US-7.1' },
  { kind: 'organization', icon: '🏛️', label: 'Organizzazioni', placeholder: 'es. La Gilda, Il Consiglio…', us: 'US-7.2' },
  { kind: 'system', icon: '⚙️', label: 'Sistemi & Regole', placeholder: 'es. Il sistema magico, Le leggi del regno…', us: 'US-7.3' }
]

/** World Building (Epic 7): luoghi, organizzazioni e sistemi del mondo narrativo. */
export function WorldView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const [elements, setElements] = useState<WorldElement[]>([])
  const [tab, setTab] = useState<WorldKind>('place')
  const [name, setName] = useState('')

  const reload = async (): Promise<void> => {
    if (!project) return
    setElements(await window.authoros.world.list(project.id))
  }

  useEffect(() => {
    setTab('place')
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🌍</div>
        <h2 className="text-2xl font-semibold">World Building</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per costruire il mondo narrativo.
        </p>
      </div>
    )
  }

  const create = async (): Promise<void> => {
    if (!name.trim()) return
    await window.authoros.world.create(project.id, { kind: tab, name: name.trim() })
    setName('')
    await reload()
  }

  const patch = (id: string, p: Parameters<typeof window.authoros.world.update>[1]): void => {
    setElements((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)))
    void window.authoros.world.update(id, p)
  }

  const remove = async (id: string): Promise<void> => {
    await window.authoros.world.remove(id)
    await reload()
  }

  const current = KINDS.find((k) => k.kind === tab)!
  const visible = elements.filter((e) => e.kind === tab)

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">World Building — {project.title}</h2>

      {/* Tab per tipo */}
      <div className="mt-4 flex gap-2">
        {KINDS.map((k) => {
          const count = elements.filter((e) => e.kind === k.kind).length
          return (
            <button
              key={k.kind}
              onClick={() => setTab(k.kind)}
              className={`rounded-xl border px-4 py-2 text-sm ${
                tab === k.kind
                  ? 'border-cyan bg-cyan/15 text-ink'
                  : 'border-line text-muted hover:border-cyan hover:text-ink'
              }`}
              title={k.us}
            >
              {k.icon} {k.label}
              {count > 0 && <span className="ml-2 text-xs text-muted">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Nuovo elemento */}
      <div className="mt-4 flex gap-2">
        <input
          className={`${inputCls} min-w-0 flex-1`}
          placeholder={current.placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
          onClick={create}
          disabled={!name.trim()}
        >
          Aggiungi
        </button>
      </div>

      {/* Elenco */}
      <div className="mt-4 space-y-3">
        {visible.length === 0 && (
          <p className="text-muted">Nessun elemento in {current.label.toLowerCase()}.</p>
        )}
        {visible.map((e) => (
          <article key={e.id} className="group rounded-2xl border border-line bg-panel/50 p-4">
            <div className="flex items-center gap-2">
              <span>{current.icon}</span>
              <input
                className="flex-1 rounded-lg bg-transparent px-1 py-0.5 text-lg font-semibold outline-none hover:bg-white/5 focus:bg-white/10"
                value={e.name}
                onChange={(ev) => patch(e.id, { name: ev.target.value })}
              />
              <button
                className="text-xs text-muted opacity-0 transition hover:text-red group-hover:opacity-100"
                onClick={() => remove(e.id)}
              >
                ✕
              </button>
            </div>
            <input
              className="mt-1 w-full rounded-lg bg-transparent px-1 py-0.5 text-sm text-muted outline-none hover:bg-white/5 focus:bg-white/10"
              placeholder="Descrizione breve…"
              value={e.description}
              onChange={(ev) => patch(e.id, { description: ev.target.value })}
            />
            <textarea
              className="mt-1 w-full resize-y rounded-lg bg-transparent px-1 py-0.5 text-sm text-muted outline-none hover:bg-white/5 focus:bg-white/10"
              rows={e.details ? 3 : 1}
              placeholder="Dettagli: regole, storia, gerarchie, aspetto…"
              value={e.details}
              onChange={(ev) => patch(e.id, { details: ev.target.value })}
            />
          </article>
        ))}
      </div>
    </div>
  )
}
