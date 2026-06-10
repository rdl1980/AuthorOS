import { useEffect, useState } from 'react'
import type {
  Character,
  EventCharacterLink,
  TimelineEvent,
  TimelineIssue
} from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'

const inputCls =
  'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

export function TimelineView(): JSX.Element {
  const project = useLibrary((s) => s.active)

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [links, setLinks] = useState<EventCharacterLink[]>([])
  const [issues, setIssues] = useState<TimelineIssue[]>([])
  const [cast, setCast] = useState<Character[]>([])
  const [filterChar, setFilterChar] = useState('')

  // form nuovo evento
  const [title, setTitle] = useState('')
  const [whenLabel, setWhenLabel] = useState('')
  const [dateValue, setDateValue] = useState('')
  const [location, setLocation] = useState('')

  const reload = async (): Promise<void> => {
    if (!project) return
    const [evs, ls, is, cs] = await Promise.all([
      window.authoros.timeline.events(project.id),
      window.authoros.timeline.links(project.id),
      window.authoros.timeline.issues(project.id),
      window.authoros.characters.list(project.id)
    ])
    setEvents(evs)
    setLinks(ls)
    setIssues(is)
    setCast(cs)
  }

  useEffect(() => {
    setFilterChar('')
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🕒</div>
        <h2 className="text-2xl font-semibold">Timeline</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per costruire la cronologia.
        </p>
      </div>
    )
  }

  const create = async (): Promise<void> => {
    if (!title.trim()) return
    const parsed = dateValue.trim() === '' ? undefined : Number(dateValue)
    await window.authoros.timeline.create(project.id, {
      title: title.trim(),
      whenLabel: whenLabel.trim(),
      dateValue: Number.isFinite(parsed) ? parsed : undefined,
      location: location.trim()
    })
    setTitle('')
    setWhenLabel('')
    setDateValue('')
    setLocation('')
    await reload()
  }

  const move = async (id: string, dir: -1 | 1): Promise<void> => {
    const ids = events.map((e) => e.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await window.authoros.timeline.reorder(project.id, ids)
    await reload()
  }

  const remove = async (id: string): Promise<void> => {
    await window.authoros.timeline.remove(id)
    await reload()
  }

  const patch = (id: string, p: Parameters<typeof window.authoros.timeline.update>[1]): void => {
    setEvents((evs) => evs.map((e) => (e.id === id ? { ...e, ...p } : e)))
    void window.authoros.timeline.update(id, p).then(async () => {
      if ('dateValue' in p) setIssues(await window.authoros.timeline.issues(project.id))
    })
  }

  const charsOf = (eventId: string): Character[] => {
    const ids = new Set(links.filter((l) => l.eventId === eventId).map((l) => l.characterId))
    return cast.filter((c) => ids.has(c.id))
  }

  const link = async (eventId: string, characterId: string): Promise<void> => {
    if (!characterId) return
    await window.authoros.timeline.link(eventId, characterId)
    setLinks(await window.authoros.timeline.links(project.id))
  }
  const unlink = async (eventId: string, characterId: string): Promise<void> => {
    await window.authoros.timeline.unlink(eventId, characterId)
    setLinks(await window.authoros.timeline.links(project.id))
  }

  // US-6.3: timeline personale = filtro per personaggio collegato
  const visible = filterChar
    ? events.filter((e) => links.some((l) => l.eventId === e.id && l.characterId === filterChar))
    : events

  const issueByEvent = new Map(issues.map((i) => [i.eventId, i.message]))

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">Timeline — {project.title}</h2>
        {cast.length > 0 && (
          <select
            className={`${inputCls} ml-auto`}
            value={filterChar}
            onChange={(e) => setFilterChar(e.target.value)}
            title="Timeline personale (US-6.3)"
          >
            <option value="">Tutta la storia</option>
            {cast.map((c) => (
              <option key={c.id} value={c.id}>
                Solo: {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Avvisi coerenza (US-9.3) */}
      {issues.length > 0 && (
        <div className="mt-3 rounded-2xl border border-yellow/40 bg-yellow/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-yellow">
            ⚠ Possibili incoerenze temporali
          </div>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {issues.map((i) => (
              <li key={i.eventId}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Nuovo evento */}
      <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-line bg-panel/50 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          className={`${inputCls} lg:col-span-2`}
          placeholder="Titolo evento"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <input
          className={inputCls}
          placeholder="Quando (es. Estate 1923)"
          value={whenLabel}
          onChange={(e) => setWhenLabel(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="N° cronologico (es. 1923)"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          title="Opzionale: usato per rilevare incoerenze nell'ordine"
        />
        <input
          className={inputCls}
          placeholder="Luogo (opz.)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50 lg:col-span-5"
          onClick={create}
          disabled={!title.trim()}
        >
          Aggiungi evento
        </button>
      </div>

      {/* Linea temporale (US-9.4) */}
      <div className="relative mt-6 border-l-2 border-line pl-6">
        {visible.length === 0 && (
          <p className="text-muted">
            {filterChar ? 'Nessun evento per questo personaggio.' : 'Nessun evento. Aggiungine uno.'}
          </p>
        )}
        {visible.map((ev, i) => {
          const evChars = charsOf(ev.id)
          const available = cast.filter((c) => !evChars.some((x) => x.id === c.id))
          const issue = issueByEvent.get(ev.id)
          return (
            <article key={ev.id} className="group relative mb-5">
              <span
                className={`absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 ${
                  issue ? 'border-yellow bg-yellow/40' : 'border-cyan bg-bg'
                }`}
              />
              <div
                className={`rounded-2xl border bg-panel/50 p-4 ${
                  issue ? 'border-yellow/50' : 'border-line'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ev.whenLabel && (
                    <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-xs text-cyan">
                      {ev.whenLabel}
                    </span>
                  )}
                  {ev.location && (
                    <span className="rounded-full bg-violet/15 px-2 py-0.5 text-xs text-violet">
                      📍 {ev.location}
                    </span>
                  )}
                  <span className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="text-xs text-muted hover:text-ink disabled:opacity-30"
                      onClick={() => move(ev.id, -1)}
                      disabled={i === 0 || Boolean(filterChar)}
                      title="Su"
                    >
                      ▲
                    </button>
                    <button
                      className="text-xs text-muted hover:text-ink disabled:opacity-30"
                      onClick={() => move(ev.id, 1)}
                      disabled={i === visible.length - 1 || Boolean(filterChar)}
                      title="Giù"
                    >
                      ▼
                    </button>
                    <button
                      className="text-xs text-muted hover:text-red"
                      onClick={() => remove(ev.id)}
                      title="Elimina"
                    >
                      ✕
                    </button>
                  </span>
                </div>

                <input
                  className="mt-1 w-full rounded-lg bg-transparent px-1 py-0.5 text-lg font-semibold outline-none hover:bg-white/5 focus:bg-white/10"
                  value={ev.title}
                  onChange={(e) => patch(ev.id, { title: e.target.value })}
                />
                <textarea
                  className="mt-1 w-full resize-y rounded-lg bg-transparent px-1 py-0.5 text-sm text-muted outline-none hover:bg-white/5 focus:bg-white/10"
                  rows={ev.description ? 2 : 1}
                  placeholder="Descrizione…"
                  value={ev.description}
                  onChange={(e) => patch(ev.id, { description: e.target.value })}
                />

                {/* Personaggi coinvolti (US-9.2) */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {evChars.map((c) => (
                    <span
                      key={c.id}
                      className="flex items-center gap-1 rounded-full border border-line bg-bg/40 px-2 py-0.5 text-xs"
                    >
                      {c.name}
                      <button className="text-muted hover:text-red" onClick={() => unlink(ev.id, c.id)}>
                        ✕
                      </button>
                    </span>
                  ))}
                  {available.length > 0 && (
                    <select
                      className="rounded-md border border-line bg-bg/60 px-2 py-1 text-xs outline-none focus:border-cyan"
                      value=""
                      onChange={(e) => link(ev.id, e.target.value)}
                    >
                      <option value="">+ personaggio…</option>
                      {available.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {issue && <p className="mt-2 text-xs text-yellow">⚠ {issue}</p>}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
