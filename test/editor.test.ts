import { describe, it, expect } from 'vitest'
import { analyzePacing, analyzeRepetitions } from '../src/shared/editor'

describe('analyzeRepetitions (US-10.1)', () => {
  it('rileva una parola significativa ripetuta ravvicinata', () => {
    const text =
      'Il vento soffiava forte. Il vento non dava tregua, e ancora il vento scuoteva le imposte.'
    const found = analyzeRepetitions(text)
    const vento = found.find((f) => f.term === 'vento')
    expect(vento).toBeDefined()
    expect(vento!.count).toBe(3)
    expect(vento!.kind).toBe('word')
  })

  it('rileva locuzioni ripetute (trigrammi)', () => {
    const text =
      'Si voltò verso la porta chiusa e attese. Poi, di nuovo, guardò verso la porta chiusa senza parlare.'
    const found = analyzeRepetitions(text)
    expect(found.some((f) => f.kind === 'phrase' && f.term.includes('porta chiusa'))).toBe(true)
  })

  it('non segnala stopword né testi puliti', () => {
    const text = 'Anna aprì la finestra. Fuori pioveva, e il giardino sembrava un acquerello sbiadito.'
    const found = analyzeRepetitions(text)
    expect(found.find((f) => f.term === 'della' || f.term === 'anche')).toBeUndefined()
    expect(found).toHaveLength(0)
  })
})

describe('analyzePacing (US-10.4, parte locale)', () => {
  it('calcola frasi, paragrafi e medie', () => {
    const text = 'Prima frase corta. Seconda frase un poco più lunga davvero.\n\nNuovo paragrafo qui.'
    const p = analyzePacing(text)
    expect(p.sentences).toBe(3)
    expect(p.paragraphs).toBe(2)
    expect(p.words).toBeGreaterThan(0)
    expect(p.avgSentenceLen).toBeGreaterThan(0)
    expect(p.maxSentenceLen).toBeGreaterThanOrEqual(p.avgSentenceLen)
  })

  it('stima la quota di dialogo', () => {
    const conDialogo = '«Vieni qui» disse lei. «Subito, ti prego, non perdere altro tempo.»'
    const senzaDialogo = 'Il sole calava dietro le colline mentre la corriera arrancava sul passo.'
    expect(analyzePacing(conDialogo).dialogueRatio).toBeGreaterThan(0.4)
    expect(analyzePacing(senzaDialogo).dialogueRatio).toBe(0)
  })

  it('gestisce il testo vuoto senza errori', () => {
    const p = analyzePacing('')
    expect(p.words).toBe(0)
    expect(p.sentences).toBe(0)
    expect(p.dialogueRatio).toBe(0)
  })
})
