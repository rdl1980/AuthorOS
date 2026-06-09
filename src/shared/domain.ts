// Modello dati di dominio — progettato "cloud-ready":
// id UUID, timestamp ISO, ownerId nullable (null in V1 stand-alone, valorizzato in V2 cloud).
// Le stesse forme mappano 1:1 su uno schema SQLite (Drizzle) in Fase 1 e su Postgres in V2.

export interface Project {
  id: string
  title: string
  genre: string | null
  framework: string | null
  targetWordCount: number | null
  ownerId: string | null
  createdAt: string
  updatedAt: string
}

export type NewProject = Pick<Project, 'title'> &
  Partial<Pick<Project, 'genre' | 'framework' | 'targetWordCount'>>
