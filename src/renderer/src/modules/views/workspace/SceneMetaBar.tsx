import type { Character, Scene, WorldElement } from '@shared/domain'

interface Props {
  scene: Scene
  characters: Character[]
  places: WorldElement[]
  linkedCharIds: string[]
  onPatch: (patch: { pov?: string; locationId?: string | null; synopsis?: string }) => void
  onLink: (characterId: string) => void
  onUnlink: (characterId: string) => void
}

/**
 * Metadati narrativi della scena (US-28.1): POV, luogo (dal World Building),
 * sinossi per la bacheca e personaggi presenti. Compatta, sopra l'editor.
 */
export function SceneMetaBar({
  scene,
  characters,
  places,
  linkedCharIds,
  onPatch,
  onLink,
  onUnlink
}: Props): JSX.Element {
  const linked = characters.filter((c) => linkedCharIds.includes(c.id))
  const available = characters.filter((c) => !linkedCharIds.includes(c.id))

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bg/40 px-3 py-2 text-xs">
      <label className="flex items-center gap-1 text-muted">
        POV
        <input
          className="w-28 rounded-md border border-line bg-bg/60 px-2 py-1 text-xs text-ink outline-none focus:border-cyan"
          list={`pov-${scene.id}`}
          value={scene.pov}
          placeholder="es. Marta"
          onChange={(e) => onPatch({ pov: e.target.value })}
        />
        <datalist id={`pov-${scene.id}`}>
          {characters.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </label>

      <label className="flex items-center gap-1 text-muted">
        Luogo
        <select
          className="max-w-[140px] rounded-md border border-line bg-bg/60 px-2 py-1 text-xs text-ink outline-none focus:border-cyan"
          value={scene.locationId ?? ''}
          onChange={(e) => onPatch({ locationId: e.target.value || null })}
        >
          <option value="">—</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[180px] flex-1 items-center gap-1 text-muted">
        Sinossi
        <input
          className="flex-1 rounded-md border border-line bg-bg/60 px-2 py-1 text-xs text-ink outline-none focus:border-cyan"
          value={scene.synopsis}
          placeholder="Cosa succede in questa scena (per la bacheca)…"
          onChange={(e) => onPatch({ synopsis: e.target.value })}
        />
      </label>

      <span className="flex flex-wrap items-center gap-1">
        {linked.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1 rounded-full bg-violet/15 px-2 py-0.5 text-violet"
          >
            {c.name}
            <button
              className="text-muted hover:text-ink"
              title="Rimuovi dalla scena"
              onClick={() => onUnlink(c.id)}
            >
              ✕
            </button>
          </span>
        ))}
        {available.length > 0 && (
          <select
            className="rounded-md border border-line bg-bg/60 px-1.5 py-1 text-xs text-muted outline-none focus:border-cyan"
            value=""
            title="Aggiungi personaggio presente in scena"
            onChange={(e) => {
              if (e.target.value) onLink(e.target.value)
            }}
          >
            <option value="">+ 🎭</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </span>
    </div>
  )
}
