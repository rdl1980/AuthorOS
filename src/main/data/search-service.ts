import { eq } from 'drizzle-orm'
import type { SearchResult } from '@shared/search'
import type { DB } from './db'
import { chapters, characters, notes, scenes, timelineEvents } from './schema'

/** Estratto di ~90 caratteri attorno alla prima corrispondenza. */
function snippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query)
  if (idx < 0) return text.slice(0, 90).trim()
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 50)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

/**
 * Ricerca full-text nel progetto (US-24.1): scene (titolo+contenuto), capitoli,
 * note, personaggi ed eventi. Case-insensitive, deterministica, offline.
 */
export class SearchService {
  constructor(private readonly db: DB) {}

  search(projectId: string, rawQuery: string): SearchResult[] {
    const q = rawQuery.trim().toLowerCase()
    if (q.length < 2) return []
    const orm = this.db.orm
    const results: SearchResult[] = []
    const matches = (...fields: (string | null)[]): boolean =>
      fields.some((f) => f && f.toLowerCase().includes(q))

    for (const s of orm.select().from(scenes).where(eq(scenes.projectId, projectId)).all()) {
      if (matches(s.title, s.content)) {
        results.push({
          kind: 'scene',
          id: s.id,
          title: s.title,
          chapterId: s.chapterId,
          snippet: snippet(s.title.toLowerCase().includes(q) ? s.title : s.content, q)
        })
      }
    }
    for (const c of orm.select().from(chapters).where(eq(chapters.projectId, projectId)).all()) {
      if (matches(c.title)) {
        results.push({ kind: 'chapter', id: c.id, title: c.title, snippet: c.title })
      }
    }
    for (const n of orm.select().from(notes).where(eq(notes.projectId, projectId)).all()) {
      if (matches(n.content)) {
        results.push({ kind: 'note', id: n.id, title: 'Nota', snippet: snippet(n.content, q) })
      }
    }
    for (const ch of orm.select().from(characters).where(eq(characters.projectId, projectId)).all()) {
      if (matches(ch.name, ch.summary, ch.traits, ch.appearance)) {
        const source = ch.name.toLowerCase().includes(q) ? ch.name : `${ch.summary} ${ch.traits}`
        results.push({ kind: 'character', id: ch.id, title: ch.name, snippet: snippet(source, q) })
      }
    }
    for (const ev of orm
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.projectId, projectId))
      .all()) {
      if (matches(ev.title, ev.description, ev.location)) {
        const source = ev.title.toLowerCase().includes(q) ? ev.title : ev.description
        results.push({ kind: 'event', id: ev.id, title: ev.title, snippet: snippet(source, q) })
      }
    }
    return results
  }
}
