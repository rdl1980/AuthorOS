import { describe, it, expect, beforeEach } from 'vitest'
import type { DB } from '../src/main/data/db'
import { makeDb } from './helpers'
import { SqliteProjectRepository } from '../src/main/data/sqlite-repository'
import { SqliteCharacterRepository } from '../src/main/data/character-repository'
import { SqliteTimelineRepository } from '../src/main/data/timeline-repository'

let db: DB
let pid: string

beforeEach(async () => {
  db = await makeDb()
  pid = new SqliteProjectRepository(db).create({ title: 'Libro' }).id
})

describe('TimelineRepository (Epic 9)', () => {
  it('crea, aggiorna ed elenca eventi in ordine (US-9.1)', () => {
    const tl = new SqliteTimelineRepository(db)
    const a = tl.createEvent(pid, { title: 'Incidente', whenLabel: '1920', dateValue: 1920 })
    tl.createEvent(pid, { title: 'Vendetta', whenLabel: '1923', dateValue: 1923 })
    expect(tl.listEvents(pid).map((e) => e.title)).toEqual(['Incidente', 'Vendetta'])
    const u = tl.updateEvent(a.id, { location: 'Torino', description: 'Tutto inizia qui' })
    expect(u?.location).toBe('Torino')
  })

  it('riordina gli eventi', () => {
    const tl = new SqliteTimelineRepository(db)
    const a = tl.createEvent(pid, { title: 'A' })
    const b = tl.createEvent(pid, { title: 'B' })
    tl.reorder(pid, [b.id, a.id])
    expect(tl.listEvents(pid).map((e) => e.title)).toEqual(['B', 'A'])
  })

  it('collega e scollega personaggi, in modo idempotente (US-9.2)', () => {
    const tl = new SqliteTimelineRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const ada = chars.createCharacter(pid, { name: 'Ada' })
    const ev = tl.createEvent(pid, { title: 'Fuga' })
    tl.linkCharacter(ev.id, ada.id)
    tl.linkCharacter(ev.id, ada.id) // idempotente
    expect(tl.links(pid)).toHaveLength(1)
    tl.unlinkCharacter(ev.id, ada.id)
    expect(tl.links(pid)).toHaveLength(0)
  })

  it('rileva incoerenze ordine vs cronologia (US-9.3)', () => {
    const tl = new SqliteTimelineRepository(db)
    tl.createEvent(pid, { title: 'Dopo', whenLabel: '1930', dateValue: 1930 })
    const prima = tl.createEvent(pid, { title: 'Prima', whenLabel: '1920', dateValue: 1920 })
    // "Prima" (1920) è posizionato dopo "Dopo" (1930) → incoerenza
    const issues = tl.issues(pid)
    expect(issues).toHaveLength(1)
    expect(issues[0].eventId).toBe(prima.id)
    // riordinando correttamente, l'incoerenza sparisce
    tl.reorder(pid, [prima.id, tl.listEvents(pid).find((e) => e.title === 'Dopo')!.id])
    expect(tl.issues(pid)).toHaveLength(0)
    // eventi senza dateValue non generano falsi positivi
    tl.createEvent(pid, { title: 'Senza data' })
    expect(tl.issues(pid)).toHaveLength(0)
  })

  it('eliminare un evento o un personaggio pulisce i collegamenti', () => {
    const tl = new SqliteTimelineRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const ada = chars.createCharacter(pid, { name: 'Ada' })
    const ev = tl.createEvent(pid, { title: 'Fuga' })
    tl.linkCharacter(ev.id, ada.id)
    // delete evento → link rimossi
    tl.deleteEvent(ev.id)
    expect(tl.links(pid)).toHaveLength(0)
    // delete personaggio → link rimossi
    const ev2 = tl.createEvent(pid, { title: 'Ritorno' })
    tl.linkCharacter(ev2.id, ada.id)
    chars.deleteCharacter(ada.id)
    expect(tl.links(pid)).toHaveLength(0)
  })

  it('remove e duplicate del progetto includono la timeline', () => {
    const projects = new SqliteProjectRepository(db)
    const tl = new SqliteTimelineRepository(db)
    const chars = new SqliteCharacterRepository(db)
    const ada = chars.createCharacter(pid, { name: 'Ada' })
    const ev = tl.createEvent(pid, { title: 'Fuga', dateValue: 1920 })
    tl.linkCharacter(ev.id, ada.id)

    // duplicate: eventi e link rimappati
    const copy = projects.duplicate(pid)!
    const copiedEvents = tl.listEvents(copy.id)
    expect(copiedEvents).toHaveLength(1)
    const copiedLinks = tl.links(copy.id)
    expect(copiedLinks).toHaveLength(1)
    expect(copiedLinks[0].eventId).toBe(copiedEvents[0].id)
    expect(copiedLinks[0].characterId).not.toBe(ada.id)

    // remove: tutto pulito
    projects.remove(pid)
    expect(tl.listEvents(pid)).toHaveLength(0)
    expect(tl.links(pid)).toHaveLength(0)
  })
})
