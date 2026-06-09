import type { AIRequest, AIResult, AIStatus } from '@shared/ai'
import type { AIProvider } from './providers/types'
import { MockProvider } from './providers/mock'

/**
 * Punto di passaggio unico per ogni operazione AI dell'app.
 * Responsabilità (alcune da completare nelle fasi successive):
 *  - selezione provider (V1 ibrido: mock di default; reale se configurata API key — Epic 22)
 *  - composizione prompt con Author Voice/Style Profile (Epic 23)
 *  - tracciamento consumi per l'usage meter (Epic 17)
 * Nota: l'output non viene MAI applicato al testo automaticamente — l'accept/edit/reject
 * avviene lato UI tramite l'AI Interaction Shell (principio trasversale, vedi DoD).
 */
export class AIGateway {
  private provider: AIProvider

  constructor(provider: AIProvider = new MockProvider()) {
    this.provider = provider
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider
  }

  status(): AIStatus {
    return { mode: this.provider.mode, provider: this.provider.name, model: this.provider.model }
  }

  async generate(req: AIRequest): Promise<AIResult> {
    return this.provider.generate(req)
  }
}
