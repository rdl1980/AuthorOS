import { create } from 'zustand'

/** Stato UI del Writing Workspace: scena selezionata, focus mode (US-2.7), pannello note. */
interface WorkspaceState {
  selectedSceneId: string | null
  focusMode: boolean
  notesOpen: boolean
  select: (sceneId: string | null) => void
  toggleFocus: () => void
  toggleNotes: () => void
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  selectedSceneId: null,
  focusMode: false,
  notesOpen: false,
  select: (sceneId) => set({ selectedSceneId: sceneId }),
  toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
  toggleNotes: () => set((s) => ({ notesOpen: !s.notesOpen }))
}))
