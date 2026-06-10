/** Conteggio parole di un testo Markdown (US-2.5). Approssimazione robusta e offline. */
export function countWords(text: string): number {
  const cleaned = text
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ') // code
    .replace(/[#>*_~\-|]/g, ' ') // simboli markdown comuni
    .trim()
  if (!cleaned) return 0
  return cleaned.split(/\s+/).filter(Boolean).length
}
