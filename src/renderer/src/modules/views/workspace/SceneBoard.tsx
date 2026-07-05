import { useState } from 'react'
import type { Chapter, Character, Scene, SceneStatus, WorldElement } from '@shared/domain'

const STATUS_DOT: Record<SceneStatus, string> = {
  draft: 'bg-yellow',
  revision: 'bg-cyan',
  final: 'bg-green'
}
const STATUS_LABEL: Record<SceneStatus, string> = {
  draft: 'Bozza',
  revision: 'Revisione',
  final: 'Definitiva'
}

interface Props {
  chapters: Chapter[]
  scenes: Scene[]
  characters: Character[]
  places: WorldElement[]
  /** sceneId → characterId[] presenti (US-28.1). */
  sceneCharMap: Map<string, string[]>
  onOpenScene: (sceneId: string) => void
  onSynopsis: (sceneId: string, synopsis: string) => void
  onReorder: (chapterId: string, orderedIds: string[]) => void
}

/**
 * Bacheca delle scene (US-28.2): una card per scena raggruppata per capitolo,
 * con sinossi modificabile, stato, POV, luogo e personaggi. Drag&drop per
 * riordinare le scene dentro il capitolo.
 */
export function SceneBoard({
  chapters,
  scenes,
  characters,
  places,
  sceneCharMap,
  onOpenScene,
  onSynopsis,
  onReorder
}: Props): JSX.Element {
  const [dragId, setDragId] = useState<string | null>(null)
  const charName = new Map(characters.map((c) => [c.id, c.name]))
  const placeName = new Map(places.map((p) => [p.id, p.name]))

  const drop = (target: Scene): void => {
    if (!dragId || dragId === target.id) return
    const dragged = scenes.find((s) => s.id === dragId)
    if (!dragged || dragged.chapterId !== target.chapterId) return
    const ids = scenes.filter((s) => s.chapterId === target.chapterId).map((s) => s.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(target.id)
    ids.splice(from, 1)
    ids.splice(to, 0, dragId)
    onReorder(target.chapterId, ids)
    setDragId(null)
  }

  return (
    <div className="h-full space-y-6 overflow-y-auto pr-1">
      {chapters.map((ch) => {
        const chScenes = scenes.filter((s) => s.chapterId === ch.id)
        return (
          <section key={ch.id}>
            <h3 className="mb-2 text-sm font-semibold text-muted">
              {ch.title} <span className="font-normal">· {chScenes.length} scene</span>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {chScenes.map((s) => {
                const present = sceneCharMap.get(s.id) ?? []
                return (
                  <article
                    key={s.id}
                    draggable
                    onDragStart={() => setDragId(s.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(s)}
                    className={`cursor-grab rounded-xl border bg-panel/60 p-3 transition-colors ${
                      dragId === s.id ? 'border-cyan opacity-60' : 'border-line hover:border-cyan/60'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s.status]}`}
                        title={STATUS_LABEL[s.status]}
                      />
                      <button
                        className="truncate text-sm font-medium hover:text-cyan"
                        title="Apri nell'editor"
                        onClick={() => onOpenScene(s.id)}
                      >
                        {s.title}
                      </button>
                      <span className="ml-auto shrink-0 text-[10px] text-muted">
                        {s.wordCount.toLocaleString('it-IT')} parole
                      </span>
                    </div>
                    <textarea
                      className="mb-2 h-16 w-full resize-none rounded-md border border-transparent bg-bg/40 px-2 py-1 text-xs text-ink outline-none placeholder:text-muted/60 focus:border-cyan"
                      placeholder="Sinossi della scena…"
                      value={s.synopsis}
                      onChange={(e) => onSynopsis(s.id, e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {s.pov && (
                        <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-cyan">
                          POV {s.pov}
                        </span>
                      )}
                      {s.locationId && placeName.get(s.locationId) && (
                        <span className="rounded-full bg-green/15 px-2 py-0.5 text-green">
                          📍 {placeName.get(s.locationId)}
                        </span>
                      )}
                      {present.slice(0, 3).map((cid) => (
                        <span key={cid} className="rounded-full bg-violet/15 px-2 py-0.5 text-violet">
                          {charName.get(cid) ?? '?'}
                        </span>
                      ))}
                      {present.length > 3 && (
                        <span className="rounded-full bg-violet/10 px-2 py-0.5 text-violet">
                          +{present.length - 3}
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
              {chScenes.length === 0 && (
                <p className="text-xs text-muted">Nessuna scena in questo capitolo.</p>
              )}
            </div>
          </section>
        )
      })}
      {chapters.length === 0 && <p className="text-sm text-muted">Nessun capitolo nel progetto.</p>}
    </div>
  )
}
