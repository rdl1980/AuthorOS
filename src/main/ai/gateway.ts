import type { AIRequest, AIResult, AIStatus, AssistKind } from '@shared/ai'
import type { ResolvedAiConfig } from '../data/settings-repository'
import type { AIProvider } from './providers/types'
import { MockProvider } from './providers/mock'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAIProvider } from './providers/openai'
import { composeAssist, composeGeneration, composeStyleDerivation } from './prompt'

/**
 * Punto di passaggio unico per ogni operazione AI. Sceglie il provider in base alle
 * Impostazioni (modalità ibrida: mock di default; reale se 'live' + provider + API key),
 * compone i prompt (con Author Voice), e restituisce testo + consumi per l'usage meter.
 *
 * L'output non viene MAI applicato automaticamente: accept/edit/reject è lato UI
 * (AI Interaction Shell — principio trasversale, DoD).
 */
export class AIGateway {
  constructor(private readonly getConfig: () => ResolvedAiConfig) {}

  private resolveProvider(): AIProvider {
    const cfg = this.getConfig()
    if (cfg.mode !== 'live' || cfg.provider === 'mock' || !cfg.apiKey) {
      return new MockProvider()
    }
    if (cfg.provider === 'anthropic') return new AnthropicProvider(cfg.apiKey, cfg.model)
    if (cfg.provider === 'openai') return new OpenAIProvider(cfg.apiKey, cfg.model)
    return new MockProvider()
  }

  status(): AIStatus {
    const p = this.resolveProvider()
    return { mode: p.mode, provider: p.name, model: p.model }
  }

  async generate(req: AIRequest): Promise<AIResult> {
    const provider = this.resolveProvider()
    const { text, usage } = await provider.complete(composeGeneration(req))
    return { text, provider: provider.name, model: provider.model, usage }
  }

  /** Deriva un profilo di stile da un testo campione (US-23.2). */
  async deriveStyle(sample: string): Promise<AIResult> {
    const provider = this.resolveProvider()
    const { text, usage } = await provider.complete(composeStyleDerivation(sample))
    return { text, provider: provider.name, model: provider.model, usage }
  }

  /** Operazioni ausiliarie (profilo personaggio, conflitti, verifica coerenza). */
  async assist(kind: AssistKind, payload: string): Promise<AIResult> {
    const provider = this.resolveProvider()
    const { text, usage } = await provider.complete(composeAssist(kind, payload))
    return { text, provider: provider.name, model: provider.model, usage }
  }
}
