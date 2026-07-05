import { costUsd, type AIRequest, type AIResult, type AIStatus, type AssistKind } from '@shared/ai'
import type { ResolvedAiConfig } from '../data/settings-repository'
import type { AIProvider, CompletionOutput } from './providers/types'
import { MockProvider } from './providers/mock'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAIProvider } from './providers/openai'
import type { ContextBuilder } from './context-builder'
import {
  composeAssist,
  composeChat,
  composeGeneration,
  composeStyleDerivation,
  type Composed
} from './prompt'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

/** Dipendenze del gateway verso le settings (budget US-29.7 incluso). */
export interface GatewaySettings {
  resolveAi(): ResolvedAiConfig
  getMonthlyBudgetUsd(): number | null
  getAiSpentUsd(): number
  addAiSpend(usd: number): void
}

/**
 * Punto di passaggio unico per ogni operazione AI. Sceglie il provider dalle
 * impostazioni (ibrido mock/reale), inietta il contesto del progetto (US-29.1),
 * supporta lo streaming (US-29.2), applica il tetto di spesa mensile (US-29.7)
 * e registra i costi reali. L'output non viene MAI applicato automaticamente.
 */
export class AIGateway {
  constructor(
    private readonly settings: GatewaySettings,
    private readonly contextBuilder?: ContextBuilder
  ) {}

  private resolveProvider(): AIProvider {
    const cfg = this.settings.resolveAi()
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

  /** US-29.7: blocca le chiamate reali oltre il tetto di spesa mensile. */
  private checkBudget(provider: AIProvider): void {
    if (provider.mode !== 'live') return
    const budget = this.settings.getMonthlyBudgetUsd()
    if (budget !== null && this.settings.getAiSpentUsd() >= budget) {
      throw new Error(
        `Tetto di spesa mensile raggiunto ($${budget.toFixed(2)}). Puoi alzarlo nelle Impostazioni.`
      )
    }
  }

  private finalize(provider: AIProvider, out: CompletionOutput): AIResult {
    const cost =
      provider.mode === 'live'
        ? costUsd(provider.model, out.usage.promptTokens, out.usage.completionTokens)
        : 0
    if (cost > 0) this.settings.addAiSpend(cost)
    return { text: out.text, provider: provider.name, model: provider.model, usage: out.usage, costUsd: cost }
  }

  /** US-29.1: arricchisce la composizione col contesto del codex. */
  private withContext(req: AIRequest, composed: Composed): Composed {
    if (!req.projectId || !this.contextBuilder) return composed
    const ctx = this.contextBuilder.build(req.projectId, req.sceneId, req.prompt)
    if (!ctx) return composed
    return {
      ...composed,
      system: `${composed.system}\n\nCONTESTO DEL LIBRO (usalo per coerenza, non ricopiarlo):\n${ctx}`
    }
  }

  async generate(req: AIRequest): Promise<AIResult> {
    const provider = this.resolveProvider()
    this.checkBudget(provider)
    const out = await provider.complete(this.withContext(req, composeGeneration(req)))
    return this.finalize(provider, out)
  }

  /** US-29.2: generazione in streaming, interrompibile. */
  async generateStream(
    req: AIRequest,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<AIResult> {
    const provider = this.resolveProvider()
    this.checkBudget(provider)
    const input = this.withContext(req, composeGeneration(req))
    let out: CompletionOutput
    if (provider.streamComplete) {
      out = await provider.streamComplete(input, onChunk, signal)
    } else {
      out = await provider.complete(input)
      onChunk(out.text)
    }
    return this.finalize(provider, out)
  }

  /** Deriva un profilo di stile da un testo campione (US-23.2). */
  async deriveStyle(sample: string): Promise<AIResult> {
    const provider = this.resolveProvider()
    this.checkBudget(provider)
    const out = await provider.complete(composeStyleDerivation(sample))
    return this.finalize(provider, out)
  }

  /** Operazioni ausiliarie (personaggi, editor, trama). */
  async assist(kind: AssistKind, payload: string): Promise<AIResult> {
    const provider = this.resolveProvider()
    this.checkBudget(provider)
    const out = await provider.complete(composeAssist(kind, payload))
    return this.finalize(provider, out)
  }

  /** US-29.6: chat che conosce la panoramica del progetto. */
  async chat(projectId: string, history: ChatMessage[]): Promise<AIResult> {
    const provider = this.resolveProvider()
    this.checkBudget(provider)
    const overview = this.contextBuilder?.buildProjectOverview(projectId) ?? ''
    const out = await provider.complete(composeChat(overview, history))
    return this.finalize(provider, out)
  }
}
