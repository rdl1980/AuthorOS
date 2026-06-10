import { create } from 'zustand'

/** Modulo attivo nella shell. Condiviso così le viste possono navigare (es. Apri → Workspace). */
interface NavState {
  moduleId: string
  goTo: (moduleId: string) => void
}

export const useNav = create<NavState>((set) => ({
  moduleId: 'library',
  goTo: (moduleId) => set({ moduleId })
}))
