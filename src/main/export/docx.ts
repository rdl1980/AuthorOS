import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  TextRun
} from 'docx'
import { markdownToPlainParagraphs, type ManuscriptModel } from './builder'

/** Genera il manoscritto in formato DOCX (US-16.1). */
export async function buildDocx(model: ManuscriptModel): Promise<Buffer> {
  const fm = model.frontMatter
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: model.title })]
    })
  ]
  if (fm?.author) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: fm.author, size: 28 })]
      })
    )
  }
  if (fm?.copyright) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 4800 },
        children: [new TextRun({ text: fm.copyright, size: 18, color: '555555' })]
      })
    )
  }
  if (fm?.dedication) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        pageBreakBefore: true,
        spacing: { before: 4800 },
        children: [new TextRun({ text: fm.dedication, italics: true })]
      })
    )
  }

  for (const ch of model.chapters) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        children: [new TextRun({ text: ch.title })]
      })
    )
    ch.scenes.forEach((scene, i) => {
      if (i > 0) {
        children.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '* * *' })] })
        )
      }
      for (const para of markdownToPlainParagraphs(scene.content)) {
        children.push(new Paragraph({ children: [new TextRun({ text: para })] }))
      }
    })
  }

  const doc = new Document({
    creator: 'AuthorOS',
    title: model.title,
    sections: [{ children }]
  })
  return Packer.toBuffer(doc)
}

const SHUNN_FONT = 'Times New Roman'
const SHUNN = { font: SHUNN_FONT, size: 24 } as const // 12pt (half-points)

const shunnPara = (
  text: string,
  opts: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    indent?: boolean
    pageBreakBefore?: boolean
    spaceBefore?: number
  } = {}
): Paragraph =>
  new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    pageBreakBefore: opts.pageBreakBefore,
    spacing: { line: 480, before: opts.spaceBefore ?? 0, after: 0 }, // doppia interlinea
    indent: opts.indent ? { firstLine: 720 } : undefined, // rientro 0,5"
    children: [new TextRun({ text, ...SHUNN })]
  })

/**
 * US-31.1: manoscritto in formato standard (Shunn): Times New Roman 12,
 * doppia interlinea, rientro prima riga 0,5", intestazione «Cognome / TITOLO / pagina»,
 * blocco contatti + conteggio parole in prima pagina, separatore scena «#»,
 * ogni capitolo su pagina nuova con titolo centrato a un terzo di pagina.
 */
/** Particelle che fanno parte del cognome ("De Luca", "Della Rocca", "van Gogh"…). */
const SURNAME_PARTICLES = new Set([
  'de', 'di', 'del', 'della', 'delle', 'dei', 'degli', 'da', 'dal', 'dalla',
  'la', 'le', 'lo', 'van', 'von', 'der', 'den', 'mac', 'mc', 'san', 'santa'
])

/** Ultimo cognome, includendo le particelle che lo precedono. */
export function surnameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  let start = parts.length - 1
  while (start > 0 && SURNAME_PARTICLES.has(parts[start - 1].toLowerCase())) start -= 1
  return parts.slice(start).join(' ')
}

export async function buildDocxShunn(model: ManuscriptModel): Promise<Buffer> {
  const author = model.frontMatter?.author?.trim() || 'Autore'
  const surname = surnameOf(author)
  const roundedWords = Math.max(100, Math.round(model.words / 100) * 100)

  const children: Paragraph[] = [
    // Blocco contatti in alto a sinistra (prima pagina)
    shunnPara(author),
    ...(model.frontMatter?.copyright ? [shunnPara(model.frontMatter.copyright)] : []),
    shunnPara(`Circa ${roundedWords.toLocaleString('it-IT')} parole`),
    // Titolo e byline al centro pagina
    shunnPara(model.title.toUpperCase(), { align: AlignmentType.CENTER, spaceBefore: 3600 }),
    shunnPara(`di ${author}`, { align: AlignmentType.CENTER })
  ]
  if (model.frontMatter?.dedication) {
    children.push(
      shunnPara(model.frontMatter.dedication, {
        align: AlignmentType.CENTER,
        pageBreakBefore: true,
        spaceBefore: 3600
      })
    )
  }

  model.chapters.forEach((ch, ci) => {
    // Titolo capitolo centrato, a circa un terzo di pagina
    children.push(
      shunnPara(ch.title.toUpperCase(), {
        align: AlignmentType.CENTER,
        pageBreakBefore: true,
        spaceBefore: 2880
      })
    )
    ch.scenes.forEach((scene, si) => {
      if (si > 0) children.push(shunnPara('#', { align: AlignmentType.CENTER }))
      for (const para of markdownToPlainParagraphs(scene.content)) {
        children.push(shunnPara(para, { indent: true }))
      }
    })
    if (ci === model.chapters.length - 1) {
      children.push(shunnPara('FINE', { align: AlignmentType.CENTER }))
    }
  })

  const doc = new Document({
    creator: 'AuthorOS',
    title: model.title,
    styles: {
      default: { document: { run: { font: SHUNN_FONT, size: 24 } } }
    },
    sections: [
      {
        properties: {
          page: {
            // margini 1" (1440 twips) su tutti i lati
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${surname} / ${model.title.toUpperCase()} / `,
                    ...SHUNN
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], ...SHUNN })
                ]
              })
            ]
          })
        },
        footers: { default: new Footer({ children: [] }) },
        children
      }
    ]
  })
  return Packer.toBuffer(doc)
}
