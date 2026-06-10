// Analisi testuale deterministica per l'AI Editor (Epic 10).
// Gira in locale, offline e a costo zero: ripetizioni (US-10.1) e statistiche
// di ritmo (base di US-10.4). Le valutazioni qualitative restano all'AI.

export interface RepetitionFinding {
  kind: 'word' | 'phrase'
  term: string
  count: number
  /** Distanza minima (in parole) tra due occorrenze consecutive. */
  minGap: number
}

export interface PacingStats {
  words: number
  sentences: number
  avgSentenceLen: number
  maxSentenceLen: number
  paragraphs: number
  avgParagraphLen: number
  maxParagraphLen: number
  /** Quota approssimativa di testo in dialogo (0..1). */
  dialogueRatio: number
}

const STOPWORDS = new Set(
  (
    'di a da in con su per tra fra il lo la i gli le un uno una e o ma se che chi cui non come dove ' +
    'quando anche ancora già solo poi qui questo questa questi queste quello quella quelli quelle ' +
    'suo sua suoi sue mio mia miei mie tuo tua tuoi tue nostro nostra vostro vostra loro essere avere ' +
    'era erano sono sei sarò sarà stato stata stati state aveva avevano abbiamo avete hanno della ' +
    'delle dello degli nella nelle negli sulla sulle sugli dalla dalle dagli alla alle agli allo ' +
    'però quindi mentre perché poiché dopo prima contro verso senza sotto sopra ogni tutto tutta ' +
    'tutti tutte tanto molto poco troppo cosa cose modo volta volte verso essa esso essi esse aver ' +
    'fare fatto fece detto cosi così quel quei quegli alcun alcuni alcune nessun nessuno qualche più'
  ).split(/\s+/)
)

/** Tokenizza in parole normalizzate (minuscole, senza punteggiatura). */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-zà-ù]+/g) ?? []).filter(Boolean)
}

/**
 * Ripetizioni (US-10.1): parole significative che ricorrono ravvicinate e
 * locuzioni (trigrammi) ripetute. Deterministico.
 */
export function analyzeRepetitions(text: string): RepetitionFinding[] {
  const words = tokenize(text)
  const findings: RepetitionFinding[] = []

  // Parole significative ripetute a distanza ravvicinata
  const positions = new Map<string, number[]>()
  words.forEach((w, i) => {
    if (w.length < 4 || STOPWORDS.has(w)) return
    const arr = positions.get(w)
    if (arr) arr.push(i)
    else positions.set(w, [i])
  })
  for (const [term, pos] of positions) {
    if (pos.length < 2) continue
    let minGap = Infinity
    for (let i = 1; i < pos.length; i++) minGap = Math.min(minGap, pos[i] - pos[i - 1])
    const flagged = (pos.length >= 3 && minGap <= 120) || (pos.length >= 2 && minGap <= 30)
    if (flagged) findings.push({ kind: 'word', term, count: pos.length, minGap })
  }

  // Locuzioni ripetute (trigrammi non banali)
  const trigrams = new Map<string, number>()
  for (let i = 0; i + 2 < words.length; i++) {
    const tri = [words[i], words[i + 1], words[i + 2]]
    if (tri.every((w) => STOPWORDS.has(w) || w.length < 3)) continue
    const key = tri.join(' ')
    trigrams.set(key, (trigrams.get(key) ?? 0) + 1)
  }
  for (const [term, count] of trigrams) {
    if (count >= 2) findings.push({ kind: 'phrase', term, count, minGap: 0 })
  }

  return findings.sort((a, b) => b.count - a.count).slice(0, 20)
}

/** Statistiche di ritmo (US-10.4, parte deterministica). */
export function analyzePacing(text: string): PacingStats {
  const words = tokenize(text)

  const sentences = text
    .split(/[.!?…]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const sentenceLens = sentences.map((s) => tokenize(s).length).filter((n) => n > 0)

  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  const paragraphLens = paragraphs.map((p) => tokenize(p).length).filter((n) => n > 0)

  // Dialogo: testo tra virgolette («…», “…”, "…") o righe che iniziano con lineetta.
  let dialogueChars = 0
  for (const m of text.matchAll(/«[^»]*»|“[^”]*”|"[^"\n]*"/g)) dialogueChars += m[0].length
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (/^[—–-]\s?\S/.test(t)) dialogueChars += t.length
  }
  const totalChars = text.trim().length

  const avg = (arr: number[]): number =>
    arr.length ? Math.round((arr.reduce((a, n) => a + n, 0) / arr.length) * 10) / 10 : 0

  return {
    words: words.length,
    sentences: sentenceLens.length,
    avgSentenceLen: avg(sentenceLens),
    maxSentenceLen: sentenceLens.length ? Math.max(...sentenceLens) : 0,
    paragraphs: paragraphLens.length,
    avgParagraphLen: avg(paragraphLens),
    maxParagraphLen: paragraphLens.length ? Math.max(...paragraphLens) : 0,
    dialogueRatio: totalChars ? Math.min(1, Math.round((dialogueChars / totalChars) * 100) / 100) : 0
  }
}
