import type { AIRequest, AIResult } from '@shared/ai'
import type { AIProvider } from './types'

const PREAMBLE: Record<AIRequest['operation'], string> = {
  scene: 'SCENA (bozza generata)',
  dialogue: 'DIALOGO (bozza generata)',
  description: 'DESCRIZIONE (bozza generata)',
  expand: 'ESPANSIONE (bozza generata)',
  rewrite: 'RISCRITTURA (bozza generata)',
  tone: 'CAMBIO DI TONO (bozza generata)'
}

const estimateTokens = (s: string): number => Math.max(1, Math.ceil(s.length / 4))

/**
 * Provider fittizio: nessuna chiamata di rete, nessun costo. Permette di costruire
 * e provare tutta l'esperienza AI (US-3.x) in modalità ibrida senza API key (Epic 22).
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock'
  readonly model = 'authoros-mock-1'
  readonly mode = 'mock' as const

  async generate(req: AIRequest): Promise<AIResult> {
    const style = req.styleProfile ? ` [stile: ${req.styleProfile}]` : ''
    const text =
      `${PREAMBLE[req.operation]}${style}\n\n` +
      `Questo è un output simulato per il prompt: «${req.prompt.trim()}».\n` +
      `In modalità AI reale (con API key configurata) qui comparirebbe il testo generato dal modello, ` +
      `coerente con la voce dell'autore e col contesto della scena.`

    const promptTokens = estimateTokens(req.prompt + (req.context ?? '') + (req.styleProfile ?? ''))
    const completionTokens = estimateTokens(text)
    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens,
        completionTokens,
        credits: Math.ceil((promptTokens + completionTokens) / 100)
      }
    }
  }
}
