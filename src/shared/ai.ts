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
  | 'continue' // continua la scena dal cursore (US-29.5, realizza US-3.8)

export interface AIRequest {
  operation: AIOperation
  prompt: string
  /** Profilo voce/stile dell'autore da applicare alla generazione (Epic 23). */
  styleProfile?: string
  /** Contesto narrativo opzionale (scena/capitolo corrente). */
  context?: string
  /**
   * US-29.1: se presenti, il gateway costruisce automaticamente il contesto dal
   * codex (scena, personaggi citati, luogo, beat, voce) e lo inietta nel prompt.
   */
  projectId?: string
  sceneId?: string
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
  /** Costo reale della chiamata in USD (0 in mock) — US-29.7. */
  costUsd?: number
}

/** Prezzi indicativi USD per milione di token (US-29.7). */
export const MODEL_PRICES_USD: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 }
}

export function costUsd(model: string, promptTokens: number, completionTokens: number): number {
  const p = MODEL_PRICES_USD[model]
  if (!p) return 0
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000
}

export interface AIStatus {
  mode: 'mock' | 'live'
  provider: string
  model: string
}

/**
 * Operazioni AI ausiliarie non legate alla scrittura di prosa:
 * - character-profile: genera una scheda personaggio da una descrizione breve (US-6.5)
 * - character-conflicts: suggerisce conflitti e obiettivi (US-5.5)
 * - coherence-check: segnala incoerenze in scheda/arco (US-6.4, US-5.4)
 * - editor-*: revisione del testo per l'AI Editor (Epic 10)
 * - plot-holes / plot-scene-audit: analisi della trama (Epic 8)
 * - copilot-*: Author Copilot, dall'idea alla mappa del romanzo (Epic 20)
 */
export type AssistKind =
  | 'character-profile'
  | 'character-conflicts'
  | 'coherence-check'
  | 'editor-info-dump'
  | 'editor-dialogue'
  | 'editor-show-dont-tell'
  | 'editor-pacing'
  | 'plot-holes'
  | 'plot-scene-audit'
  | 'copilot-blueprint'
  | 'copilot-arc'
