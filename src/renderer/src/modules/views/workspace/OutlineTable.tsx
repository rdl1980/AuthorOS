import type { Chapter, Character, Scene, SceneStatus, WorldElement } from '@shared/domain'

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
  sceneCharMap: Map<string, string[]>
  onOpenScene: (sceneId: string) => void
  onStatus: (sceneId: string, status: SceneStatus) => void
}

/**
 * Vista outline (US-28.3): tutto il romanzo come tabella compatta —
 * capitoli, scene, parole, stato, POV, luogo e personaggi presenti.
 */
export function OutlineTable({
  chapters,
  scenes,
  characters,
  places,
  sceneCharMap,
  onOpenScene,
  onStatus
}: Props): JSX.Element {
  const charName = new Map(characters.map((c) => [c.id, c.name]))
  const placeName = new Map(places.map((p) => [p.id, p.name]))

  return (
    <div className="h-full overflow-auto pr-1">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-panel">
          <tr className="text-muted">
            <th className="border-b border-line px-2 py-1.5 font-medium">Scena</th>
            <th className="border-b border-line px-2 py-1.5 font-medium">Parole</th>
            <th className="border-b border-line px-2 py-1.5 font-medium">Stato</th>
            <th className="border-b border-line px-2 py-1.5 font-medium">POV</th>
            <th className="border-b border-line px-2 py-1.5 font-medium">Luogo</th>
            <th className="border-b border-line px-2 py-1.5 font-medium">Personaggi</th>
            <th className="border-b border-line px-2 py-1.5 font-medium">Sinossi</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((ch) => {
            const chScenes = scenes.filter((s) => s.chapterId === ch.id)
            return [
              <tr key={ch.id} className="bg-bg/40">
                <td colSpan={7} className="px-2 py-1.5 text-sm font-semibold">
                  {ch.title}
                  <span className="ml-2 font-normal text-muted">
                    {chScenes.reduce((a, s) => a + s.wordCount, 0).toLocaleString('it-IT')} parole
                  </span>
                </td>
              </tr>,
              ...chScenes.map((s) => (
                <tr key={s.id} className="border-b border-line/50 hover:bg-white/5">
                  <td className="px-2 py-1.5">
                    <button className="hover:text-cyan" onClick={() => onOpenScene(s.id)}>
                      {s.title}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-muted">{s.wordCount.toLocaleString('it-IT')}</td>
                  <td className="px-2 py-1.5">
                    <select
                      className="rounded-md border border-line bg-bg/60 px-1 py-0.5 text-[11px] outline-none focus:border-cyan"
                      value={s.status}
                      onChange={(e) => onStatus(s.id, e.target.value as SceneStatus)}
                    >
                      {(Object.keys(STATUS_LABEL) as SceneStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {STATUS_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">{s.pov || <span className="text-muted">—</span>}</td>
                  <td className="px-2 py-1.5">
                    {(s.locationId && placeName.get(s.locationId)) || (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="max-w-[180px] truncate px-2 py-1.5">
                    {(sceneCharMap.get(s.id) ?? [])
                      .map((cid) => charName.get(cid))
                      .filter(Boolean)
                      .join(', ') || <span className="text-muted">—</span>}
                  </td>
                  <td className="max-w-[260px] truncate px-2 py-1.5 text-muted" title={s.synopsis}>
                    {s.synopsis || '—'}
                  </td>
                </tr>
              ))
            ]
          })}
        </tbody>
      </table>
      {chapters.length === 0 && <p className="p-3 text-sm text-muted">Nessun capitolo nel progetto.</p>}
    </div>
  )
}
