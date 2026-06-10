import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type {
  EventCharacterLink,
  NewTimelineEvent,
  TimelineEvent,
  TimelineEventUpdate,
  TimelineIssue
} from '@shared/domain'
import type { DB } from './db'
import { eventCharacters, timelineEvents } from './schema'
import type { TimelineRepository } from './types'

const now = (): string => new Date().toISOString()

export class SqliteTimelineRepository implements TimelineRepository {
  constructor(private readonly db: DB) {}

  private get orm() {
    return this.db.orm
  }

  listEvents(projectId: string): TimelineEvent[] {
    return this.orm
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.projectId, projectId))
      .orderBy(asc(timelineEvents.sortOrder))
      .all()
  }

  createEvent(projectId: string, input: NewTimelineEvent): TimelineEvent {
    const ts = now()
    const event: TimelineEvent = {
      id: randomUUID(),
      projectId,
      title: input.title.trim() || 'Evento',
      description: input.description ?? '',
      whenLabel: input.whenLabel ?? '',
      dateValue: input.dateValue ?? null,
      location: input.location ?? '',
      sortOrder: this.listEvents(projectId).length,
      createdAt: ts,
      updatedAt: ts
    }
    this.orm.insert(timelineEvents).values(event).run()
    this.db.persist()
    return event
  }

  updateEvent(id: string, patch: TimelineEventUpdate): TimelineEvent | null {
    const current = this.orm.select().from(timelineEvents).where(eq(timelineEvents.id, id)).get()
    if (!current) return null
    this.orm
      .update(timelineEvents)
      .set({
        title: patch.title !== undefined ? patch.title : current.title,
        description: patch.description !== undefined ? patch.description : current.description,
        whenLabel: patch.whenLabel !== undefined ? patch.whenLabel : current.whenLabel,
        dateValue: patch.dateValue !== undefined ? patch.dateValue : current.dateValue,
        location: patch.location !== undefined ? patch.location : current.location,
        updatedAt: now()
      })
      .where(eq(timelineEvents.id, id))
      .run()
    this.db.persist()
    return this.orm.select().from(timelineEvents).where(eq(timelineEvents.id, id)).get() ?? null
  }

  deleteEvent(id: string): boolean {
    this.orm.delete(eventCharacters).where(eq(eventCharacters.eventId, id)).run()
    this.orm.delete(timelineEvents).where(eq(timelineEvents.id, id)).run()
    this.db.persist()
    return true
  }

  reorder(_projectId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      this.orm
        .update(timelineEvents)
        .set({ sortOrder: index, updatedAt: now() })
        .where(eq(timelineEvents.id, id))
        .run()
    })
    this.db.persist()
  }

  links(projectId: string): EventCharacterLink[] {
    const eventIds = this.listEvents(projectId).map((e) => e.id)
    if (!eventIds.length) return []
    return this.orm
      .select({ eventId: eventCharacters.eventId, characterId: eventCharacters.characterId })
      .from(eventCharacters)
      .where(inArray(eventCharacters.eventId, eventIds))
      .all()
  }

  linkCharacter(eventId: string, characterId: string): void {
    const existing = this.orm
      .select()
      .from(eventCharacters)
      .where(and(eq(eventCharacters.eventId, eventId), eq(eventCharacters.characterId, characterId)))
      .get()
    if (existing) return
    this.orm.insert(eventCharacters).values({ id: randomUUID(), eventId, characterId }).run()
    this.db.persist()
  }

  unlinkCharacter(eventId: string, characterId: string): void {
    this.orm
      .delete(eventCharacters)
      .where(and(eq(eventCharacters.eventId, eventId), eq(eventCharacters.characterId, characterId)))
      .run()
    this.db.persist()
  }

  /**
   * Check deterministico (US-9.3): tra gli eventi con valore cronologico, segnala
   * quelli il cui ordine manuale contraddice la cronologia.
   */
  issues(projectId: string): TimelineIssue[] {
    const dated = this.listEvents(projectId).filter((e) => e.dateValue !== null)
    const out: TimelineIssue[] = []
    for (let i = 1; i < dated.length; i++) {
      const prev = dated[i - 1]
      const cur = dated[i]
      if ((cur.dateValue as number) < (prev.dateValue as number)) {
        out.push({
          eventId: cur.id,
          message:
            `«${cur.title}» (${cur.whenLabel || cur.dateValue}) è posizionato dopo ` +
            `«${prev.title}» (${prev.whenLabel || prev.dateValue}) ma è cronologicamente precedente.`
        })
      }
    }
    return out
  }
}
