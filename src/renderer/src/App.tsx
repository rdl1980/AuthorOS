import { useEffect, useRef, useState } from 'react'
import type { AIStatus } from '@shared/ai'
import { modules, getModule } from './modules/registry'
import { useUsageMeter } from './store/useUsageMeter'
import { useLibrary } from './store/useLibrary'
import { useNav } from './store/useNav'

export default function App(): JSX.Element {
  const { moduleId, goTo } = useNav()
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const usage = useUsageMeter()
  const { active: activeProject, setActive } = useLibrary()
  // Evita di sovrascrivere lastProjectId con null prima che il ripristino sia avvenuto.
  const restored = useRef(false)

  useEffect(() => {
    void window.authoros.ai.status().then(setAiStatus)
    // Ripristina l'ultimo progetto aperto (persistito nelle settings).
    void (async () => {
      try {
        const settings = await window.authoros.settings.get()
        if (settings.lastProjectId) {
          const project = await window.authoros.projects.get(settings.lastProjectId)
          if (project && project.status === 'active') setActive(project)
        }
      } finally {
        restored.current = true
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persiste il progetto attivo a ogni cambio (dopo il ripristino iniziale).
  useEffect(() => {
    if (!restored.current) return
    void window.authoros.settings.update({ lastProjectId: activeProject?.id ?? null })
  }, [activeProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = getModule(moduleId) ?? modules[0]
  const ActiveComponent = active.component

  return (
    <div className="flex h-full">
      {/* Sidebar — moduli dalla registry (architettura modulare) */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel/60">
        <div className="px-5 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">AuthorOS</div>
          <div className="truncate text-lg font-semibold" title={activeProject?.title}>
            {activeProject?.title ?? 'Workspace'}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => goTo(m.id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                m.id === moduleId ? 'bg-cyan/15 text-ink' : 'text-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span className="text-base">{m.icon}</span>
              <span className="flex-1">{m.title}</span>
              {m.status === 'planned' && (
                <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-muted">
                  soon
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4 text-xs text-muted">
          <div className="mb-1 flex items-center justify-between">
            <span>AI</span>
            <span className={aiStatus?.mode === 'live' ? 'text-green' : 'text-yellow'}>
              {aiStatus ? aiStatus.mode : '…'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Usage meter</span>
            <span>{usage.credits} cr · {usage.operations} op</span>
          </div>
        </div>
      </aside>

      {/* Area principale — modulo attivo */}
      <main className="flex-1 overflow-y-auto p-8">
        <ActiveComponent />
      </main>
    </div>
  )
}
