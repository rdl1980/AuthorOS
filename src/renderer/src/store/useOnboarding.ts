import { create } from 'zustand'

/** Visibilità del tour iniziale (Epic 25). Riapribile dalle Impostazioni. */
interface OnboardingState {
  visible: boolean
  setVisible: (visible: boolean) => void
}

export const useOnboarding = create<OnboardingState>((set) => ({
  visible: false,
  setVisible: (visible) => set({ visible })
}))
