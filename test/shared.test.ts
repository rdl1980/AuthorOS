import { describe, it, expect } from 'vitest'
import { countWords } from '../src/shared/text'
import { suggestFramework, BEAT_TEMPLATES, FRAMEWORKS } from '../src/shared/frameworks'

describe('countWords (US-2.5)', () => {
  it('conta le parole ignorando i simboli Markdown', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords('uno due tre')).toBe(3)
    expect(countWords('# Titolo\n\n- punto **uno**')).toBe(3)
  })
})

describe('suggestFramework (US-1.2)', () => {
  it('mappa generi noti e gestisce input vuoti', () => {
    expect(suggestFramework('Fantasy')).toBe("Hero's Journey")
    expect(suggestFramework('Thriller')).toBe('Save The Cat Writes a Novel')
    expect(suggestFramework(null)).toBeNull()
    expect(suggestFramework('Genere inesistente')).toBeNull()
  })
})

describe('BEAT_TEMPLATES (Epic 4)', () => {
  it('ogni framework ha un template di beat non vuoto', () => {
    for (const f of FRAMEWORKS) {
      expect(BEAT_TEMPLATES[f].length).toBeGreaterThan(0)
    }
  })

  it('numero di beat atteso per i framework principali', () => {
    expect(BEAT_TEMPLATES["Hero's Journey"]).toHaveLength(9)
    expect(BEAT_TEMPLATES['Save The Cat Writes a Novel']).toHaveLength(14)
    expect(BEAT_TEMPLATES['Seven Point Story Structure']).toHaveLength(7)
  })
})
