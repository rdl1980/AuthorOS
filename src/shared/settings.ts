// Impostazioni app & AI (Epic 22). Le API key NON sono mai esposte al renderer:
// il renderer vede solo flag booleani "hasKey".

export type AIProviderId = 'mock' | 'anthropic' | 'openai'
export type AIMode = 'mock' | 'live'
export type Language = 'it' | 'en'

export interface AppSettings {
  provider: AIProviderId
  model: string
  mode: AIMode
  language: Language
  hasAnthropicKey: boolean
  hasOpenaiKey: boolean
  /** Ultimo progetto aperto, ripristinato all'avvio. */
  lastProjectId: string | null
  /** Tour iniziale completato o saltato (US-25.1). */
  onboardingDone: boolean
}

export type SettingsUpdate = Partial<
  Pick<AppSettings, 'provider' | 'model' | 'mode' | 'language' | 'lastProjectId' | 'onboardingDone'>
>

/** Cataloghi modelli per provider (US-22.2). */
export const MODELS: Record<Exclude<AIProviderId, 'mock'>, string[]> = {
  anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini']
}

export const DEFAULT_MODEL: Record<AIProviderId, string> = {
  mock: 'authoros-mock-1',
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o'
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'mock',
  model: DEFAULT_MODEL.mock,
  mode: 'mock',
  language: 'it',
  hasAnthropicKey: false,
  hasOpenaiKey: false,
  lastProjectId: null,
  onboardingDone: false
}
