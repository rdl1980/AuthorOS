import { estimateCredits, estimateTokens, type AIProvider, type CompletionInput, type CompletionOutput } from './types'

/**
 * Provider fittizio: nessuna chiamata di rete, nessun costo. Permette di costruire
 * e provare tutta l'esperienza AI (US-3.x) in modalità ibrida senza API key (Epic 22).
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock'
  readonly model = 'authoros-mock-1'
  readonly mode = 'mock' as const

  async complete(input: CompletionInput): Promise<CompletionOutput> {
    const text =
      `(output simulato)\n\n` +
      `Questo testo è generato in modalità mock per: «${input.user.split('\n')[0]}».\n` +
      `Configura una API key nelle Impostazioni per attivare l'AI reale; il testo seguirà ` +
      `la voce dell'autore e il contesto della scena.`
    const promptTokens = estimateTokens(input.system + input.user)
    const completionTokens = estimateTokens(text)
    return {
      text,
      usage: { promptTokens, completionTokens, credits: estimateCredits(promptTokens, completionTokens) }
    }
  }
}
