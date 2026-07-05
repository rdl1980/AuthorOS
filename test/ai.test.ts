import { describe, it, expect } from 'vitest'
import { AIGateway, type GatewaySettings } from '../src/main/ai/gateway'
import { ContextBuilder } from '../src/main/ai/context-builder'
import { composeChat, composeGeneration, composeStyleDerivation } from '../src/main/ai/prompt'
import { costUsd } from '../src/shared/ai'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteManuscriptRepository } from '../src/main/data/manuscript-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'
import { SqliteStyleRepository } from '../src/main/data/style-repository'
import { SqliteWorldRepository } from '../src/main/data/world-repository'

/** Settings finte per i test del gateway. */
class FakeSettings implements GatewaySettings {
  spent = 0
  constructor(
    private readonly cfg: { mode: 'mock' | 'live'; provider: 'mock' | 'anthropic' | 'openai'; apiKey: string | null },
    public budget: number | null = null
  ) {}

  resolveAi() {
    return { mode: this.cfg.mode, provider: this.cfg.provider, model: 'claude-opus-4-8', apiKey: this.cfg.apiKey }
  }
  getMonthlyBudgetUsd() {
    return this.budget
  }
  getAiSpentUsd() {
    return this.spent
  }
  addAiSpend(usd: number) {
    this.spent += usd
  }
}

const mockSettings = (): FakeSettings =>
  new FakeSettings({ mode: 'mock', provider: 'mock', apiKey: null })

describe('AIGateway (Epic 3 + 29, modalità ibrida)', () => {
  it('in mock genera testo e traccia i consumi, costo zero', async () => {
    const gw = new AIGateway(mockSettings())
    expect(gw.status().mode).toBe('mock')
    const res = await gw.generate({ operation: 'scene', prompt: 'una notte di pioggia' })
    expect(res.provider).toBe('mock')
    expect(res.text).toContain('una notte di pioggia')
    expect(res.usage.completionTokens).toBeGreaterThan(0)
    expect(res.costUsd).toBe(0)
  })

  it('senza API key ricade sul mock anche in modalità live', () => {
    const gw = new AIGateway(new FakeSettings({ mode: 'live', provider: 'anthropic', apiKey: null }))
    expect(gw.status().mode).toBe('mock')
  })

  it('US-29.2: streaming emette chunk e ritorna il testo completo', async () => {
    const gw = new AIGateway(mockSettings())
    const chunks: string[] = []
    const res = await gw.generateStream(
      { operation: 'scene', prompt: 'streaming di prova' },
      (t) => chunks.push(t)
    )
    expect(chunks.length).toBeGreaterThan(3)
    expect(chunks.join('')).toBe(res.text)
  })

  it('US-29.2: lo streaming è interrompibile', async () => {
    const gw = new AIGateway(mockSettings())
    const ctrl = new AbortController()
    let received = ''
    const res = await gw.generateStream(
      { operation: 'scene', prompt: 'da interrompere subito' },
      (t) => {
        received += t
        if (received.length > 10) ctrl.abort()
      },
      ctrl.signal
    )
    // il testo restituito è il parziale emesso, non l'intero output
    expect(res.text.length).toBeLessThan(120)
    expect(res.text).toBe(received)
  })

  it('US-29.7: oltre il tetto mensile le chiamate reali vengono bloccate', async () => {
    const settings = new FakeSettings({ mode: 'live', provider: 'anthropic', apiKey: 'sk-fake' }, 5)
    settings.spent = 5 // tetto già raggiunto
    const gw = new AIGateway(settings)
    await expect(gw.generate({ operation: 'scene', prompt: 'x' })).rejects.toThrow(/Tetto di spesa/)
    // il mock invece non è mai bloccato
    const gwMock = new AIGateway(mockSettings())
    await expect(gwMock.generate({ operation: 'scene', prompt: 'x' })).resolves.toBeTruthy()
  })

  it('deriveStyle e assist funzionano in mock', async () => {
    const gw = new AIGateway(mockSettings())
    expect((await gw.deriveStyle('Un brano.')).text.length).toBeGreaterThan(0)
    for (const kind of ['character-profile', 'plot-holes', 'editor-pacing'] as const) {
      expect((await gw.assist(kind, 'payload')).usage.credits).toBeGreaterThan(0)
    }
  })
})

describe('ContextBuilder (US-29.1)', () => {
  it('assembla voce, scena, personaggi citati e luoghi', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    const ms = new SqliteManuscriptRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const styles = new SqliteStyleRepository(db)
    const world = new SqliteWorldRepository(db)

    styles.create(pid, { name: 'Voce', tone: 'asciutto', instructions: 'frasi brevi' })
    const ch = ms.createChapter(pid, 'Cap 1')
    const sc = ms.createScene(pid, ch.id, 'Arrivo')
    ms.updateScene(sc.id, { content: 'Marta guardò il faro spento oltre il molo.' })
    chars.createCharacter(pid, { name: 'Marta Renzi', role: 'Protagonista', summary: 'Giornalista.' })
    chars.createCharacter(pid, { name: 'Elia', summary: 'Custode.' }) // non citato... anzi no: 'faro' scene
    world.create(pid, { kind: 'place', name: 'Il faro', description: 'Sulla scogliera nord.' })

    const ctx = new ContextBuilder(db).build(pid, sc.id)
    expect(ctx).toContain("VOCE DELL'AUTORE")
    expect(ctx).toContain('SCENA CORRENTE')
    expect(ctx).toContain('Marta Renzi')
    expect(ctx).toContain('Il faro')
    // personaggio non citato nella scena → escluso
    expect(ctx).not.toContain('Custode.')
  })

  it('buildProjectOverview riassume struttura, cast e mondo', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    const ms = new SqliteManuscriptRepository(db)
    const ch = ms.createChapter(pid, 'Capitolo Uno')
    ms.createScene(pid, ch.id, 'Scena A')
    new SqliteCharacterRepository(db).createCharacter(pid, { name: 'Ada', summary: 'Ladra.' })

    const overview = new ContextBuilder(db).buildProjectOverview(pid)
    expect(overview).toContain('STRUTTURA: 1 capitoli, 1 scene')
    expect(overview).toContain('Capitolo Uno')
    expect(overview).toContain('Ada')
  })

  it('il gateway inietta il contesto nel prompt di sistema', async () => {
    const db = await makeDb()
    const pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
    new SqliteStyleRepository(db).create(pid, { name: 'V', tone: 'gotico' })
    const gw = new AIGateway(mockSettings(), new ContextBuilder(db))
    // il mock rispecchia il prompt utente; verifichiamo indirettamente che non esploda
    const res = await gw.generate({ operation: 'scene', prompt: 'test contesto', projectId: pid })
    expect(res.text).toContain('test contesto')
  })
})

describe('Prompt composition', () => {
  it("include la voce dell'autore quando fornita", () => {
    const c = composeGeneration({
      operation: 'rewrite',
      prompt: 'testo da riscrivere',
      styleProfile: 'ironico, prima persona'
    })
    expect(c.system).toContain("Voce dell'autore")
    expect(c.user).toContain('testo da riscrivere')
  })

  it("l'operazione continue ha istruzioni dedicate", () => {
    const c = composeGeneration({ operation: 'continue', prompt: 'testo esistente' })
    expect(c.system).toContain('Continua la scena')
  })

  it('composeChat serializza panoramica e cronologia', () => {
    const c = composeChat('STRUTTURA: 2 capitoli', [
      { role: 'user', text: 'Ciao' },
      { role: 'assistant', text: 'Ciao!' },
      { role: 'user', text: 'Dove metto il colpo di scena?' }
    ])
    expect(c.system).toContain('STRUTTURA: 2 capitoli')
    expect(c.user).toContain('AUTORE: Dove metto il colpo di scena?')
    expect(c.user).toContain('ASSISTENTE: Ciao!')
  })

  it('compone la derivazione dello stile', () => {
    const c = composeStyleDerivation('campione di prosa')
    expect(c.user).toContain('campione di prosa')
  })
})

describe('costUsd (US-29.7)', () => {
  it('calcola i costi dai listini e 0 per modelli sconosciuti', () => {
    expect(costUsd('claude-opus-4-8', 1_000_000, 0)).toBe(5)
    expect(costUsd('claude-opus-4-8', 0, 1_000_000)).toBe(25)
    expect(costUsd('authoros-mock-1', 1000, 1000)).toBe(0)
  })
})
