import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Chapter,
  Character,
  Note,
  ProjectStats,
  Scene,
  SceneStatus,
  WorldElement
} from '@shared/domain'
import { countWords } from '@shared/text'
import { useLibrary } from '../../store/useLibrary'
import { useWorkspace } from '../../store/useWorkspace'
import { ChapterTree } from './workspace/ChapterTree'
import { SceneEditor } from './workspace/SceneEditor'
import { NotesPanel } from './workspace/NotesPanel'
import { SceneMetaBar } from './workspace/SceneMetaBar'
import { SceneBoard } from './workspace/SceneBoard'
import { OutlineTable } from './workspace/OutlineTable'

type ViewMode = 'editor' | 'board' | 'outline'

const EMPTY_STATS: ProjectStats = { words: 0, scenes: 0, chapters: 0 }

export function WritingWorkspaceView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const {
    selectedSceneId,
    focusMode,
    notesOpen,
    typewriter,
    select,
    toggleFocus,
    toggleNotes,
    toggleTypewriter
  } = useWorkspace()

  // Trova & sostituisci (US-26.1)
  const [findOpen, setFindOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [findScope, setFindScope] = useState<'scene' | 'project'>('project')
  const [findMessage, setFindMessage] = useState<string | null>(null)

  // Sprint di scrittura (US-26.4)
  const [sprint, setSprint] = useState<{ endsAt: number; startWords: number } | null>(null)
  const [sprintDone, setSprintDone] = useState<number | null>(null)
  const [, forceTick] = useState(0)

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [stats, setStats] = useState<ProjectStats>(EMPTY_STATS)
  const [notes, setNotes] = useState<Note[]>([])
  const [saving, setSaving] = useState(false)

  // Scene Board & Metadati (Epic 28)
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [charList, setCharList] = useState<Character[]>([])
  const [places, setPlaces] = useState<WorldElement[]>([])
  const [sceneCharMap, setSceneCharMap] = useState<Map<string, string[]>>(new Map())
  const [filterChar, setFilterChar] = useState('')
  const [filterPlace, setFilterPlace] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | SceneStatus>('')

  const ms = window.authoros.manuscript
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProjectRef = useRef<string | null | undefined>(undefined)

  const reloadTree = useCallback(async () => {
    if (!project) return
    const [chs, scs, st] = await Promise.all([
      ms.chapters(project.id),
      ms.scenes(project.id),
      ms.stats(project.id)
    ])
    setChapters(chs)
    setScenes(scs)
    setStats(st)
  }, [project, ms])

  // Metadati Epic 28: cast, luoghi e presenze personaggio↔scena.
  const reloadMeta = useCallback(async () => {
    if (!project) return
    const [chars, pls, links] = await Promise.all([
      window.authoros.characters.list(project.id),
      window.authoros.world.list(project.id, 'place'),
      ms.sceneChars(project.id)
    ])
    setCharList(chars)
    setPlaces(pls)
    const map = new Map<string, string[]>()
    for (const l of links) map.set(l.sceneId, [...(map.get(l.sceneId) ?? []), l.characterId])
    setSceneCharMap(map)
  }, [project, ms])

  // Carica all'apertura/cambio progetto. La selezione si azzera solo se il
  // progetto è cambiato davvero (non al mount: la ricerca può pre-selezionare).
  useEffect(() => {
    const pid = project?.id ?? null
    if (lastProjectRef.current !== undefined && lastProjectRef.current !== pid) {
      select(null)
      setNotes([])
    }
    lastProjectRef.current = pid
    void reloadTree()
    void reloadMeta()
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Note della scena selezionata.
  useEffect(() => {
    if (!project || !selectedSceneId) {
      setNotes([])
      return
    }
    void ms.notes(project.id, { sceneId: selectedSceneId }).then(setNotes)
  }, [project, selectedSceneId, ms])

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) ?? null

  // Tick del countdown sprint + chiusura automatica (US-26.4)
  useEffect(() => {
    if (!sprint) return
    const t = setInterval(() => {
      if (Date.now() >= sprint.endsAt) {
        setSprintDone(stats.words - sprint.startWords)
        setSprint(null)
      } else {
        forceTick((n) => n + 1)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [sprint, stats.words])

  const startSprint = (minutes: number): void => {
    setSprintDone(null)
    setSprint({ endsAt: Date.now() + minutes * 60000, startWords: stats.words })
  }

  // US-26.1: sostituzione con ricarica forzata della scena aperta
  const runReplace = async (): Promise<void> => {
    if (!project || !findText) return
    const res = await ms.replace(project.id, findText, replaceText, {
      sceneId: findScope === 'scene' ? (selectedSceneId ?? undefined) : undefined,
      matchCase
    })
    setFindMessage(
      res.occurrences === 0
        ? 'Nessuna occorrenza trovata.'
        : `${res.occurrences} sostituzioni in ${res.scenes} scen${res.scenes === 1 ? 'a' : 'e'}.`
    )
    const current = selectedSceneId
    await reloadTree()
    if (current && res.occurrences > 0) {
      // rimonta l'editor con il contenuto aggiornato
      select(null)
      setTimeout(() => select(current), 0)
    }
  }

  // --- mutazioni capitoli/scene ------------------------------------------

  const addChapter = async (): Promise<void> => {
    if (!project) return
    await ms.chapterCreate(project.id, 'Nuovo capitolo')
    await reloadTree()
  }

  const addScene = async (chapterId: string): Promise<void> => {
    if (!project) return
    const scene = await ms.sceneCreate(project.id, chapterId, 'Nuova scena')
    await reloadTree()
    select(scene.id)
  }

  const renameChapter = (id: string, title: string): void => {
    setChapters((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)))
    void ms.chapterRename(id, title)
  }

  const deleteChapter = async (id: string): Promise<void> => {
    await ms.chapterDelete(id)
    if (selectedScene && selectedScene.chapterId === id) select(null)
    await reloadTree()
  }

  const deleteScene = async (id: string): Promise<void> => {
    await ms.sceneDelete(id)
    if (selectedSceneId === id) select(null)
    await reloadTree()
  }

  const moveChapter = async (id: string, dir: -1 | 1): Promise<void> => {
    if (!project) return
    const ids = chapters.map((c) => c.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await ms.chaptersReorder(project.id, ids)
    await reloadTree()
  }

  const moveScene = async (sceneId: string, dir: -1 | 1): Promise<void> => {
    const scene = scenes.find((s) => s.id === sceneId)
    if (!scene) return
    const ids = scenes.filter((s) => s.chapterId === scene.chapterId).map((s) => s.id)
    const i = ids.indexOf(sceneId)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await ms.scenesReorder(scene.chapterId, ids)
    await reloadTree()
  }

  const dropScene = async (sceneId: string, toChapterId: string, toIndex: number): Promise<void> => {
    await ms.sceneMove(sceneId, toChapterId, toIndex)
    await reloadTree()
  }

  // --- salvataggio scena (debounced) -------------------------------------

  const onSceneChange = (patch: { title?: string; content?: string }): void => {
    if (!selectedScene) return
    const id = selectedScene.id
    // aggiornamento ottimistico locale (conteggio parole nel tree)
    setScenes((ss) =>
      ss.map((s) =>
        s.id === id
          ? {
              ...s,
              title: patch.title ?? s.title,
              content: patch.content ?? s.content,
              wordCount: patch.content !== undefined ? countWords(patch.content) : s.wordCount
            }
          : s
      )
    )
    setSaving(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await ms.sceneUpdate(id, patch)
      // Salvataggio riuscito: la bozza di emergenza non serve più (US-30.4).
      try {
        localStorage.removeItem(`authoros:draft:${id}`)
      } catch {
        /* noop */
      }
      if (project) setStats(await ms.stats(project.id))
      setSaving(false)
    }, 600)
  }

  // --- metadati scena (US-28.1) --------------------------------------------

  const pendingMeta = useRef(
    new Map<string, { pov?: string; locationId?: string | null; synopsis?: string; status?: SceneStatus }>()
  )
  const patchSceneMeta = (
    sceneId: string,
    patch: { pov?: string; locationId?: string | null; synopsis?: string; status?: SceneStatus }
  ): void => {
    setScenes((ss) => ss.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)))
    pendingMeta.current.set(sceneId, { ...pendingMeta.current.get(sceneId), ...patch })
    if (metaTimer.current) clearTimeout(metaTimer.current)
    metaTimer.current = setTimeout(() => {
      const batch = [...pendingMeta.current.entries()]
      pendingMeta.current.clear()
      for (const [id, p] of batch) void ms.sceneUpdate(id, p)
    }, 500)
  }

  const linkChar = async (sceneId: string, characterId: string): Promise<void> => {
    await ms.sceneCharLink(sceneId, characterId)
    await reloadMeta()
  }
  const unlinkChar = async (sceneId: string, characterId: string): Promise<void> => {
    await ms.sceneCharUnlink(sceneId, characterId)
    await reloadMeta()
  }

  // Filtri bacheca/outline (US-28.4)
  const visibleScenes = scenes.filter((s) => {
    if (filterStatus && s.status !== filterStatus) return false
    if (filterPlace && s.locationId !== filterPlace) return false
    if (filterChar && !(sceneCharMap.get(s.id) ?? []).includes(filterChar)) return false
    return true
  })
  const filtersActive = Boolean(filterChar || filterPlace || filterStatus)

  const openSceneInEditor = (sceneId: string): void => {
    select(sceneId)
    setViewMode('editor')
  }

  // --- note ---------------------------------------------------------------

  const reloadNotes = async (): Promise<void> => {
    if (!project || !selectedSceneId) return
    setNotes(await ms.notes(project.id, { sceneId: selectedSceneId }))
  }
  const addNote = async (content: string): Promise<void> => {
    if (!project || !selectedSceneId) return
    await ms.noteCreate(project.id, { sceneId: selectedSceneId }, content)
    await reloadNotes()
  }
  const updateNote = async (id: string, content: string): Promise<void> => {
    await ms.noteUpdate(id, content)
    await reloadNotes()
  }
  const deleteNote = async (id: string): Promise<void> => {
    await ms.noteDelete(id)
    await reloadNotes()
  }

  // --- render -------------------------------------------------------------

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-3 text-4xl">📖</div>
        <h2 className="text-2xl font-semibold">Nessun progetto aperto</h2>
        <p className="mt-2 max-w-md text-muted">
          Apri un progetto dalla <strong>Libreria</strong> per iniziare a scrivere.
        </p>
      </div>
    )
  }

  const target = project.targetWordCount ?? 0
  const pct = target > 0 ? Math.min(100, Math.round((stats.words / target) * 100)) : 0

  return (
    <div className="flex h-full flex-col">
      {/* Header progetto */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{project.title}</h2>
        <div className="text-sm text-muted">
          {stats.words.toLocaleString('it-IT')}
          {target > 0 ? ` / ${target.toLocaleString('it-IT')}` : ''} parole · {stats.chapters} cap · {stats.scenes} scene
        </div>
        {target > 0 && (
          <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-green" style={{ width: `${pct}%` }} />
          </div>
        )}
        {/* Sprint (US-26.4) */}
        {sprint ? (
          <span className="rounded-full bg-cyan/15 px-3 py-1 text-xs text-cyan">
            ⏱ {Math.max(0, Math.floor((sprint.endsAt - Date.now()) / 60000))}:
            {String(Math.max(0, Math.floor(((sprint.endsAt - Date.now()) % 60000) / 1000))).padStart(2, '0')}{' '}
            · +{Math.max(0, stats.words - sprint.startWords)} parole
            <button className="ml-2 text-muted hover:text-ink" onClick={() => setSprint(null)}>✕</button>
          </span>
        ) : sprintDone !== null ? (
          <span className="rounded-full bg-green/15 px-3 py-1 text-xs text-green">
            🏁 Sprint finito: +{Math.max(0, sprintDone)} parole
            <button className="ml-2 text-muted hover:text-ink" onClick={() => setSprintDone(null)}>✕</button>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted">
            Sprint:
            <button className="rounded-md border border-line px-2 py-0.5 hover:border-cyan" onClick={() => startSprint(15)}>15′</button>
            <button className="rounded-md border border-line px-2 py-0.5 hover:border-cyan" onClick={() => startSprint(25)}>25′</button>
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {/* Switcher vista: editor / bacheca / outline (US-28.2, US-28.3) */}
          <span className="flex overflow-hidden rounded-md border border-line text-xs">
            {(
              [
                ['editor', '✍️', 'Editor'],
                ['board', '🗂️', 'Bacheca delle scene'],
                ['outline', '📋', 'Outline']
              ] as [ViewMode, string, string][]
            ).map(([mode, icon, label]) => (
              <button
                key={mode}
                className={`px-3 py-1 ${viewMode === mode ? 'bg-cyan/15 text-cyan' : 'hover:text-cyan'}`}
                title={label}
                onClick={() => setViewMode(mode)}
              >
                {icon}
              </button>
            ))}
          </span>
          <button
            className={`rounded-md border px-3 py-1 text-xs ${findOpen ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line hover:border-cyan'}`}
            onClick={() => setFindOpen((v) => !v)}
            title="Trova e sostituisci (US-26.1)"
          >
            🔍
          </button>
          <button
            className={`rounded-md border px-3 py-1 text-xs ${typewriter ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line hover:border-cyan'}`}
            onClick={toggleTypewriter}
            title="Typewriter mode: riga corrente sempre centrata (US-26.3)"
          >
            ⌨
          </button>
          <button
            className="rounded-md border border-line px-3 py-1 text-xs hover:border-cyan"
            onClick={toggleNotes}
          >
            {notesOpen ? 'Nascondi note' : 'Note'}
          </button>
          <button
            className="rounded-md border border-line px-3 py-1 text-xs hover:border-cyan"
            onClick={toggleFocus}
          >
            {focusMode ? 'Esci da Focus' : 'Focus'}
          </button>
        </div>
      </div>

      {/* Pannello trova & sostituisci (US-26.1) */}
      {findOpen && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel/50 p-3">
          <input
            className="min-w-[160px] flex-1 rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-sm outline-none focus:border-cyan"
            placeholder="Trova…"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runReplace()}
          />
          <input
            className="min-w-[160px] flex-1 rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-sm outline-none focus:border-cyan"
            placeholder="Sostituisci con…"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runReplace()}
          />
          <select
            className="rounded-lg border border-line bg-bg/60 px-2 py-1.5 text-xs outline-none focus:border-cyan"
            value={findScope}
            onChange={(e) => setFindScope(e.target.value as 'scene' | 'project')}
          >
            <option value="project">Tutto il progetto</option>
            <option value="scene" disabled={!selectedSceneId}>
              Scena corrente
            </option>
          </select>
          <label className="flex items-center gap-1 text-xs text-muted">
            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
            Maiuscole
          </label>
          <button
            className="rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50"
            onClick={runReplace}
            disabled={!findText}
          >
            Sostituisci tutto
          </button>
          {findMessage && <span className="text-xs text-muted">{findMessage}</span>}
        </div>
      )}

      {/* Filtri bacheca/outline (US-28.4) */}
      {viewMode !== 'editor' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel/50 p-2 text-xs">
          <span className="text-muted">Filtra:</span>
          <select
            className="rounded-md border border-line bg-bg/60 px-2 py-1 outline-none focus:border-cyan"
            value={filterChar}
            onChange={(e) => setFilterChar(e.target.value)}
          >
            <option value="">Personaggio (tutti)</option>
            {charList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-line bg-bg/60 px-2 py-1 outline-none focus:border-cyan"
            value={filterPlace}
            onChange={(e) => setFilterPlace(e.target.value)}
          >
            <option value="">Luogo (tutti)</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-line bg-bg/60 px-2 py-1 outline-none focus:border-cyan"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as '' | SceneStatus)}
          >
            <option value="">Stato (tutti)</option>
            <option value="draft">Bozza</option>
            <option value="revision">Revisione</option>
            <option value="final">Definitiva</option>
          </select>
          {filtersActive && (
            <button
              className="rounded-md border border-line px-2 py-1 hover:border-cyan"
              onClick={() => {
                setFilterChar('')
                setFilterPlace('')
                setFilterStatus('')
              }}
            >
              ✕ Azzera
            </button>
          )}
          <span className="ml-auto text-muted">
            {visibleScenes.length}/{scenes.length} scene
          </span>
        </div>
      )}

      {/* Bacheca (US-28.2) */}
      {viewMode === 'board' && (
        <div className="min-h-0 flex-1 rounded-2xl border border-line bg-panel/40 p-4">
          <SceneBoard
            chapters={chapters}
            scenes={visibleScenes}
            characters={charList}
            places={places}
            sceneCharMap={sceneCharMap}
            onOpenScene={openSceneInEditor}
            onSynopsis={(id, synopsis) => patchSceneMeta(id, { synopsis })}
            onReorder={(chapterId, ids) =>
              void ms.scenesReorder(chapterId, ids).then(() => reloadTree())
            }
          />
        </div>
      )}

      {/* Outline (US-28.3) */}
      {viewMode === 'outline' && (
        <div className="min-h-0 flex-1 rounded-2xl border border-line bg-panel/40 p-2">
          <OutlineTable
            chapters={chapters}
            scenes={visibleScenes}
            characters={charList}
            places={places}
            sceneCharMap={sceneCharMap}
            onOpenScene={openSceneInEditor}
            onStatus={(id, status) => patchSceneMeta(id, { status })}
          />
        </div>
      )}

      {/* Corpo a 3 colonne */}
      <div className={`flex min-h-0 flex-1 gap-4 ${viewMode !== 'editor' ? 'hidden' : ''}`}>
        {!focusMode && (
          <aside className="w-64 shrink-0 rounded-2xl border border-line bg-panel/40 p-3">
            <ChapterTree
              chapters={chapters}
              scenes={scenes}
              selectedSceneId={selectedSceneId}
              onSelectScene={select}
              onAddChapter={addChapter}
              onAddScene={addScene}
              onRenameChapter={renameChapter}
              onDeleteChapter={deleteChapter}
              onDeleteScene={deleteScene}
              onMoveChapter={moveChapter}
              onMoveScene={moveScene}
              onDropScene={dropScene}
            />
          </aside>
        )}

        <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-line bg-panel/40 p-4">
          {selectedScene ? (
            <>
              {!focusMode && (
                <SceneMetaBar
                  scene={selectedScene}
                  characters={charList}
                  places={places}
                  linkedCharIds={sceneCharMap.get(selectedScene.id) ?? []}
                  onPatch={(patch) => patchSceneMeta(selectedScene.id, patch)}
                  onLink={(cid) => void linkChar(selectedScene.id, cid)}
                  onUnlink={(cid) => void unlinkChar(selectedScene.id, cid)}
                />
              )}
              <div className="min-h-0 flex-1">
                <SceneEditor scene={selectedScene} onChange={onSceneChange} saving={saving} />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              Seleziona o crea una scena per iniziare a scrivere.
            </div>
          )}
        </section>

        {!focusMode && notesOpen && (
          <aside className="w-72 shrink-0 rounded-2xl border border-line bg-panel/40 p-3">
            {selectedScene ? (
              <NotesPanel
                scopeLabel={selectedScene.title}
                notes={notes}
                onAdd={addNote}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            ) : (
              <p className="text-xs text-muted">Seleziona una scena per vederne le note.</p>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
