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
    const text = this.mockText(input)
    const promptTokens = estimateTokens(input.system + input.user)
    const completionTokens = estimateTokens(text)
    return {
      text,
      usage: { promptTokens, completionTokens, credits: estimateCredits(promptTokens, completionTokens) }
    }
  }

  /**
   * Per le richieste del Copilot (Epic 20) il mock risponde nel formato atteso,
   * così il wizard è provabile end-to-end anche senza API key.
   */
  private mockText(input: CompletionInput): string {
    if (input.system.includes('[FORMATO-BLUEPRINT]')) {
      const idea = input.user.split('\n')[0].slice(0, 60)
      return [
        'TITOLO: Bozza dimostrativa',
        'GENERE: Letteratura / Mainstream',
        `LOGLINE: Mappa simulata per l'idea «${idea}» (attiva una API key per quella reale).`,
        'FRAMEWORK: Three Act Structure',
        'CAPITOLI:',
        '1. L\'innesco — il protagonista riceve la notizia che cambia tutto',
        '2. La soglia — lascia il suo mondo ordinario',
        '3. Prime prove — alleati e nemici si rivelano',
        '4. Il punto di svolta — una verità ribalta il piano',
        '5. La crisi — tutto sembra perduto',
        '6. La resa dei conti — lo scontro decisivo',
        '7. Il ritorno — cosa resta e cosa è cambiato',
        'PERSONAGGI:',
        '- Protagonista | Protagonista | Definisci nome e desideri nel wizard',
        '- Antagonista | Antagonista | La forza che si oppone',
        '- Alleato | Comprimario | Chi aiuta nel momento peggiore'
      ].join('\n')
    }
    if (input.system.includes('[FORMATO-ARCO]')) {
      return [
        'DESIDERIO: ottenere ciò che crede di volere (simulato)',
        'BISOGNO: accettare ciò di cui ha davvero bisogno',
        'PAURA: perdere ciò che ha di più caro',
        'FERITA: un tradimento mai superato',
        'BUGIA: pensa di non meritare fiducia',
        'TRASFORMAZIONE: impara a fidarsi e a lasciar andare'
      ].join('\n')
    }
    return (
      `(output simulato)\n\n` +
      `Questo testo è generato in modalità mock per: «${input.user.split('\n')[0]}».\n` +
      `Configura una API key nelle Impostazioni per attivare l'AI reale; il testo seguirà ` +
      `la voce dell'autore e il contesto della scena.`
    )
  }

  /** Streaming simulato (US-29.2): emette il testo a parole, interrompibile. */
  async streamComplete(
    input: CompletionInput,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<CompletionOutput> {
    const full = await this.complete(input)
    const words = full.text.split(/(?<=\s)/)
    let emitted = ''
    for (const w of words) {
      if (signal?.aborted) break
      emitted += w
      onChunk(w)
      await new Promise((r) => setTimeout(r, 12))
    }
    return { ...full, text: emitted }
  }
}
