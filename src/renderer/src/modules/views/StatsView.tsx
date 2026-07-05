import { useEffect, useMemo, useState } from 'react'
import type { DailyStat, ProjectStats } from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'
import { usePrefs } from '../../store/usePrefs'

const dayKey = (offset: number): string =>
  new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10)

/** Dashboard progressi (Epic 27): storico, obiettivo+streak, deadline con proiezione. */
export function StatsView(): JSX.Element {
  const { active: project, setActive } = useLibrary()
  const { dailyGoal, patch: patchPrefs } = usePrefs()

  const [daily, setDaily] = useState<DailyStat[]>([])
  const [totals, setTotals] = useState<ProjectStats | null>(null)

  useEffect(() => {
    if (!project) return
    void Promise.all([
      window.authoros.manuscript.statsDaily(project.id, 30),
      window.authoros.manuscript.stats(project.id)
    ]).then(([d, t]) => {
      setDaily(d)
      setTotals(t)
    })
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const byDate = useMemo(() => new Map(daily.map((d) => [d.date, d.wordsAdded])), [daily])

  // Ultimi 30 giorni, dal più vecchio a oggi (0 dove non si è scritto).
  const days = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const date = dayKey(29 - i)
        return { date, words: byDate.get(date) ?? 0 }
      }),
    [byDate]
  )

  // Streak (US-27.2): giorni consecutivi con parole > 0, contando da oggi
  // (o da ieri se oggi non si è ancora scritto).
  const streak = useMemo(() => {
    let count = 0
    let offset = (byDate.get(dayKey(0)) ?? 0) > 0 ? 0 : 1
    while ((byDate.get(dayKey(offset)) ?? 0) > 0) {
      count += 1
      offset += 1
    }
    return count
  }, [byDate])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">📈</div>
        <h2 className="text-2xl font-semibold">Progressi</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per vedere le tue statistiche.
        </p>
      </div>
    )
  }

  const todayWords = byDate.get(dayKey(0)) ?? 0
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((todayWords / dailyGoal) * 100)) : 0
  const maxDay = Math.max(1, ...days.map((d) => d.words))

  // Proiezione deadline (US-27.3)
  const target = project.targetWordCount ?? 0
  const remaining = totals ? Math.max(0, target - totals.words) : 0
  const daysLeft = project.deadline
    ? Math.max(0, Math.ceil((Date.parse(project.deadline) - Date.now()) / 86400000))
    : null
  const neededPerDay = daysLeft && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : null
  const last7 = days.slice(-7).reduce((a, d) => a + Math.max(0, d.words), 0) / 7
  const onTrack = neededPerDay !== null ? last7 >= neededPerDay : null

  const setGoal = async (value: number): Promise<void> => {
    patchPrefs({ dailyGoal: value })
    await window.authoros.settings.update({ dailyGoal: value })
  }

  const setDeadline = async (value: string): Promise<void> => {
    const updated = await window.authoros.projects.update(project.id, {
      deadline: value || null
    })
    if (updated) setActive(updated)
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Progressi — {project.title}</h2>

      {/* Oggi + obiettivo + streak (US-27.1/27.2) */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel/50 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">Oggi</div>
          <div className="mt-1 text-3xl font-bold text-cyan">
            {todayWords.toLocaleString('it-IT')}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full ${todayWords >= dailyGoal ? 'bg-green' : 'bg-cyan'}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            obiettivo
            <input
              className="w-20 rounded border border-line bg-bg/60 px-1 py-0.5 text-right text-xs outline-none focus:border-cyan"
              type="number"
              min={0}
              value={dailyGoal}
              onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
            />
            parole
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel/50 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">Streak</div>
          <div className="mt-1 text-3xl font-bold text-yellow">🔥 {streak}</div>
          <p className="mt-1 text-xs text-muted">
            giorn{streak === 1 ? 'o' : 'i'} consecutivi di scrittura
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-panel/50 p-4">
          <div className="text-xs uppercase tracking-wider text-muted">Totale progetto</div>
          <div className="mt-1 text-3xl font-bold">
            {totals ? totals.words.toLocaleString('it-IT') : '…'}
          </div>
          <p className="mt-1 text-xs text-muted">
            {target > 0 ? `di ${target.toLocaleString('it-IT')} obiettivo` : 'nessun obiettivo parole'}
          </p>
        </div>
      </div>

      {/* Storico 30 giorni (US-27.1/27.4) */}
      <section className="mt-4 rounded-2xl border border-line bg-panel/50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Ultimi 30 giorni
        </h3>
        <div className="mt-3 flex h-28 items-end gap-[3px]">
          {days.map((d) => (
            <div
              key={d.date}
              className="group relative flex-1"
              title={`${new Date(d.date).toLocaleDateString('it-IT')} · ${d.words.toLocaleString('it-IT')} parole`}
            >
              <div
                className={`w-full rounded-t ${
                  d.words <= 0
                    ? 'bg-white/5'
                    : d.words >= dailyGoal
                      ? 'bg-green/80'
                      : 'bg-cyan/70'
                }`}
                style={{ height: `${Math.max(3, (Math.max(0, d.words) / maxDay) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{new Date(days[0].date).toLocaleDateString('it-IT')}</span>
          <span>oggi</span>
        </div>
      </section>

      {/* Deadline e proiezione (US-27.3) */}
      <section className="mt-4 rounded-2xl border border-line bg-panel/50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Scadenza & ritmo
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            Consegna:
            <input
              type="date"
              className="rounded-lg border border-line bg-bg/60 px-2 py-1 text-sm outline-none focus:border-cyan"
              value={project.deadline?.slice(0, 10) ?? ''}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          {daysLeft !== null && <span className="text-muted">{daysLeft} giorni rimasti</span>}
        </div>
        {target > 0 && neededPerDay !== null ? (
          <p className="mt-2 text-sm">
            Mancano <strong>{remaining.toLocaleString('it-IT')}</strong> parole → servono{' '}
            <strong>{neededPerDay.toLocaleString('it-IT')}</strong> parole/giorno.{' '}
            {onTrack !== null &&
              (onTrack ? (
                <span className="text-green">✓ Sei in tabella (media 7gg: {Math.round(last7)}).</span>
              ) : (
                <span className="text-yellow">
                  ⚠ Sotto ritmo (media 7gg: {Math.round(last7)}).
                </span>
              ))}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Imposta obiettivo parole (in Libreria/onboarding) e una scadenza per vedere la proiezione.
          </p>
        )}
      </section>
    </div>
  )
}
