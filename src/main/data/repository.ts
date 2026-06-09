import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { NewProject, Project } from '@shared/domain'

export interface ProjectRepository {
  list(): Project[]
  create(input: NewProject): Project
}

/**
 * Persistenza Fase 0 — store su file JSON dietro un'interfaccia repository.
 *
 * In Fase 1 questa implementazione verrà sostituita da una basata su SQLite + Drizzle
 * MANTENENDO la stessa interfaccia `ProjectRepository`, così il resto dell'app non cambia.
 * Lo schema dati (vedi @shared/domain) è già compatibile con SQLite/Postgres.
 */
export class FileProjectRepository implements ProjectRepository {
  private readonly dir = join(app.getPath('userData'), 'authoros-data')
  private readonly file = join(this.dir, 'projects.json')

  private read(): Project[] {
    if (!existsSync(this.file)) return []
    try {
      return JSON.parse(readFileSync(this.file, 'utf8')) as Project[]
    } catch {
      return []
    }
  }

  private write(projects: Project[]): void {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true })
    writeFileSync(this.file, JSON.stringify(projects, null, 2), 'utf8')
  }

  list(): Project[] {
    return this.read()
  }

  create(input: NewProject): Project {
    const now = new Date().toISOString()
    const project: Project = {
      id: randomUUID(),
      title: input.title,
      genre: input.genre ?? null,
      framework: input.framework ?? null,
      targetWordCount: input.targetWordCount ?? null,
      ownerId: null,
      createdAt: now,
      updatedAt: now
    }
    const all = this.read()
    all.push(project)
    this.write(all)
    return project
  }
}
