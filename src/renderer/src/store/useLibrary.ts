import { create } from 'zustand'
import type { Project } from '@shared/domain'

/** Progetto attualmente aperto nel workspace (US-1.3 — passare da un libro all'altro). */
interface LibraryState {
  active: Project | null
  setActive: (project: Project | null) => void
}

export const useLibrary = create<LibraryState>((set) => ({
  active: null,
  setActive: (project) => set({ active: project })
}))
