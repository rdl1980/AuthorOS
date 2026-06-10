import { describe, it, expect } from 'vitest'
import { SettingsRepository } from '../src/main/data/settings-repository'
import { tempDir } from './helpers'

describe('SettingsRepository (Epic 22)', () => {
  it('default in mock; cambiando provider allinea il modello', () => {
    const s = new SettingsRepository(tempDir())
    expect(s.get().provider).toBe('mock')
    expect(s.get().hasAnthropicKey).toBe(false)
    const updated = s.update({ provider: 'anthropic' })
    expect(updated.model).toBe('claude-opus-4-8')
  })

  it('salva la API key (mai esposta) e la risolve per il gateway', () => {
    const s = new SettingsRepository(tempDir())
    s.update({ provider: 'anthropic' })
    const after = s.setKey('anthropic', 'sk-test-123')
    expect(after.hasAnthropicKey).toBe(true)
    // La vista pubblica non contiene la chiave
    expect(JSON.stringify(after)).not.toContain('sk-test-123')
    // La risoluzione interna (main-only) sì
    expect(s.resolveAi().apiKey).toBe('sk-test-123')
    s.update({ mode: 'live' })
    expect(s.resolveAi().mode).toBe('live')
    s.clearKey('anthropic')
    expect(s.get().hasAnthropicKey).toBe(false)
    expect(s.resolveAi().apiKey).toBeNull()
  })

  it('persiste impostazioni e chiave tra istanze', () => {
    const dir = tempDir()
    const a = new SettingsRepository(dir)
    a.update({ provider: 'anthropic', language: 'en' })
    a.setKey('anthropic', 'sk-persist')
    const b = new SettingsRepository(dir)
    expect(b.get().provider).toBe('anthropic')
    expect(b.get().language).toBe('en')
    expect(b.get().hasAnthropicKey).toBe(true)
    expect(b.resolveAi().apiKey).toBe('sk-persist')
  })
})
