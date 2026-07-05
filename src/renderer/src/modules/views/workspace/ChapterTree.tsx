import { useState } from 'react'
import type { Chapter, Scene } from '@shared/domain'

interface Props {
  chapters: Chapter[]
  scenes: Scene[]
  selectedSceneId: string | null
  onSelectScene: (id: string) => void
  onAddChapter: () => void
  onAddScene: (chapterId: string) => void
  onRenameChapter: (id: string, title: string) => void
  onDeleteChapter: (id: string) => void
  onDeleteScene: (id: string) => void
  onMoveChapter: (id: string, dir: -1 | 1) => void
  onMoveScene: (sceneId: string, dir: -1 | 1) => void
  /** Drop di una scena in un capitolo a una certa posizione (drag&drop, US-2.2). */
  onDropScene: (sceneId: string, toChapterId: string, toIndex: number) => void
}

export function ChapterTree(props: Props): JSX.Element {
  const { chapters, scenes, selectedSceneId } = props
  const [dragSceneId, setDragSceneId] = useState<string | null>(null)

  const scenesOf = (chapterId: string): Scene[] => scenes.filter((s) => s.chapterId === chapterId)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Manoscritto</span>
        <button
          className="rounded-md border border-line px-2 py-1 text-xs hover:border-cyan"
          onClick={props.onAddChapter}
        >
          + Capitolo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {chapters.length === 0 && (
          <p className="text-xs text-muted">Nessun capitolo. Creane uno per iniziare a scrivere.</p>
        )}

        {chapters.map((ch, ci) => {
          const chScenes = scenesOf(ch.id)
          return (
            <div
              key={ch.id}
              className="mb-3"
              onDragOver={(e) => dragSceneId && e.preventDefault()}
              onDrop={() => {
                if (dragSceneId) {
                  props.onDropScene(dragSceneId, ch.id, chScenes.length)
                  setDragSceneId(null)
                }
              }}
            >
              <div className="group flex items-center gap-1">
                <input
                  className="flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold outline-none hover:bg-white/5 focus:bg-white/10"
                  value={ch.title}
                  onChange={(e) => props.onRenameChapter(ch.id, e.target.value)}
                />
                <button
                  className="text-xs text-muted opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  onClick={() => props.onMoveChapter(ch.id, -1)}
                  disabled={ci === 0}
                  title="Su"
                >
                  ▲
                </button>
                <button
                  className="text-xs text-muted opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  onClick={() => props.onMoveChapter(ch.id, 1)}
                  disabled={ci === chapters.length - 1}
                  title="Giù"
                >
                  ▼
                </button>
                <button
                  className="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-red"
                  onClick={() => props.onDeleteChapter(ch.id)}
                  title="Elimina capitolo"
                >
                  ✕
                </button>
              </div>

              <div className="ml-2 mt-1 border-l border-line pl-2">
                {chScenes.map((sc, si) => (
                  <div
                    key={sc.id}
                    draggable
                    onDragStart={() => setDragSceneId(sc.id)}
                    onDragEnd={() => setDragSceneId(null)}
                    onDragOver={(e) => dragSceneId && e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation()
                      if (dragSceneId && dragSceneId !== sc.id) {
                        props.onDropScene(dragSceneId, ch.id, si)
                        setDragSceneId(null)
                      }
                    }}
                    className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm ${
                      sc.id === selectedSceneId
                        ? 'bg-cyan/15 text-ink'
                        : 'text-muted hover:bg-white/5 hover:text-ink'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        sc.status === 'final' ? 'bg-green' : sc.status === 'revision' ? 'bg-yellow' : 'bg-white/20'
                      }`}
                      title={sc.status === 'final' ? 'Finale' : sc.status === 'revision' ? 'Revisione' : 'Bozza'}
                    />
                    <button className="flex-1 truncate text-left" onClick={() => props.onSelectScene(sc.id)}>
                      {sc.title}
                      <span className="ml-2 text-[10px] text-muted">{sc.wordCount}p</span>
                    </button>
                    <button
                      className="text-xs text-muted opacity-0 group-hover:opacity-100 disabled:opacity-0"
                      onClick={() => props.onMoveScene(sc.id, -1)}
                      disabled={si === 0}
                      title="Su"
                    >
                      ▲
                    </button>
                    <button
                      className="text-xs text-muted opacity-0 group-hover:opacity-100 disabled:opacity-0"
                      onClick={() => props.onMoveScene(sc.id, 1)}
                      disabled={si === chScenes.length - 1}
                      title="Giù"
                    >
                      ▼
                    </button>
                    <button
                      className="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-red"
                      onClick={() => props.onDeleteScene(sc.id)}
                      title="Elimina scena"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="mt-1 px-2 text-xs text-cyan hover:underline"
                  onClick={() => props.onAddScene(ch.id)}
                >
                  + Scena
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
