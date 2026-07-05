import { useEffect, useRef, useState } from 'react'
import type { Chapter, Scene } from '@shared/domain'
import { modules } from '../modules/registry'
import { useLibrary } from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { useWorkspace } from '../store/useWorkspace'

interface Item {
  key: string
  icon: string
  label: string
  hint: string
  run: () => void
}

/** Command palette (US-26.7): Ctrl+K per navigare tra moduli e scene da tastiera. */
export function CommandPalette(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const project = useLibrary((s) => s.active)
  const goTo = useNav((s) => s.goTo)
  const selectScene = useWorkspace((s) => s.select)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    setTimeout(() => inputRef.current?.focus(), 0)
    if (project) {
      void Promise.all([
        window.authoros.manuscript.scenes(project.id),
        window.authoros.manuscript.chapters(project.id)
      ]).then(([s, c]) => {
        setScenes(s)
        setChapters(c)
      })
    } else {
      setScenes([])
      setChapters([])
    }
  }, [open, project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const chapterTitle = (id: string): string => chapters.find((c) => c.id === id)?.title ?? ''
  const close = (): void => setOpen(false)

  const items: Item[] = [
    ...modules.map((m) => ({
      key: `mod:${m.id}`,
      icon: m.icon,
      label: m.title,
      hint: 'modulo',
      run: () => {
        goTo(m.id)
        close()
      }
    })),
    ...scenes.map((s) => ({
      key: `scene:${s.id}`,
      icon: '✍️',
      label: s.title,
      hint: chapterTitle(s.chapterId),
      run: () => {
        selectScene(s.id)
        goTo('writing')
        close()
      }
    }))
  ]

  const q = query.trim().toLowerCase()
  const filtered = q
    ? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q))
    : items
  const active = Math.min(index, Math.max(0, filtered.length - 1))

  const onInputKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[active]) {
      filtered[active].run()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 pt-24 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full rounded-t-2xl border-b border-line bg-transparent px-4 py-3 text-sm outline-none"
          placeholder="Vai a… (moduli e scene)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
          }}
          onKeyDown={onInputKey}
        />
        <ul className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nessun risultato.</li>}
          {filtered.slice(0, 40).map((item, i) => (
            <li key={item.key}>
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                  i === active ? 'bg-cyan/15 text-ink' : 'text-muted hover:bg-white/5'
                }`}
                onMouseEnter={() => setIndex(i)}
                onClick={item.run}
              >
                <span>{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-xs text-muted">{item.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
