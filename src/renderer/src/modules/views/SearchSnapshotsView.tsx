import { useEffect, useRef, useState } from 'react'
import type { SearchKind, SearchResult, SnapshotMeta } from '@shared/search'
import { useLibrary } from '../../store/useLibrary'
import { useNav } from '../../store/useNav'
import { useWorkspace } from '../../store/useWorkspace'

const inputCls =
  'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

const KIND_META: Record<SearchKind, { icon: string; label: string }> = {
  scene: { icon: '✍️', label: 'Scene' },
  chapter: { icon: '📖', label: 'Capitoli' },
  note: { icon: '📝', label: 'Note' },
  character: { icon: '🎭', label: 'Personaggi' },
  event: { icon: '🕒', label: 'Eventi' },
  world: { icon: '🌍', label: 'Mondo' }
}

export function SearchSnapshotsView(): JSX.Element {
  const { active: project, setActive } = useLibrary()
  const goTo = useNav((s) => s.goTo)
  const selectScene = useWorkspace((s) => s.select)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reloadSnapshots = async (): Promise<void> => {
    if (!project) return
    setSnapshots(await window.authoros.snapshots.list(project.id))
  }

  useEffect(() => {
    setQuery('')
    setResults([])
    setMessage(null)
    void reloadSnapshots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  // Ricerca con debounce (US-24.1)
  useEffect(() => {
    if (!project) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setResults(query.trim().length >= 2 ? await window.authoros.search.query(project.id, query) : [])
    }, 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🔎</div>
        <h2 className="text-2xl font-semibold">Cerca & Snapshot</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per cercare nei contenuti e gestire le
          versioni.
        </p>
      </div>
    )
  }

  const openResult = (r: SearchResult): void => {
    if (r.kind === 'scene') {
      selectScene(r.id)
      goTo('writing')
    } else if (r.kind === 'chapter' || r.kind === 'note') {
      goTo('writing')
    } else if (r.kind === 'character') {
      goTo('characters')
    } else if (r.kind === 'world') {
      goTo('world')
    } else {
      goTo('timeline')
    }
  }

  const createSnapshot = async (): Promise<void> => {
    setBusy(true)
    try {
      await window.authoros.snapshots.create(project.id, label)
      setLabel('')
      setMessage('Snapshot creato.')
      await reloadSnapshots()
    } finally {
      setBusy(false)
    }
  }

  const restore = async (s: SnapshotMeta): Promise<void> => {
    if (
      !window.confirm(
        `Ripristinare "${s.label}" del ${new Date(s.createdAt).toLocaleString('it-IT')}?\n` +
          'I contenuti attuali vengono prima salvati in uno snapshot "Pre-ripristino".'
      )
    )
      return
    setBusy(true)
    try {
      const ok = await window.authoros.snapshots.restore(project.id, s.file)
      if (ok) {
        const fresh = await window.authoros.projects.get(project.id)
        if (fresh) setActive(fresh)
        setMessage('Progetto ripristinato. Le viste si aggiorneranno alla prossima apertura.')
      } else {
        setMessage('Ripristino non riuscito.')
      }
      await reloadSnapshots()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (s: SnapshotMeta): Promise<void> => {
    await window.authoros.snapshots.remove(project.id, s.file)
    await reloadSnapshots()
  }

  const grouped = (Object.keys(KIND_META) as SearchKind[])
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Cerca & Snapshot — {project.title}</h2>

      {/* Ricerca (US-24.1) */}
      <section className="mt-4">
        <input
          className={`${inputCls} w-full`}
          placeholder="Cerca in scene, capitoli, note, personaggi, eventi… (min 2 caratteri)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query.trim().length >= 2 && (
          <p className="mt-2 text-xs text-muted">
            {results.length} risultat{results.length === 1 ? 'o' : 'i'}
          </p>
        )}
        <div className="mt-2 space-y-4">
          {grouped.map((g) => (
            <div key={g.kind}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan">
                {KIND_META[g.kind].icon} {KIND_META[g.kind].label}
              </h3>
              <ul className="mt-1 space-y-1">
                {g.items.map((r) => (
                  <li key={`${r.kind}:${r.id}`}>
                    <button
                      className="w-full rounded-lg border border-line bg-panel/40 px-3 py-2 text-left hover:border-cyan"
                      onClick={() => openResult(r)}
                    >
                      <span className="text-sm font-semibold">{r.title}</span>
                      <span className="ml-2 text-xs text-muted">{r.snippet}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Snapshot (US-24.2/24.3) */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Versioni del progetto
        </h3>
        <p className="mt-1 text-xs text-muted">
          Uno snapshot fotografa tutto il progetto (manoscritto, struttura, personaggi, timeline).
          Quelli automatici vengono creati ogni 15 minuti se ci sono modifiche (max 10).
        </p>

        {message && <p className="mt-2 rounded-lg border border-green/40 bg-green/5 p-2 text-sm text-green">{message}</p>}

        <div className="mt-3 flex gap-2">
          <input
            className={`${inputCls} min-w-0 flex-1`}
            placeholder="Etichetta (es. Prima della revisione)…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createSnapshot()}
          />
          <button
            className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
            onClick={createSnapshot}
            disabled={busy}
          >
            Crea snapshot
          </button>
        </div>

        <ul className="mt-3 space-y-1">
          {snapshots.length === 0 && <li className="text-sm text-muted">Nessuno snapshot ancora.</li>}
          {snapshots.map((s) => (
            <li
              key={s.file}
              className="flex items-center gap-3 rounded-lg border border-line bg-panel/40 px-3 py-2"
            >
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  s.kind === 'auto' ? 'bg-violet/15 text-violet' : 'bg-cyan/15 text-cyan'
                }`}
              >
                {s.kind === 'auto' ? 'auto' : 'manuale'}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                <strong>{s.label}</strong>
                <span className="ml-2 text-xs text-muted">
                  {new Date(s.createdAt).toLocaleString('it-IT')} · {s.words.toLocaleString('it-IT')} parole
                </span>
              </span>
              <button
                className="rounded-md border border-line px-2 py-1 text-xs hover:border-green hover:text-green disabled:opacity-50"
                onClick={() => restore(s)}
                disabled={busy}
              >
                Ripristina
              </button>
              <button
                className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-red hover:text-red"
                onClick={() => remove(s)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
