import type { AIUsage } from '@shared/ai'

export interface CompletionInput {
  system: string
  user: string
  maxTokens: number
}

export interface CompletionOutput {
  text: string
  usage: AIUsage
}

/**
 * Interfaccia comune a tutti i provider AI: una semplice "completion" system+user.
 * La composizione dei prompt e il tracciamento stanno nel gateway, così aggiungere
 * un provider significa implementare solo `complete` (US-18.3 multi-provider).
 */
export interface AIProvider {
  readonly name: string
  readonly model: string
  readonly mode: 'mock' | 'live'
  complete(input: CompletionInput): Promise<CompletionOutput>
  /**
   * Variante streaming (US-29.2): emette il testo man mano che arriva.
   * Facoltativa: chi non la implementa ricade su complete() in un colpo solo.
   */
  streamComplete?(
    input: CompletionInput,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<CompletionOutput>
}

export const estimateTokens = (s: string): number => Math.max(1, Math.ceil(s.length / 4))
export const estimateCredits = (promptTokens: number, completionTokens: number): number =>
  Math.ceil((promptTokens + completionTokens) / 100)
