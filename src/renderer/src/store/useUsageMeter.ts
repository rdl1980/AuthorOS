import { create } from 'zustand'
import type { AIUsage } from '@shared/ai'

/**
 * Usage meter dell'AI (Epic 17, versione V1). Accumula i consumi delle operazioni
 * AI a scopo informativo — nessuna fatturazione in V1. In V2 diventa la base del
 * sistema crediti reale.
 */
interface UsageState {
  operations: number
  promptTokens: number
  completionTokens: number
  credits: number
  track: (usage: AIUsage) => void
  reset: () => void
}

export const useUsageMeter = create<UsageState>((set) => ({
  operations: 0,
  promptTokens: 0,
  completionTokens: 0,
  credits: 0,
  track: (usage) =>
    set((s) => ({
      operations: s.operations + 1,
      promptTokens: s.promptTokens + usage.promptTokens,
      completionTokens: s.completionTokens + usage.completionTokens,
      credits: s.credits + usage.credits
    })),
  reset: () => set({ operations: 0, promptTokens: 0, completionTokens: 0, credits: 0 })
}))
