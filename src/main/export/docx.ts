import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { markdownToPlainParagraphs, type ManuscriptModel } from './builder'

/** Genera il manoscritto in formato DOCX (US-16.1). */
export async function buildDocx(model: ManuscriptModel): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: model.title })]
    })
  ]

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
          new Paragraph({ alignment: 'center', children: [new TextRun({ text: '* * *' })] })
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
