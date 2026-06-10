import { describe, it, expect } from 'vitest'
import type { ResolvedAiConfig } from '../src/main/data/settings-repository'
import { AIGateway } from '../src/main/ai/gateway'
import { composeGeneration, composeStyleDerivation } from '../src/main/ai/prompt'

const mockConfig = (): ResolvedAiConfig => ({
  mode: 'mock',
  provider: 'mock',
  model: 'authoros-mock-1',
  apiKey: null
})

describe('AIGateway (Epic 3, modalità ibrida)', () => {
  it('in mock genera testo e traccia i consumi', async () => {
    const gw = new AIGateway(mockConfig)
    expect(gw.status().mode).toBe('mock')
    const res = await gw.generate({ operation: 'scene', prompt: 'una notte di pioggia' })
    expect(res.provider).toBe('mock')
    expect(res.text).toContain('una notte di pioggia')
    expect(res.usage.completionTokens).toBeGreaterThan(0)
    expect(res.usage.credits).toBeGreaterThan(0)
  })

  it('senza API key ricade sul mock anche in modalità live', async () => {
    const gw = new AIGateway(() => ({
      mode: 'live',
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      apiKey: null
    }))
    expect(gw.status().mode).toBe('mock')
    expect(gw.status().provider).toBe('mock')
  })

  it('deriveStyle restituisce istruzioni (US-23.2)', async () => {
    const gw = new AIGateway(mockConfig)
    const res = await gw.deriveStyle('Un brano scritto dall’autore.')
    expect(res.text.length).toBeGreaterThan(0)
    expect(res.provider).toBe('mock')
  })
})

describe('AIGateway.assist (Epic 5/6)', () => {
  it('genera profilo, conflitti e verifica coerenza in mock', async () => {
    const gw = new AIGateway(mockConfig)
    for (const kind of ['character-profile', 'character-conflicts', 'coherence-check'] as const) {
      const res = await gw.assist(kind, 'Una ladra gentiluomo cresciuta nei bassifondi')
      expect(res.text.length).toBeGreaterThan(0)
      expect(res.usage.credits).toBeGreaterThan(0)
    }
  })
})

describe('Prompt composition', () => {
  it('include la voce dell’autore quando fornita', () => {
    const c = composeGeneration({
      operation: 'rewrite',
      prompt: 'testo da riscrivere',
      styleProfile: 'ironico, prima persona'
    })
    expect(c.system).toContain("Voce dell'autore")
    expect(c.system).toContain('ironico, prima persona')
    expect(c.user).toContain('testo da riscrivere')
    expect(c.maxTokens).toBeGreaterThan(0)
  })

  it('compone la derivazione dello stile', () => {
    const c = composeStyleDerivation('campione di prosa')
    expect(c.user).toContain('campione di prosa')
    expect(c.maxTokens).toBe(1024)
  })
})
