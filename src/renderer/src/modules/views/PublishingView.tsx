import { useEffect, useState } from 'react'
import type { Chapter, ProjectStats } from '@shared/domain'
import type { ExportOptions } from '@shared/publishing'
import { useLibrary } from '../../store/useLibrary'

type Action = 'docx' | 'pdf' | 'epub' | 'import'

export function PublishingView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [busy, setBusy] = useState<Action | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Export Pro (Epic 31)
  const [proOpen, setProOpen] = useState(false)
  const [template, setTemplate] = useState<'standard' | 'shunn'>('standard')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [author, setAuthor] = useState('')
  const [copyright, setCopyright] = useState('')
  const [dedication, setDedication] = useState('')
  const [withCover, setWithCover] = useState(false)

  const reloadStats = async (): Promise<void> => {
    if (!project) return
    setStats(await window.authoros.manuscript.stats(project.id))
    setChapters(await window.authoros.manuscript.chapters(project.id))
  }

  useEffect(() => {
    setMessage(null)
    setExcluded(new Set())
    void reloadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">📦</div>
        <h2 className="text-2xl font-semibold">Publishing</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per importare o esportare.
        </p>
      </div>
    )
  }

  const buildOptions = (action: Exclude<Action, 'import'>): ExportOptions | undefined => {
    if (!proOpen) return undefined
    const included = chapters.filter((c) => !excluded.has(c.id)).map((c) => c.id)
    const fm =
      author.trim() || copyright.trim() || dedication.trim()
        ? {
            author: author.trim() || undefined,
            copyright: copyright.trim() || undefined,
            dedication: dedication.trim() || undefined
          }
        : undefined
    return {
      template: action === 'docx' ? template : undefined,
      chapterIds: excluded.size > 0 ? included : undefined,
      frontMatter: fm,
      pickCover: action === 'epub' ? withCover : undefined
    }
  }

  const runExport = async (action: Exclude<Action, 'import'>): Promise<void> => {
    setBusy(action)
    setMessage(null)
    try {
      const fn =
        action === 'docx'
          ? window.authoros.publishing.exportDocx
          : action === 'pdf'
            ? window.authoros.publishing.exportPdf
            : window.authoros.publishing.exportEpub
      const res = await fn(project.id, buildOptions(action))
      if (res.ok) setMessage({ ok: true, text: `Esportato: ${res.path}` })
      else if (res.error !== 'annullato') setMessage({ ok: false, text: `Errore: ${res.error}` })
    } finally {
      setBusy(null)
    }
  }

  const runImport = async (): Promise<void> => {
    setBusy('import')
    setMessage(null)
    try {
      const res = await window.authoros.publishing.importFile(project.id)
      if (res.ok) {
        const beats =
          res.beatsLinked !== undefined
            ? ` Scene associate automaticamente alla struttura: ${res.beatsLinked} beat coperti.`
            : ''
        setMessage({
          ok: true,
          text: `Importati ${res.chapters} capitoli, ${res.scenes} scene (${res.words?.toLocaleString('it-IT')} parole). Li trovi nel Workspace.${beats}`
        })
        await reloadStats()
      } else if (res.error !== 'annullato') {
        setMessage({ ok: false, text: `Errore: ${res.error}` })
      }
    } finally {
      setBusy(null)
    }
  }

  const exports: { action: Exclude<Action, 'import'>; icon: string; title: string; desc: string; us: string }[] = [
    { action: 'docx', icon: '📄', title: 'DOCX', desc: 'Per editor, agenzie e Word.', us: 'US-16.1' },
    { action: 'pdf', icon: '🖨️', title: 'PDF', desc: 'Bozze impaginate (A5) da stampare o condividere.', us: 'US-16.3' },
    { action: 'epub', icon: '📱', title: 'EPUB', desc: 'Ebook per lettori digitali.', us: 'US-16.2' }
  ]

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold">Publishing — {project.title}</h2>
      <p className="mt-1 text-muted">
        {stats
          ? `${stats.chapters} capitoli · ${stats.scenes} scene · ${stats.words.toLocaleString('it-IT')} parole`
          : 'Caricamento…'}
      </p>

      {message && (
        <div
          className={`mt-4 rounded-2xl border p-3 text-sm ${
            message.ok ? 'border-green/40 bg-green/5 text-green' : 'border-red/40 bg-red/5 text-red'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Export (Epic 16) */}
      <section className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">Esporta</h3>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {exports.map((e) => (
            <button
              key={e.action}
              className="rounded-2xl border border-line bg-panel/50 p-4 text-left hover:border-cyan disabled:opacity-50"
              onClick={() => runExport(e.action)}
              disabled={busy !== null || (stats !== null && stats.scenes === 0)}
              title={e.us}
            >
              <div className="text-2xl">{e.icon}</div>
              <div className="mt-1 font-semibold">
                {busy === e.action ? 'Esporto…' : e.title}
              </div>
              <p className="mt-1 text-xs text-muted">{e.desc}</p>
            </button>
          ))}
        </div>
        {stats !== null && stats.scenes === 0 && (
          <p className="mt-2 text-xs text-muted">
            Il manoscritto è vuoto: scrivi (o importa) qualcosa prima di esportare.
          </p>
        )}

        {/* Export Pro (Epic 31) */}
        <button
          className={`mt-3 rounded-lg border px-3 py-1.5 text-xs ${proOpen ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line hover:border-cyan'}`}
          onClick={() => setProOpen((v) => !v)}
        >
          {proOpen ? '▾' : '▸'} Opzioni professionali (formato manoscritto, front matter, estratti)
        </button>
        {proOpen && (
          <div className="mt-2 space-y-3 rounded-2xl border border-line bg-panel/50 p-4 text-sm">
            {/* US-31.1: template DOCX */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Formato DOCX:</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  checked={template === 'standard'}
                  onChange={() => setTemplate('standard')}
                />
                Libro (Georgia, corsivi)
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  checked={template === 'shunn'}
                  onChange={() => setTemplate('shunn')}
                />
                Manoscritto standard — Shunn (Times 12, doppia interlinea, per agenti/editor)
              </label>
            </div>

            {/* US-31.2: front matter */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className="rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-xs outline-none focus:border-cyan"
                placeholder="Autore (frontespizio)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
              <input
                className="rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-xs outline-none focus:border-cyan"
                placeholder="Copyright, es. © 2026 Nome"
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
              />
              <input
                className="rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-xs outline-none focus:border-cyan"
                placeholder="Dedica"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
              />
            </div>

            {/* US-31.3: copertina EPUB */}
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={withCover}
                onChange={(e) => setWithCover(e.target.checked)}
              />
              EPUB: scegli un&apos;immagine di copertina (JPG/PNG) prima dell&apos;export
            </label>

            {/* US-31.4: capitoli selezionati */}
            {chapters.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-muted">
                  Capitoli da esportare ({chapters.length - excluded.size}/{chapters.length}) — togli
                  la spunta per condividere solo un estratto:
                </p>
                <div className="flex max-h-32 flex-wrap gap-x-4 gap-y-1 overflow-y-auto">
                  {chapters.map((c) => (
                    <label key={c.id} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={!excluded.has(c.id)}
                        onChange={(e) =>
                          setExcluded((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.delete(c.id)
                            else next.add(c.id)
                            return next
                          })
                        }
                      />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Import (Epic 21) */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">Importa</h3>
        <div className="mt-2 rounded-2xl border border-line bg-panel/50 p-4">
          <p className="text-sm text-muted">
            Porta in AuthorOS un manoscritto esistente: <strong>DOCX</strong>, <strong>Markdown</strong> o{' '}
            <strong>TXT</strong>. Capitoli (<code>#</code> o Titolo 1) e scene (<code>##</code>,{' '}
            <code>***</code>) vengono riconosciuti automaticamente e aggiunti al progetto. Se hai già
            scelto un framework narrativo, le scene vengono anche <strong>associate ai beat</strong> in
            base alla posizione nel manoscritto (puoi ritoccare tutto nella vista Struttura).
          </p>
          <button
            className="mt-3 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
            onClick={runImport}
            disabled={busy !== null}
          >
            {busy === 'import' ? 'Importo…' : 'Importa manoscritto…'}
          </button>
        </div>
      </section>
    </div>
  )
}
