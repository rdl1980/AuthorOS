// Contratti AI condivisi tra main (gateway/provider) e renderer (UI).
// L'AI Gateway è provider-agnostico: in V1 ibrido usa MockProvider di default e,
// quando configurata una API key (Epic 22), provider reali (Anthropic/OpenAI…).

export type AIOperation =
  | 'scene' // genera scena da prompt (US-3.1)
  | 'dialogue' // genera dialoghi (US-3.2)
  | 'description' // genera descrizioni (US-3.3)
  | 'expand' // espandi bozza (US-3.4)
  | 'rewrite' // riscrivi sezione (US-3.5)
  | 'tone' // cambia tono (US-3.6)

export interface AIRequest {
  operation: AIOperation
  prompt: string
  /** Profilo voce/stile dell'autore da applicare alla generazione (Epic 23). */
  styleProfile?: string
  /** Contesto narrativo opzionale (scena/capitolo corrente). */
  context?: string
}

export interface AIUsage {
  promptTokens: number
  completionTokens: number
  /** Crediti consumati — in V1 puramente informativi (usage meter, Epic 17). */
  credits: number
}

export interface AIResult {
  text: string
  provider: string
  model: string
  usage: AIUsage
}

export interface AIStatus {
  mode: 'mock' | 'live'
  provider: string
  model: string
}
