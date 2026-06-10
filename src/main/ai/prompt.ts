import type { AIRequest } from '@shared/ai'

export interface Composed {
  system: string
  user: string
  maxTokens: number
}

const OPERATION_INSTRUCTION: Record<AIRequest['operation'], string> = {
  scene: 'Scrivi una scena narrativa basata sulla richiesta.',
  dialogue: 'Scrivi un dialogo credibile basato sulla richiesta.',
  description: 'Scrivi una descrizione vivida (luogo, personaggio o atmosfera).',
  expand: 'Espandi gli appunti forniti in prosa narrativa.',
  rewrite: 'Riscrivi il testo migliorandone stile e chiarezza, mantenendo il significato.',
  tone: 'Riscrivi il testo adattandone il tono come richiesto.'
}

const BASE_SYSTEM =
  "Sei un assistente di scrittura per autori. L'autore mantiene sempre il controllo creativo. " +
  'Rispondi in italiano con SOLO il testo richiesto, senza meta-commento, preamboli o spiegazioni. ' +
  "Rispetta fedelmente la voce e lo stile dell'autore quando forniti."

/** Compone system+user per una generazione AI, includendo il profilo di stile (Epic 23). */
export function composeGeneration(req: AIRequest): Composed {
  let system = BASE_SYSTEM + '\n\nCompito: ' + OPERATION_INSTRUCTION[req.operation]
  if (req.styleProfile && req.styleProfile.trim()) {
    system += `\n\nVoce dell'autore da rispettare:\n${req.styleProfile.trim()}`
  }
  let user = req.prompt.trim()
  if (req.context && req.context.trim()) {
    user += `\n\nContesto della scena:\n${req.context.trim()}`
  }
  return { system, user, maxTokens: 4096 }
}

/** Compone il prompt per derivare un profilo di stile da un testo campione (US-23.2). */
export function composeStyleDerivation(sample: string): Composed {
  return {
    system:
      "Sei un analista di stile letterario. Analizza il brano fornito e descrivi la voce dell'autore " +
      '(tono, registro, ritmo, persona narrativa, lessico, uso del dialogo). ' +
      "Rispondi in italiano con istruzioni concise e operative utilizzabili per far scrivere un'AI nello stesso stile. " +
      'Niente preamboli.',
    user: `Brano campione:\n${sample.trim()}`,
    maxTokens: 1024
  }
}
