import { contextBridge, ipcRenderer } from 'electron'
import type { AIRequest, AIResult, AIStatus } from '@shared/ai'
import type { NewProject, Project } from '@shared/domain'

// API tipata esposta al renderer. Nessun accesso diretto a Node/Electron dal renderer:
// tutto passa da questi canali (context isolation).
const api = {
  ai: {
    status: (): Promise<AIStatus> => ipcRenderer.invoke('ai:status'),
    generate: (req: AIRequest): Promise<AIResult> => ipcRenderer.invoke('ai:generate', req)
  },
  projects: {
    list: (): Promise<Project[]> => ipcRenderer.invoke('projects:list'),
    create: (input: NewProject): Promise<Project> => ipcRenderer.invoke('projects:create', input)
  }
}

contextBridge.exposeInMainWorld('authoros', api)

export type AuthorOSApi = typeof api
