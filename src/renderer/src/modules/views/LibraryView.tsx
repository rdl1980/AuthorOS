import { useEffect, useState } from 'react'
import type { Project } from '@shared/domain'

/** Modulo Libreria (Epic 1) — crea ed elenca progetti, persistiti dal main process. */
export function LibraryView(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = async (): Promise<void> => {
    setProjects(await window.authoros.projects.list())
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const create = async (): Promise<void> => {
    if (!title.trim()) return
    await window.authoros.projects.create({ title: title.trim(), genre: genre.trim() || undefined })
    setTitle('')
    setGenre('')
    await refresh()
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold">La tua libreria</h2>
      <p className="mt-1 text-muted">Crea e gestisci i tuoi progetti libro. I dati sono salvati localmente.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
          placeholder="Titolo del libro"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <input
          className="w-44 rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan"
          placeholder="Genere (opz.)"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
          onClick={create}
        >
          Nuovo progetto
        </button>
      </div>

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {loading && <p className="text-muted">Caricamento…</p>}
        {!loading && projects.length === 0 && (
          <p className="text-muted">Nessun progetto. Creane uno per iniziare.</p>
        )}
        {projects.map((p) => (
          <article key={p.id} className="rounded-2xl border border-line bg-panel/70 p-4">
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted">{p.genre ?? 'Genere non impostato'}</p>
            <p className="mt-3 text-xs text-muted">
              Creato il {new Date(p.createdAt).toLocaleDateString('it-IT')}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
