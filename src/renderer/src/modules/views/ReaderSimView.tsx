import { useEffect, useState } from 'react'
import type { AssistKind } from '@shared/ai'
import type { Chapter } from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'
import { buildBookOverview, buildExcerpt } from '../../lib/bookPayload'

interface Persona {
  kind: AssistKind
  icon: string
  title: string
  desc: string
  us: string
}

const PERSONAS: Persona[] = [
  {
    kind: 'reader-genre',
    icon: '🛋️',
    title: 'Lettore di genere',
    desc: 'Un lettore forte del tuo genere: tensione, noia, voglia di girare pagina.',
    us: 'US-11.1'
  },
  {
    kind: 'reader-editor',
    icon: '🖋️',
    title: 'Editor',
    desc: 'Feedback professionale da acquisizione: prosa, voce, struttura.',
    us: 'US-11.2'
  },
  {
    kind: 'reader-agent',
    icon: '💼',
    title: 'Agente letterario',
    desc: 'Vendibilità, comparabili, posizionamento: lo rappresenterebbe?',
    us: 'US-11.3'
  },
  {
    kind: 'reader-booktoker',
    icon: '📱',
    title: 'Booktoker',
    desc: 'Potenziale social: momenti virali, hook, hashtag.',
    us: 'US-11.4'
  },
  {
    kind: 'reader-reviewer',
    icon: '⭐',
    title: 'Recensore Amazon',
    desc: 'La recensione che riceveresti: stelle, pro e contro percepiti.',
    us: 'US-11.5'
  }
]

/**
 * Reader Simulator (Epic 11): il manoscritto letto da 5 personas AI.
 * Feedback simulato, onesto per costruzione (i prompt chiedono critiche vere).
 */
export function ReaderSimView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapterId, setChapterId] = useState('')
  const [busy, setBusy] = useState<AssistKind | null>(null)
  const [active, setActive] = useState<AssistKind | null>(null)
  const [results, setResults] = useState<Partial<Record<AssistKind, string>>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setResults({})
    setActive(null)
    setChapterId('')
    if (project) void window.authoros.manuscript.chapters(project.id).then(setChapters)
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🪞</div>
        <h2 className="text-2xl font-semibold">Reader Simulator</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per far leggere il tuo testo alle
          personas.
        </p>
      </div>
    )
  }

  const run = async (kind: AssistKind): Promise<void> => {
    setBusy(kind)
    setActive(kind)
    setError(null)
    try {
      const [overview, excerpt] = await Promise.all([
        buildBookOverview(project),
        buildExcerpt(project, chapterId || undefined)
      ])
      if (!excerpt.trim()) {
        setError('Il manoscritto è vuoto: scrivi qualcosa prima di simulare un lettore.')
        return
      }
      const payload = `${overview}\n\nESTRATTO:\n${excerpt}`
      const res = await window.authoros.ai.assist(kind, payload)
      setResults((r) => ({ ...r, [kind]: res.text }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold">🪞 Reader Simulator — {project.title}</h2>
      <p className="mt-1 text-sm text-muted">
        Cinque lettori simulati leggono un estratto e ti dicono cosa funziona (e cosa no) prima che
        lo faccia il pubblico vero.
      </p>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-muted">Estratto da:</span>
        <select
          className="rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-sm outline-none focus:border-cyan"
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
        >
          <option value="">Inizio del libro</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-yellow/40 bg-yellow/10 p-3 text-xs text-yellow">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PERSONAS.map((p) => (
          <button
            key={p.kind}
            className={`rounded-2xl border p-3 text-center transition-colors disabled:opacity-50 ${
              active === p.kind ? 'border-cyan bg-cyan/10' : 'border-line bg-panel/50 hover:border-cyan/60'
            }`}
            title={`${p.desc} (${p.us})`}
            disabled={busy !== null}
            onClick={() => run(p.kind)}
          >
            <div className="text-2xl">{p.icon}</div>
            <div className="mt-1 text-xs font-semibold">
              {busy === p.kind ? 'Legge…' : p.title}
            </div>
          </button>
        ))}
      </div>

      {active && results[active] && (
        <section className="mt-4 rounded-2xl border border-line bg-panel/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {PERSONAS.find((p) => p.kind === active)?.icon}{' '}
            {PERSONAS.find((p) => p.kind === active)?.title} ha letto il tuo estratto:
          </h3>
          <pre className="whitespace-pre-wrap rounded-xl border border-line bg-bg/40 p-3 font-sans text-sm leading-relaxed">
            {results[active]}
          </pre>
        </section>
      )}
    </div>
  )
}
