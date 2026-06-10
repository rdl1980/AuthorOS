import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chapter, Note, ProjectStats, Scene } from '@shared/domain'
import { countWords } from '@shared/text'
import { useLibrary } from '../../store/useLibrary'
import { useWorkspace } from '../../store/useWorkspace'
import { ChapterTree } from './workspace/ChapterTree'
import { SceneEditor } from './workspace/SceneEditor'
import { NotesPanel } from './workspace/NotesPanel'

const EMPTY_STATS: ProjectStats = { words: 0, scenes: 0, chapters: 0 }

export function WritingWorkspaceView(): JSX.Element {
  const project = useLibrary((s) => s.active)
  const { selectedSceneId, focusMode, notesOpen, select, toggleFocus, toggleNotes } = useWorkspace()

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [stats, setStats] = useState<ProjectStats>(EMPTY_STATS)
  const [notes, setNotes] = useState<Note[]>([])
  const [saving, setSaving] = useState(false)

  const ms = window.authoros.manuscript
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Carica all'apertura/cambio progetto.
  useEffect(() => {
    select(null)
    setNotes([])
    void reloadTree()
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
      if (project) setStats(await ms.stats(project.id))
      setSaving(false)
    }, 600)
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
        <div className="ml-auto flex gap-2">
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

      {/* Corpo a 3 colonne */}
      <div className="flex min-h-0 flex-1 gap-4">
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

        <section className="min-w-0 flex-1 rounded-2xl border border-line bg-panel/40 p-4">
          {selectedScene ? (
            <SceneEditor scene={selectedScene} onChange={onSceneChange} saving={saving} />
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
