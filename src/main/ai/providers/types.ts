import type { AIRequest, AIResult } from '@shared/ai'

/**
 * Interfaccia comune a tutti i provider AI.
 * Aggiungere un provider reale = implementare questa interfaccia e registrarlo
 * nell'AIGateway (Fase 3, US-18.3 multi-provider).
 */
export interface AIProvider {
  readonly name: string
  readonly model: string
  readonly mode: 'mock' | 'live'
  generate(req: AIRequest): Promise<AIResult>
}
