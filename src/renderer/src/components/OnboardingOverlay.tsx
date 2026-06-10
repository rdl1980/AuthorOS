import { useState } from 'react'
import { GENRES, suggestFramework } from '@shared/frameworks'
import { useLibrary } from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { useOnboarding } from '../store/useOnboarding'

const inputCls =
  'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

/**
 * Tour del primo avvio (Epic 25): benvenuto (US-25.1), primo progetto da
 * template di genere (US-25.2), progetto demo precaricato (US-25.3).
 */
export function OnboardingOverlay(): JSX.Element {
  const setVisible = useOnboarding((s) => s.setVisible)
  const setActive = useLibrary((s) => s.setActive)
  const goTo = useNav((s) => s.goTo)

  const [step, setStep] = useState<'welcome' | 'create'>('welcome')
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)

  const framework = suggestFramework(genre)

  const close = (): void => {
    setVisible(false)
    void window.authoros.settings.update({ onboardingDone: true })
  }

  // US-25.2 — template di genere: progetto + framework con beat + primo capitolo/scena.
  const createFirstBook = async (): Promise<void> => {
    if (!title.trim()) return
    setBusy(true)
    try {
      const parsedTarget = target.trim() === '' ? undefined : Number(target)
      const project = await window.authoros.projects.create({
        title: title.trim(),
        genre: genre || undefined,
        framework: framework ?? undefined,
        targetWordCount: Number.isFinite(parsedTarget) ? parsedTarget : undefined
      })
      if (framework) await window.authoros.structure.setFramework(project.id, framework)
      const chapter = await window.authoros.manuscript.chapterCreate(project.id, 'Capitolo 1')
      await window.authoros.manuscript.sceneCreate(project.id, chapter.id, 'Scena 1')
      setActive(project)
      goTo('writing')
      close()
    } finally {
      setBusy(false)
    }
  }

  // US-25.3 — progetto demo con contenuti di esempio in ogni modulo.
  const createDemo = async (): Promise<void> => {
    setBusy(true)
    try {
      const a = window.authoros
      const fw = 'Seven Point Story Structure'
      const project = await a.projects.create({
        title: 'Il Faro di Mezzanotte (demo)',
        genre: 'Giallo / Mystery',
        framework: fw,
        targetWordCount: 60000
      })
      const beats = await a.structure.setFramework(project.id, fw)

      const c1 = await a.manuscript.chapterCreate(project.id, "Capitolo 1 — L'arrivo")
      const s1 = await a.manuscript.sceneCreate(project.id, c1.id, 'La corriera')
      await a.manuscript.sceneUpdate(s1.id, {
        content:
          'La corriera lasciò Marta davanti al molo alle sei di sera, quando il paese aveva già ' +
          'chiuso le imposte. Il faro, in fondo alla scogliera, era spento da tre giorni.\n\n' +
          'Nessuno, al bar del porto, voleva spiegarle perché.'
      })
      const s2 = await a.manuscript.sceneCreate(project.id, c1.id, 'Il custode')
      await a.manuscript.sceneUpdate(s2.id, {
        content:
          'Elia non apriva la porta a nessuno da quando era sparita la barca di suo fratello. ' +
          'Ma quella sera, vedendo il registratore di Marta, fece un passo indietro e la lasciò entrare.'
      })
      await a.manuscript.noteCreate(
        project.id,
        { sceneId: s1.id },
        'Atmosfera: paese ostile, luce che cala. Il faro spento è la domanda del libro.'
      )
      if (beats.length) {
        await a.structure.link(beats[0].id, s1.id)
        await a.structure.link(beats[1].id, s2.id)
      }

      const marta = await a.characters.create(project.id, {
        name: 'Marta Renzi',
        role: 'Protagonista',
        summary: 'Giornalista di cronaca in fuga da un errore professionale.',
        traits: 'ostinata, ironica, insonne'
      })
      const elia = await a.characters.create(project.id, {
        name: 'Elia Marchetti',
        role: 'Comprimario',
        summary: 'Custode del faro da trent’anni. Sa più di quanto dica.',
        traits: 'taciturno, leale, ferito'
      })
      await a.characters.relAdd(project.id, marta.id, elia.id, 'vuole far parlare')
      await a.characters.arcUpdate(marta.id, {
        desire: 'Lo scoop che la riabiliti',
        need: 'Fidarsi di nuovo di qualcuno',
        fear: 'Sbagliare ancora una volta',
        lie: 'La verità vale qualunque prezzo'
      })

      const ev1 = await a.timeline.create(project.id, {
        title: 'Il faro si spegne',
        whenLabel: 'Tre giorni prima',
        dateValue: 1,
        location: 'Scogliera'
      })
      const ev2 = await a.timeline.create(project.id, {
        title: 'Marta arriva in paese',
        whenLabel: 'Sera del 12 ottobre',
        dateValue: 4,
        location: 'Molo'
      })
      await a.timeline.link(ev1.id, elia.id)
      await a.timeline.link(ev2.id, marta.id)

      await a.style.create(project.id, {
        name: 'Voce demo',
        tone: 'asciutto, sensoriale, frasi brevi',
        instructions: 'Prosa visiva, niente avverbi superflui, tensione costruita sui silenzi.'
      })

      setActive(project)
      goTo('writing')
      close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-3xl border border-line bg-panel p-8 shadow-2xl">
        {step === 'welcome' ? (
          <>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">
              Benvenuto in
            </div>
            <h1 className="mt-1 text-3xl font-bold">AuthorOS</h1>
            <p className="mt-2 text-muted">
              Scrivi il tuo libro più velocemente. Senza perdere la tua voce.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-muted">
              <li>✍️ <strong className="text-ink">Scrivi</strong> per capitoli e scene, con struttura narrativa e personaggi sempre a portata.</li>
              <li>✨ <strong className="text-ink">L'AI propone, tu decidi</strong>: ogni testo generato si accetta, modifica o rifiuta. Mai sovrascritto.</li>
              <li>📦 <strong className="text-ink">Importa ed esporta</strong> DOCX, PDF ed EPUB. Tutto resta sul tuo computer.</li>
            </ul>

            <div className="mt-6 space-y-2">
              <button
                className="w-full rounded-xl bg-cyan px-4 py-3 text-sm font-semibold text-bg hover:opacity-90"
                onClick={() => setStep('create')}
              >
                Crea il tuo primo libro
              </button>
              <button
                className="w-full rounded-xl border border-line px-4 py-3 text-sm hover:border-violet disabled:opacity-50"
                onClick={createDemo}
                disabled={busy}
              >
                {busy ? 'Preparo la demo…' : 'Esplora con un progetto demo'}
              </button>
              <button className="w-full px-4 py-2 text-xs text-muted hover:text-ink" onClick={close}>
                Salta per ora
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold">Il tuo primo libro</h2>
            <p className="mt-1 text-sm text-muted">
              Bastano un titolo e un genere: prepariamo struttura e primo capitolo per te.
            </p>

            <div className="mt-5 space-y-3">
              <input
                className={`${inputCls} w-full`}
                placeholder="Titolo (anche provvisorio)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <select className={`${inputCls} w-full`} value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">Genere…</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {framework && (
                <p className="text-xs text-violet">
                  Struttura consigliata: <strong>{framework}</strong> — i beat saranno già pronti.
                </p>
              )}
              <input
                className={`${inputCls} w-full`}
                placeholder="Obiettivo parole (opz., es. 80000)"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>

            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-cyan px-4 py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
                onClick={createFirstBook}
                disabled={busy || !title.trim()}
              >
                {busy ? 'Creo…' : 'Inizia a scrivere'}
              </button>
              <button
                className="rounded-xl border border-line px-4 py-3 text-sm text-muted hover:text-ink"
                onClick={() => setStep('welcome')}
              >
                Indietro
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
