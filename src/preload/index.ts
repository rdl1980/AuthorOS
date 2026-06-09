import { contextBridge, ipcRenderer } from 'electron'
import type { AIRequest, AIResult, AIStatus } from '@shared/ai'
import type { NewProject, Project, ProjectUpdate } from '@shared/domain'

// API tipata esposta al renderer. Nessun accesso diretto a Node/Electron dal renderer:
// tutto passa da questi canali (context isolation).
const api = {
  ai: {
    status: (): Promise<AIStatus> => ipcRenderer.invoke('ai:status'),
    generate: (req: AIRequest): Promise<AIResult> => ipcRenderer.invoke('ai:generate', req)
  },
  projects: {
    list: (includeArchived?: boolean): Promise<Project[]> =>
      ipcRenderer.invoke('projects:list', includeArchived),
    get: (id: string): Promise<Project | null> => ipcRenderer.invoke('projects:get', id),
    create: (input: NewProject): Promise<Project> => ipcRenderer.invoke('projects:create', input),
    update: (id: string, patch: ProjectUpdate): Promise<Project | null> =>
      ipcRenderer.invoke('projects:update', id, patch),
    duplicate: (id: string): Promise<Project | null> =>
      ipcRenderer.invoke('projects:duplicate', id),
    setArchived: (id: string, archived: boolean): Promise<Project | null> =>
      ipcRenderer.invoke('projects:setArchived', id, archived),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('projects:remove', id)
  }
}

contextBridge.exposeInMainWorld('authoros', api)

export type AuthorOSApi = typeof api
