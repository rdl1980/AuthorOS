import { useEffect, useState } from 'react'
import type { ProjectStats } from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'

type Action = 'docx' | 'pdf' | 'epub' | 'import'

export function PublishingView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [busy, setBusy] = useState<Action | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const reloadStats = async (): Promise<void> => {
    if (!project) return
    setStats(await window.authoros.manuscript.stats(project.id))
  }

  useEffect(() => {
    setMessage(null)
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
      const res = await fn(project.id)
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
        setMessage({
          ok: true,
          text: `Importati ${res.chapters} capitoli, ${res.scenes} scene (${res.words?.toLocaleString('it-IT')} parole). Li trovi nel Workspace.`
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
      </section>

      {/* Import (Epic 21) */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">Importa</h3>
        <div className="mt-2 rounded-2xl border border-line bg-panel/50 p-4">
          <p className="text-sm text-muted">
            Porta in AuthorOS un manoscritto esistente: <strong>DOCX</strong>, <strong>Markdown</strong> o{' '}
            <strong>TXT</strong>. Capitoli (<code>#</code> o Titolo 1) e scene (<code>##</code>,{' '}
            <code>***</code>) vengono riconosciuti automaticamente e aggiunti al progetto.
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
