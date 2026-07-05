import JSZip from 'jszip'
import { marked } from 'marked'
import { escapeHtml, type ManuscriptModel } from './builder'

const CSS = `body{font-family:serif;line-height:1.6}h1{text-align:center;margin:2em 0}
.scene-sep{text-align:center;margin:1.4em 0}p{text-indent:1.3em;margin:0 0 .2em;text-align:justify}`

const xhtml = (title: string, body: string): string =>
  `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html>` +
  `<html xmlns="http://www.w3.org/1999/xhtml" lang="it"><head><title>${escapeHtml(title)}</title>` +
  `<link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`

/** Immagine di copertina per l'EPUB (US-31.3). */
export interface EpubCover {
  data: Buffer
  /** 'jpeg' | 'png' */
  mediaType: 'image/jpeg' | 'image/png'
}

/** Genera il manoscritto in formato EPUB 3 (US-16.2 + US-31.2/31.3). */
export async function buildEpub(
  model: ManuscriptModel,
  uid: string,
  cover?: EpubCover
): Promise<Buffer> {
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

  // Copertina (US-31.3): pagina immagine a tutto schermo come prima voce dello spine.
  const coverExt = cover?.mediaType === 'image/png' ? 'png' : 'jpg'
  if (cover) {
    zip.file(`OEBPS/cover.${coverExt}`, cover.data)
    zip.file(
      'OEBPS/cover.xhtml',
      xhtml(
        'Copertina',
        `<div style="text-align:center;margin:0"><img src="cover.${coverExt}" alt="Copertina" style="max-width:100%;max-height:100%"/></div>`
      )
    )
  }

  // Frontespizio + front matter (US-31.2)
  const fm = model.frontMatter
  const titleBody =
    `<div style="text-align:center;margin-top:30%">` +
    `<h1 style="font-size:2em">${escapeHtml(model.title)}</h1>` +
    (fm?.author ? `<p style="font-size:1.2em">${escapeHtml(fm.author)}</p>` : '') +
    `</div>` +
    (fm?.copyright
      ? `<p style="text-align:center;font-size:.8em;margin-top:6em">${escapeHtml(fm.copyright)}</p>`
      : '')
  zip.file('OEBPS/title.xhtml', xhtml(model.title, titleBody))
  if (fm?.dedication) {
    zip.file(
      'OEBPS/dedication.xhtml',
      xhtml('Dedica', `<p style="text-align:center;font-style:italic;margin-top:40%">${escapeHtml(fm.dedication)}</p>`)
    )
  }

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
    (cover
      ? `<item id="cover-image" href="cover.${coverExt}" media-type="${cover.mediaType}" properties="cover-image"/>` +
        `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`
      : '') +
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>` +
    (fm?.dedication
      ? `<item id="dedication" href="dedication.xhtml" media-type="application/xhtml+xml"/>`
      : '') +
    chapterFiles
      .map((c) => `<item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
      .join('')
  const spine =
    (cover ? `<itemref idref="cover" linear="yes"/>` : '') +
    `<itemref idref="title"/>` +
    (fm?.dedication ? `<itemref idref="dedication"/>` : '') +
    chapterFiles.map((c) => `<itemref idref="${c.id}"/>`).join('')
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>` +
      `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">` +
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
      `<dc:identifier id="uid">urn:uuid:${uid}</dc:identifier>` +
      `<dc:title>${escapeHtml(model.title)}</dc:title><dc:language>it</dc:language>` +
      (fm?.author ? `<dc:creator>${escapeHtml(fm.author)}</dc:creator>` : '') +
      `<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>` +
      (cover ? `<meta name="cover" content="cover-image"/>` : '') +
      `</metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`
  )

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/epub+zip'
  })
}
