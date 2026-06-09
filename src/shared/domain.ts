// Modello dati di dominio — progettato "cloud-ready":
// id UUID, timestamp ISO, ownerId nullable (null in V1 stand-alone, valorizzato in V2 cloud).
// Le stesse forme mappano 1:1 sullo schema SQLite (Drizzle) e su Postgres in V2.

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  title: string
  genre: string | null
  framework: string | null
  targetWordCount: number | null
  status: ProjectStatus
  ownerId: string | null
  createdAt: string
  updatedAt: string
}

export type NewProject = Pick<Project, 'title'> &
  Partial<Pick<Project, 'genre' | 'framework' | 'targetWordCount'>>

export type ProjectUpdate = Partial<
  Pick<Project, 'title' | 'genre' | 'framework' | 'targetWordCount' | 'status'>
>
