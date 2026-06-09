import { useEffect, useState } from 'react'
import type { Project } from '@shared/domain'
import { GENRES, FRAMEWORKS, suggestFramework } from '@shared/frameworks'
import { useLibrary } from '../../store/useLibrary'

/**
 * Modulo Libreria (Epic 1) — crea, classifica, apre, duplica e archivia i progetti.
 * Persistenza su SQLite (Drizzle) nel main process via IPC.
 */
export function LibraryView(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [framework, setFramework] = useState('')
  const [frameworkTouched, setFrameworkTouched] = useState(false)

  const { active, setActive } = useLibrary()

  const refresh = async (): Promise<void> => {
    setProjects(await window.authoros.projects.list(showArchived))
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  // US-1.2: scelto il genere, suggerisce un framework (se l'autore non l'ha già scelto).
  const onGenreChange = (value: string): void => {
    setGenre(value)
    if (!frameworkTouched) setFramework(suggestFramework(value) ?? '')
  }

  const create = async (): Promise<void> => {
    if (!title.trim()) return
    await window.authoros.projects.create({
      title: title.trim(),
      genre: genre || undefined,
      framework: framework || undefined
    })
    setTitle('')
    setGenre('')
    setFramework('')
    setFrameworkTouched(false)
    await refresh()
  }

  const duplicate = async (id: string): Promise<void> => {
    await window.authoros.projects.duplicate(id)
    await refresh()
  }

  const toggleArchive = async (p: Project): Promise<void> => {
    await window.authoros.projects.setArchived(p.id, p.status !== 'archived')
    if (active?.id === p.id) setActive(null)
    await refresh()
  }

  const inputCls =
    'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

  return (
    <div>
      <h2 className="text-2xl font-semibold">La tua libreria</h2>
      <p className="mt-1 text-muted">
        Crea e gestisci i tuoi progetti libro. I dati sono salvati localmente (SQLite).
      </p>

      {/* Form nuovo progetto */}
      <div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-line bg-panel/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className={inputCls}
          placeholder="Titolo del libro"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <select className={inputCls} value={genre} onChange={(e) => onGenreChange(e.target.value)}>
          <option value="">Genere (opz.)</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value)
            setFrameworkTouched(true)
          }}
        >
          <option value="">Framework (suggerito)</option>
          {FRAMEWORKS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
          onClick={create}
          disabled={!title.trim()}
        >
          Nuovo progetto
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Mostra archiviati
        </label>
        {active && <span className="ml-auto text-cyan">Aperto: {active.title}</span>}
      </div>

      {/* Lista progetti */}
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {loading && <p className="text-muted">Caricamento…</p>}
        {!loading && projects.length === 0 && (
          <p className="text-muted">Nessun progetto. Creane uno per iniziare.</p>
        )}
        {projects.map((p) => (
          <article
            key={p.id}
            className={`flex flex-col rounded-2xl border bg-panel/70 p-4 ${
              active?.id === p.id ? 'border-cyan' : 'border-line'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              {p.status === 'archived' && (
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                  archiviato
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{p.genre ?? 'Genere non impostato'}</p>
            {p.framework && <p className="text-xs text-violet">{p.framework}</p>}
            <p className="mt-2 text-xs text-muted">
              {new Date(p.updatedAt).toLocaleDateString('it-IT')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-cyan/90 px-3 py-1.5 text-xs font-semibold text-bg hover:bg-cyan"
                onClick={() => setActive(p)}
              >
                Apri
              </button>
              <button
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:border-cyan"
                onClick={() => duplicate(p.id)}
              >
                Duplica
              </button>
              <button
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:border-yellow hover:text-yellow"
                onClick={() => toggleArchive(p)}
              >
                {p.status === 'archived' ? 'Ripristina' : 'Archivia'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
