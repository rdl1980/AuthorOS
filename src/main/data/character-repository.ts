import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import type {
  ArcStep,
  ArcUpdate,
  Character,
  CharacterArc,
  CharacterUpdate,
  NewCharacter,
  Relationship
} from '@shared/domain'
import type { DB } from './db'
import { arcSteps, characterArcs, characters, eventCharacters, relationships } from './schema'
import type { CharacterRepository } from './types'

const now = (): string => new Date().toISOString()

export class SqliteCharacterRepository implements CharacterRepository {
  constructor(private readonly db: DB) {}

  private get orm() {
    return this.db.orm
  }

  // --- Schede (US-6.1) ------------------------------------------------------

  listCharacters(projectId: string): Character[] {
    return this.orm
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(asc(characters.createdAt))
      .all()
  }

  createCharacter(projectId: string, input: NewCharacter): Character {
    const ts = now()
    const character: Character = {
      id: randomUUID(),
      projectId,
      name: input.name.trim() || 'Personaggio',
      role: input.role ?? '',
      summary: input.summary ?? '',
      appearance: input.appearance ?? '',
      traits: input.traits ?? '',
      createdAt: ts,
      updatedAt: ts
    }
    this.orm.insert(characters).values(character).run()
    this.db.persist()
    return character
  }

  updateCharacter(id: string, patch: CharacterUpdate): Character | null {
    const current = this.orm.select().from(characters).where(eq(characters.id, id)).get()
    if (!current) return null
    this.orm
      .update(characters)
      .set({
        name: patch.name !== undefined ? patch.name : current.name,
        role: patch.role !== undefined ? patch.role : current.role,
        summary: patch.summary !== undefined ? patch.summary : current.summary,
        appearance: patch.appearance !== undefined ? patch.appearance : current.appearance,
        traits: patch.traits !== undefined ? patch.traits : current.traits,
        updatedAt: now()
      })
      .where(eq(characters.id, id))
      .run()
    this.db.persist()
    return this.orm.select().from(characters).where(eq(characters.id, id)).get() ?? null
  }

  deleteCharacter(id: string): boolean {
    const arc = this.orm
      .select()
      .from(characterArcs)
      .where(eq(characterArcs.characterId, id))
      .get()
    if (arc) {
      this.orm.delete(arcSteps).where(eq(arcSteps.arcId, arc.id)).run()
      this.orm.delete(characterArcs).where(eq(characterArcs.id, arc.id)).run()
    }
    this.orm.delete(relationships).where(eq(relationships.fromId, id)).run()
    this.orm.delete(relationships).where(eq(relationships.toId, id)).run()
    this.orm.delete(eventCharacters).where(eq(eventCharacters.characterId, id)).run()
    this.orm.delete(characters).where(eq(characters.id, id)).run()
    this.db.persist()
    return true
  }

  // --- Relazioni (US-6.2) ---------------------------------------------------

  listRelationships(projectId: string): Relationship[] {
    return this.orm
      .select()
      .from(relationships)
      .where(eq(relationships.projectId, projectId))
      .orderBy(asc(relationships.createdAt))
      .all()
  }

  addRelationship(projectId: string, fromId: string, toId: string, label: string): Relationship {
    const rel: Relationship = {
      id: randomUUID(),
      projectId,
      fromId,
      toId,
      label: label.trim(),
      createdAt: now()
    }
    this.orm.insert(relationships).values(rel).run()
    this.db.persist()
    return rel
  }

  removeRelationship(id: string): boolean {
    this.orm.delete(relationships).where(eq(relationships.id, id)).run()
    this.db.persist()
    return true
  }

  // --- Arco (US-5.1/5.2) ------------------------------------------------------

  getArc(characterId: string): CharacterArc {
    const existing = this.orm
      .select()
      .from(characterArcs)
      .where(eq(characterArcs.characterId, characterId))
      .get()
    if (existing) return existing
    const ts = now()
    const arc: CharacterArc = {
      id: randomUUID(),
      characterId,
      desire: '',
      need: '',
      fear: '',
      wound: '',
      lie: '',
      transformation: '',
      createdAt: ts,
      updatedAt: ts
    }
    this.orm.insert(characterArcs).values(arc).run()
    this.db.persist()
    return arc
  }

  updateArc(characterId: string, patch: ArcUpdate): CharacterArc {
    const arc = this.getArc(characterId)
    this.orm
      .update(characterArcs)
      .set({
        desire: patch.desire !== undefined ? patch.desire : arc.desire,
        need: patch.need !== undefined ? patch.need : arc.need,
        fear: patch.fear !== undefined ? patch.fear : arc.fear,
        wound: patch.wound !== undefined ? patch.wound : arc.wound,
        lie: patch.lie !== undefined ? patch.lie : arc.lie,
        transformation:
          patch.transformation !== undefined ? patch.transformation : arc.transformation,
        updatedAt: now()
      })
      .where(eq(characterArcs.id, arc.id))
      .run()
    this.db.persist()
    return this.getArc(characterId)
  }

  // --- Tappe dell'arco (US-5.3) ----------------------------------------------

  listArcSteps(arcId: string): ArcStep[] {
    return this.orm
      .select()
      .from(arcSteps)
      .where(eq(arcSteps.arcId, arcId))
      .orderBy(asc(arcSteps.sortOrder))
      .all()
  }

  addArcStep(arcId: string, chapterId: string, description: string): ArcStep {
    const step: ArcStep = {
      id: randomUUID(),
      arcId,
      chapterId,
      description: description.trim(),
      sortOrder: this.listArcSteps(arcId).length,
      createdAt: now()
    }
    this.orm.insert(arcSteps).values(step).run()
    this.db.persist()
    return step
  }

  removeArcStep(id: string): boolean {
    this.orm.delete(arcSteps).where(eq(arcSteps.id, id)).run()
    this.db.persist()
    return true
  }
}
