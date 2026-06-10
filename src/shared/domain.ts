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

// --- Manoscritto (Epic 2) -------------------------------------------------

export interface Chapter {
  id: string
  projectId: string
  title: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Scene {
  id: string
  projectId: string
  chapterId: string
  title: string
  content: string
  wordCount: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId: string
  chapterId: string | null
  sceneId: string | null
  content: string
  createdAt: string
  updatedAt: string
}

export type SceneUpdate = Partial<Pick<Scene, 'title' | 'content'>>

/** Aggregati di avanzamento per il conteggio parole/target (US-2.5). */
export interface ProjectStats {
  words: number
  scenes: number
  chapters: number
}

/** Riferimento di una nota: a una scena o a un capitolo. */
export type NoteScope = { sceneId: string } | { chapterId: string }

// --- Author Voice / Style Profile (Epic 23) -------------------------------

export interface StyleProfile {
  id: string
  projectId: string
  name: string
  /** Tono/registro sintetico (es. "ironico, asciutto, prima persona"). */
  tone: string
  /** Istruzioni/esempi per guidare l'AI a scrivere nella voce dell'autore. */
  instructions: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type NewStyleProfile = Pick<StyleProfile, 'name'> &
  Partial<Pick<StyleProfile, 'tone' | 'instructions'>>

export type StyleProfileUpdate = Partial<Pick<StyleProfile, 'name' | 'tone' | 'instructions'>>
