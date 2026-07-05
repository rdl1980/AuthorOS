import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_MODEL,
  DEFAULT_SETTINGS,
  type AIProviderId,
  type AppSettings,
  type SettingsUpdate
} from '@shared/settings'

interface StoredSettings {
  provider: AppSettings['provider']
  model: string
  mode: AppSettings['mode']
  language: AppSettings['language']
  lastProjectId: string | null
  onboardingDone: boolean
  backupDir: string | null
  dailyGoal: number
  editorFont: AppSettings['editorFont']
  editorSize: number
  editorWidth: AppSettings['editorWidth']
  editorTheme: AppSettings['editorTheme']
  monthlyBudgetUsd: number | null
  aiSpend: { month: string; usd: number }
  /** Chiavi cifrate (base64) per provider. */
  keys: Partial<Record<Exclude<AIProviderId, 'mock'>, string>>
}

/** Config risolta per l'AI Gateway (solo nel main: contiene la chiave in chiaro). */
export interface ResolvedAiConfig {
  mode: AppSettings['mode']
  provider: AIProviderId
  model: string
  apiKey: string | null
}

export class SettingsRepository {
  private readonly file: string
  private data: StoredSettings

  constructor(dataDir: string) {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
    this.file = join(dataDir, 'settings.json')
    this.data = this.load()
  }

  private load(): StoredSettings {
    const base: StoredSettings = {
      provider: DEFAULT_SETTINGS.provider,
      model: DEFAULT_SETTINGS.model,
      mode: DEFAULT_SETTINGS.mode,
      language: DEFAULT_SETTINGS.language,
      lastProjectId: null,
      onboardingDone: false,
      backupDir: null,
      dailyGoal: DEFAULT_SETTINGS.dailyGoal,
      editorFont: DEFAULT_SETTINGS.editorFont,
      editorSize: DEFAULT_SETTINGS.editorSize,
      editorWidth: DEFAULT_SETTINGS.editorWidth,
      editorTheme: DEFAULT_SETTINGS.editorTheme,
      monthlyBudgetUsd: null,
      aiSpend: { month: '', usd: 0 },
      keys: {}
    }
    if (!existsSync(this.file)) return base
    try {
      return { ...base, ...(JSON.parse(readFileSync(this.file, 'utf8')) as StoredSettings) }
    } catch {
      return base
    }
  }

  private save(): void {
    writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8')
  }

  private encrypt(plain: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return 'enc:' + safeStorage.encryptString(plain).toString('base64')
    }
    // Fallback (es. keyring assente): codifica base64 — meno sicuro, segnalato dal prefisso.
    return 'b64:' + Buffer.from(plain, 'utf8').toString('base64')
  }

  private decrypt(stored: string): string | null {
    try {
      if (stored.startsWith('enc:')) {
        return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'))
      }
      if (stored.startsWith('b64:')) {
        return Buffer.from(stored.slice(4), 'base64').toString('utf8')
      }
    } catch {
      return null
    }
    return null
  }

  /** Vista sicura per il renderer: nessuna chiave, solo flag di presenza. */
  get(): AppSettings {
    return {
      provider: this.data.provider,
      model: this.data.model,
      mode: this.data.mode,
      language: this.data.language,
      hasAnthropicKey: Boolean(this.data.keys.anthropic),
      hasOpenaiKey: Boolean(this.data.keys.openai),
      lastProjectId: this.data.lastProjectId ?? null,
      onboardingDone: this.data.onboardingDone ?? false,
      backupDir: this.data.backupDir ?? null,
      dailyGoal: this.data.dailyGoal ?? DEFAULT_SETTINGS.dailyGoal,
      editorFont: this.data.editorFont ?? DEFAULT_SETTINGS.editorFont,
      editorSize: this.data.editorSize ?? DEFAULT_SETTINGS.editorSize,
      editorWidth: this.data.editorWidth ?? DEFAULT_SETTINGS.editorWidth,
      editorTheme: this.data.editorTheme ?? DEFAULT_SETTINGS.editorTheme,
      monthlyBudgetUsd: this.data.monthlyBudgetUsd ?? null,
      aiSpentUsd: this.getAiSpentUsd()
    }
  }

  update(patch: SettingsUpdate): AppSettings {
    if (patch.provider && patch.provider !== this.data.provider) {
      this.data.provider = patch.provider
      // Se non specificato, allinea il modello al default del nuovo provider.
      if (!patch.model) this.data.model = DEFAULT_MODEL[patch.provider]
    }
    if (patch.model) this.data.model = patch.model
    if (patch.mode) this.data.mode = patch.mode
    if (patch.language) this.data.language = patch.language
    if (patch.lastProjectId !== undefined) this.data.lastProjectId = patch.lastProjectId
    if (patch.onboardingDone !== undefined) this.data.onboardingDone = patch.onboardingDone
    if (patch.backupDir !== undefined) this.data.backupDir = patch.backupDir
    if (patch.dailyGoal !== undefined) this.data.dailyGoal = patch.dailyGoal
    if (patch.editorFont !== undefined) this.data.editorFont = patch.editorFont
    if (patch.editorSize !== undefined) this.data.editorSize = patch.editorSize
    if (patch.editorWidth !== undefined) this.data.editorWidth = patch.editorWidth
    if (patch.editorTheme !== undefined) this.data.editorTheme = patch.editorTheme
    if (patch.monthlyBudgetUsd !== undefined) this.data.monthlyBudgetUsd = patch.monthlyBudgetUsd
    this.save()
    return this.get()
  }

  setKey(provider: Exclude<AIProviderId, 'mock'>, key: string): AppSettings {
    const trimmed = key.trim()
    if (trimmed) this.data.keys[provider] = this.encrypt(trimmed)
    else delete this.data.keys[provider]
    this.save()
    return this.get()
  }

  clearKey(provider: Exclude<AIProviderId, 'mock'>): AppSettings {
    delete this.data.keys[provider]
    this.save()
    return this.get()
  }

  // --- Budget AI (US-29.7) ----------------------------------------------------

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7)
  }

  getMonthlyBudgetUsd(): number | null {
    return this.data.monthlyBudgetUsd ?? null
  }

  /** Spesa del mese corrente (azzerata automaticamente al cambio mese). */
  getAiSpentUsd(): number {
    const spend = this.data.aiSpend ?? { month: '', usd: 0 }
    return spend.month === this.currentMonth() ? spend.usd : 0
  }

  addAiSpend(usd: number): void {
    const month = this.currentMonth()
    const spend = this.data.aiSpend ?? { month: '', usd: 0 }
    this.data.aiSpend =
      spend.month === month ? { month, usd: spend.usd + usd } : { month, usd }
    this.save()
  }

  /** Risoluzione per il gateway (main-only). */
  resolveAi(): ResolvedAiConfig {
    const provider = this.data.provider
    const apiKey =
      provider === 'mock' ? null : this.decrypt(this.data.keys[provider] ?? '') ?? null
    return { mode: this.data.mode, provider, model: this.data.model, apiKey }
  }
}
