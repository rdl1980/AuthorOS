import { create } from 'zustand'

/** Stato UI del Writing Workspace: scena selezionata, focus mode (US-2.7), pannello note. */
interface WorkspaceState {
  selectedSceneId: string | null
  focusMode: boolean
  notesOpen: boolean
  /** Typewriter mode: riga del cursore sempre centrata (US-26.3). */
  typewriter: boolean
  select: (sceneId: string | null) => void
  toggleFocus: () => void
  toggleNotes: () => void
  toggleTypewriter: () => void
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  selectedSceneId: null,
  focusMode: false,
  notesOpen: false,
  typewriter: false,
  select: (sceneId) => set({ selectedSceneId: sceneId }),
  toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
  toggleNotes: () => set((s) => ({ notesOpen: !s.notesOpen })),
  toggleTypewriter: () => set((s) => ({ typewriter: !s.typewriter }))
}))
