import JSZip from 'jszip'
import { marked } from 'marked'
import { escapeHtml, type ManuscriptModel } from './builder'

const CSS = `body{font-family:serif;line-height:1.6}h1{text-align:center;margin:2em 0}
.scene-sep{text-align:center;margin:1.4em 0}p{text-indent:1.3em;margin:0 0 .2em;text-align:justify}`

const xhtml = (title: string, body: string): string =>
  `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html>` +
  `<html xmlns="http://www.w3.org/1999/xhtml" lang="it"><head><title>${escapeHtml(title)}</title>` +
  `<link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`

/** Genera il manoscritto in formato EPUB 3 (US-16.2) costruendo lo zip a mano. */
export async function buildEpub(model: ManuscriptModel, uid: string): Promise<Buffer> {
  marked.setOptions({ gfm: true, breaks: true })
  const zip = new JSZip()

  // Il mimetype DEVE essere la prima voce, non compressa.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="utf-8"?>` +
      `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
      `<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  )

  const chapterFiles = model.chapters.map((ch, i) => {
    const id = `ch${i + 1}`
    const body =
      `<h1>${escapeHtml(ch.title)}</h1>` +
      ch.scenes
        .map((s, j) => (j > 0 ? `<div class="scene-sep">* * *</div>` : '') + marked.parse(s.content))
        .join('')
    zip.file(`OEBPS/${id}.xhtml`, xhtml(ch.title, body))
    return { id, title: ch.title }
  })

  const nav =
    `<h1>Indice</h1><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol>` +
    chapterFiles.map((c) => `<li><a href="${c.id}.xhtml">${escapeHtml(c.title)}</a></li>`).join('') +
    `</ol></nav>`
  zip.file(
    'OEBPS/nav.xhtml',
    xhtml('Indice', nav).replace('<html ', '<html xmlns:epub="http://www.idpf.org/2007/ops" ')
  )
  zip.file('OEBPS/style.css', CSS)

  const manifest =
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>` +
    `<item id="css" href="style.css" media-type="text/css"/>` +
    chapterFiles
      .map((c) => `<item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
      .join('')
  const spine = chapterFiles.map((c) => `<itemref idref="${c.id}"/>`).join('')
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>` +
      `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">` +
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
      `<dc:identifier id="uid">urn:uuid:${uid}</dc:identifier>` +
      `<dc:title>${escapeHtml(model.title)}</dc:title><dc:language>it</dc:language>` +
      `<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>` +
      `</metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`
  )

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/epub+zip'
  })
}
