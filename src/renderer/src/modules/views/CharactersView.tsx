import { useEffect, useState } from 'react'
import type { AIResult } from '@shared/ai'
import type { ArcStep, Chapter, Character, CharacterArc, Relationship } from '@shared/domain'
import { useLibrary } from '../../store/useLibrary'
import { useUsageMeter } from '../../store/useUsageMeter'
import { AiInteractionShell } from '../../components/AiInteractionShell'

const ROLES = [
  'Protagonista',
  'Antagonista',
  'Deuteragonista',
  'Mentore',
  'Spalla',
  'Interesse amoroso',
  'Comprimario',
  'Altro'
]

const inputCls =
  'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'

/** Estrae i campi "Etichetta: valore" dal profilo generato dall'AI (US-6.5). */
function parseProfile(text: string): Partial<Record<'name' | 'role' | 'summary' | 'appearance' | 'traits', string>> {
  const map: Record<string, 'name' | 'role' | 'summary' | 'appearance' | 'traits'> = {
    nome: 'name',
    ruolo: 'role',
    sintesi: 'summary',
    aspetto: 'appearance',
    tratti: 'traits'
  }
  const out: Partial<Record<'name' | 'role' | 'summary' | 'appearance' | 'traits', string>> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[-*]?\s*([A-Za-zÀ-ù]+)\s*:\s*(.+)$/)
    if (!m) continue
    const key = map[m[1].toLowerCase()]
    if (key && !out[key]) out[key] = m[2].trim()
  }
  return out
}

export function CharactersView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const track = useUsageMeter((s) => s.track)

  const [list, setList] = useState<Character[]>([])
  const [relations, setRelations] = useState<Relationship[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // form nuovo personaggio + generazione AI
  const [newName, setNewName] = useState('')
  const [aiDesc, setAiDesc] = useState('')
  const [aiProfile, setAiProfile] = useState<AIResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [aiOutput, setAiOutput] = useState<{ title: string; text: string } | null>(null)

  // dettaglio
  const [arc, setArc] = useState<CharacterArc | null>(null)
  const [steps, setSteps] = useState<ArcStep[]>([])
  const [stepChapter, setStepChapter] = useState('')
  const [stepDesc, setStepDesc] = useState('')
  const [relTo, setRelTo] = useState('')
  const [relLabel, setRelLabel] = useState('')

  const selected = list.find((c) => c.id === selectedId) ?? null

  const reload = async (): Promise<void> => {
    if (!project) return
    const [cs, rs, chs] = await Promise.all([
      window.authoros.characters.list(project.id),
      window.authoros.characters.relationships(project.id),
      window.authoros.manuscript.chapters(project.id)
    ])
    setList(cs)
    setRelations(rs)
    setChapters(chs)
  }

  useEffect(() => {
    setSelectedId(null)
    setAiOutput(null)
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  useEffect(() => {
    setAiOutput(null)
    if (!selectedId) {
      setArc(null)
      setSteps([])
      return
    }
    void (async () => {
      const a = await window.authoros.characters.arc(selectedId)
      setArc(a)
      setSteps(await window.authoros.characters.arcSteps(a.id))
    })()
  }, [selectedId])

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">🎭</div>
        <h2 className="text-2xl font-semibold">Personaggi</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per gestire la Character Bible.
        </p>
      </div>
    )
  }

  // --- azioni ---------------------------------------------------------------

  const create = async (): Promise<void> => {
    if (!newName.trim()) return
    const c = await window.authoros.characters.create(project.id, { name: newName.trim() })
    setNewName('')
    await reload()
    setSelectedId(c.id)
  }

  const generateProfile = async (): Promise<void> => {
    if (!aiDesc.trim()) return
    setBusy('profile')
    try {
      const res = await window.authoros.ai.assist('character-profile', aiDesc)
      track(res.usage)
      setAiProfile(res)
    } finally {
      setBusy(null)
    }
  }

  const acceptProfile = async (text: string): Promise<void> => {
    const fields = parseProfile(text)
    const c = await window.authoros.characters.create(project.id, {
      name: fields.name ?? aiDesc.slice(0, 40),
      role: fields.role,
      summary: fields.summary ?? text,
      appearance: fields.appearance,
      traits: fields.traits
    })
    setAiProfile(null)
    setAiDesc('')
    await reload()
    setSelectedId(c.id)
  }

  const patchSelected = (patch: Parameters<typeof window.authoros.characters.update>[1]): void => {
    if (!selected) return
    const id = selected.id
    setList((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    void window.authoros.characters.update(id, patch)
  }

  const patchArc = (patch: Parameters<typeof window.authoros.characters.arcUpdate>[1]): void => {
    if (!selected || !arc) return
    setArc({ ...arc, ...patch })
    void window.authoros.characters.arcUpdate(selected.id, patch)
  }

  const removeSelected = async (): Promise<void> => {
    if (!selected) return
    await window.authoros.characters.remove(selected.id)
    setSelectedId(null)
    await reload()
  }

  const addStep = async (): Promise<void> => {
    if (!arc || !stepChapter || !stepDesc.trim()) return
    await window.authoros.characters.arcStepAdd(arc.id, stepChapter, stepDesc)
    setStepDesc('')
    setSteps(await window.authoros.characters.arcSteps(arc.id))
  }

  const removeStep = async (id: string): Promise<void> => {
    if (!arc) return
    await window.authoros.characters.arcStepRemove(id)
    setSteps(await window.authoros.characters.arcSteps(arc.id))
  }

  const addRelation = async (): Promise<void> => {
    if (!selected || !relTo || !relLabel.trim()) return
    await window.authoros.characters.relAdd(project.id, selected.id, relTo, relLabel)
    setRelLabel('')
    setRelTo('')
    setRelations(await window.authoros.characters.relationships(project.id))
  }

  const removeRelation = async (id: string): Promise<void> => {
    await window.authoros.characters.relRemove(id)
    setRelations(await window.authoros.characters.relationships(project.id))
  }

  const runAssist = async (kind: 'character-conflicts' | 'coherence-check'): Promise<void> => {
    if (!selected) return
    setBusy(kind)
    setAiOutput(null)
    try {
      const payload =
        `Nome: ${selected.name}\nRuolo: ${selected.role}\nSintesi: ${selected.summary}\n` +
        `Aspetto: ${selected.appearance}\nTratti: ${selected.traits}\n` +
        (arc
          ? `Arco — desiderio: ${arc.desire}; bisogno: ${arc.need}; paura: ${arc.fear}; ` +
            `ferita: ${arc.wound}; menzogna: ${arc.lie}; trasformazione: ${arc.transformation}`
          : '')
      const res = await window.authoros.ai.assist(kind, payload)
      track(res.usage)
      setAiOutput({
        title: kind === 'character-conflicts' ? 'Conflitti e obiettivi suggeriti' : 'Verifica coerenza',
        text: res.text
      })
    } finally {
      setBusy(null)
    }
  }

  const nameOf = (id: string): string => list.find((c) => c.id === id)?.name ?? '—'
  const selectedRelations = relations.filter(
    (r) => r.fromId === selected?.id || r.toId === selected?.id
  )

  // --- render -----------------------------------------------------------------

  return (
    <div className="flex h-full gap-4">
      {/* Colonna elenco */}
      <aside className="flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-panel/40 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Cast · {list.length}
        </div>
        <div className="flex gap-2">
          <input
            className={`${inputCls} min-w-0 flex-1`}
            placeholder="Nome personaggio"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button
            className="rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
            onClick={create}
            disabled={!newName.trim()}
          >
            +
          </button>
        </div>

        <details className="mt-2 rounded-lg border border-line bg-bg/40 p-2">
          <summary className="cursor-pointer text-xs text-cyan">✨ Genera da descrizione (AI)</summary>
          <textarea
            className={`${inputCls} mt-2 h-20 w-full resize-y`}
            placeholder="Es. una ladra gentiluomo cresciuta nei bassifondi…"
            value={aiDesc}
            onChange={(e) => setAiDesc(e.target.value)}
          />
          <button
            className="mt-1 w-full rounded-md border border-line px-2 py-1 text-xs hover:border-cyan disabled:opacity-50"
            onClick={generateProfile}
            disabled={busy === 'profile' || !aiDesc.trim()}
          >
            {busy === 'profile' ? 'Genero…' : 'Genera profilo'}
          </button>
        </details>

        <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
          {list.length === 0 && <p className="text-xs text-muted">Nessun personaggio.</p>}
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                c.id === selectedId ? 'bg-cyan/15 text-ink' : 'text-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              <div className="font-semibold">{c.name}</div>
              {c.role && <div className="text-xs text-violet">{c.role}</div>}
            </button>
          ))}
        </div>
      </aside>

      {/* Colonna dettaglio */}
      <section className="min-w-0 flex-1 overflow-y-auto">
        {aiProfile && (
          <div className="mb-4">
            <AiInteractionShell
              draft={aiProfile.text}
              onAccept={acceptProfile}
              onReject={() => setAiProfile(null)}
            />
            <p className="mt-1 text-xs text-muted">
              Accettando, la scheda viene creata con i campi riconosciuti (puoi modificarla dopo).
            </p>
          </div>
        )}

        {!selected ? (
          <div className="flex h-full items-center justify-center text-muted">
            Seleziona o crea un personaggio.
          </div>
        ) : (
          <div className="max-w-2xl space-y-4">
            {/* Scheda (US-6.1) */}
            <div className="rounded-2xl border border-line bg-panel/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg bg-transparent px-2 py-1 text-xl font-semibold outline-none hover:bg-white/5 focus:bg-white/10"
                  value={selected.name}
                  onChange={(e) => patchSelected({ name: e.target.value })}
                />
                <select
                  className={inputCls}
                  value={selected.role}
                  onChange={(e) => patchSelected({ role: e.target.value })}
                >
                  <option value="">Ruolo…</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:border-red hover:text-red"
                  onClick={removeSelected}
                >
                  Elimina
                </button>
              </div>
              <textarea
                className={`${inputCls} mt-3 h-20 w-full resize-y`}
                placeholder="Sintesi / biografia breve…"
                value={selected.summary}
                onChange={(e) => patchSelected({ summary: e.target.value })}
              />
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <textarea
                  className={`${inputCls} h-16 resize-y`}
                  placeholder="Aspetto fisico…"
                  value={selected.appearance}
                  onChange={(e) => patchSelected({ appearance: e.target.value })}
                />
                <textarea
                  className={`${inputCls} h-16 resize-y`}
                  placeholder="Tratti caratteriali…"
                  value={selected.traits}
                  onChange={(e) => patchSelected({ traits: e.target.value })}
                />
              </div>
            </div>

            {/* Arco di trasformazione (US-5.1/5.2) */}
            {arc && (
              <div className="rounded-2xl border border-line bg-panel/50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
                  Arco di trasformazione
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['desire', 'Desiderio (cosa vuole)'],
                      ['need', 'Bisogno (cosa gli serve davvero)'],
                      ['fear', 'Paura'],
                      ['wound', 'Ferita'],
                      ['lie', 'Menzogna interiore'],
                      ['transformation', 'Trasformazione (punto di arrivo)']
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-xs text-muted">
                      {label}
                      <textarea
                        className={`${inputCls} mt-1 h-14 w-full resize-y`}
                        value={arc[key]}
                        onChange={(e) => patchArc({ [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>

                {/* Tappe per capitolo (US-5.3) */}
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Progressione nei capitoli
                  </h4>
                  {steps.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {steps.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm">
                          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-violet">
                            {chapters.find((c) => c.id === s.chapterId)?.title ?? 'Capitolo'}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-muted">{s.description}</span>
                          <button className="text-xs text-muted hover:text-red" onClick={() => removeStep(s.id)}>
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex gap-2">
                    <select
                      className={inputCls}
                      value={stepChapter}
                      onChange={(e) => setStepChapter(e.target.value)}
                    >
                      <option value="">Capitolo…</option>
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <input
                      className={`${inputCls} min-w-0 flex-1`}
                      placeholder="Cosa cambia qui per il personaggio…"
                      value={stepDesc}
                      onChange={(e) => setStepDesc(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addStep()}
                    />
                    <button
                      className="rounded-lg border border-line px-3 py-1 text-xs hover:border-cyan disabled:opacity-50"
                      onClick={addStep}
                      disabled={!stepChapter || !stepDesc.trim()}
                    >
                      Aggiungi
                    </button>
                  </div>
                  {chapters.length === 0 && (
                    <p className="mt-1 text-xs text-muted">
                      Crea capitoli nel Workspace per collegare la progressione dell'arco.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Relazioni (US-6.2) */}
            <div className="rounded-2xl border border-line bg-panel/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">Relazioni</h3>
              {selectedRelations.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {selectedRelations.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-sm">
                      <span>
                        <strong>{nameOf(r.fromId)}</strong>{' '}
                        <span className="text-violet">{r.label || '→'}</span>{' '}
                        <strong>{nameOf(r.toId)}</strong>
                      </span>
                      <button
                        className="ml-auto text-xs text-muted hover:text-red"
                        onClick={() => removeRelation(r.id)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className={`${inputCls} w-40`}
                  placeholder="es. ama, odia, mentore di…"
                  value={relLabel}
                  onChange={(e) => setRelLabel(e.target.value)}
                />
                <select className={inputCls} value={relTo} onChange={(e) => setRelTo(e.target.value)}>
                  <option value="">verso…</option>
                  {list
                    .filter((c) => c.id !== selected.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <button
                  className="rounded-lg border border-line px-3 py-1 text-xs hover:border-cyan disabled:opacity-50"
                  onClick={addRelation}
                  disabled={!relTo || !relLabel.trim()}
                >
                  Collega
                </button>
              </div>
            </div>

            {/* Azioni AI (US-5.5, US-6.4/5.4) */}
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-cyan disabled:opacity-50"
                onClick={() => runAssist('character-conflicts')}
                disabled={busy !== null}
              >
                {busy === 'character-conflicts' ? 'Genero…' : '✨ Suggerisci conflitti e obiettivi'}
              </button>
              <button
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-yellow disabled:opacity-50"
                onClick={() => runAssist('coherence-check')}
                disabled={busy !== null}
              >
                {busy === 'coherence-check' ? 'Verifico…' : '🔍 Verifica coerenza (AI)'}
              </button>
            </div>

            {aiOutput && (
              <div className="rounded-2xl border border-violet/40 bg-violet/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet">
                    {aiOutput.title}
                  </span>
                  <button className="text-xs text-muted hover:text-ink" onClick={() => setAiOutput(null)}>
                    Chiudi
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink/90">{aiOutput.text}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
