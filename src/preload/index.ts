import { contextBridge, ipcRenderer } from 'electron'
import type { AIRequest, AIResult, AIStatus } from '@shared/ai'
import type {
  Chapter,
  NewProject,
  NewStyleProfile,
  Note,
  NoteScope,
  Project,
  ProjectStats,
  ProjectUpdate,
  Scene,
  SceneUpdate,
  StyleProfile,
  StyleProfileUpdate
} from '@shared/domain'
import type { AIProviderId, AppSettings, SettingsUpdate } from '@shared/settings'

// API tipata esposta al renderer. Nessun accesso diretto a Node/Electron dal renderer:
// tutto passa da questi canali (context isolation).
const api = {
  ai: {
    status: (): Promise<AIStatus> => ipcRenderer.invoke('ai:status'),
    generate: (req: AIRequest): Promise<AIResult> => ipcRenderer.invoke('ai:generate', req),
    deriveStyle: (sample: string): Promise<AIResult> =>
      ipcRenderer.invoke('ai:deriveStyle', sample)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (patch: SettingsUpdate): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', patch),
    setKey: (provider: Exclude<AIProviderId, 'mock'>, key: string): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:setKey', provider, key),
    clearKey: (provider: Exclude<AIProviderId, 'mock'>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:clearKey', provider)
  },
  style: {
    list: (projectId: string): Promise<StyleProfile[]> => ipcRenderer.invoke('style:list', projectId),
    active: (projectId: string): Promise<StyleProfile | null> =>
      ipcRenderer.invoke('style:active', projectId),
    create: (projectId: string, input: NewStyleProfile): Promise<StyleProfile> =>
      ipcRenderer.invoke('style:create', projectId, input),
    update: (id: string, patch: StyleProfileUpdate): Promise<StyleProfile | null> =>
      ipcRenderer.invoke('style:update', id, patch),
    setActive: (projectId: string, id: string): Promise<void> =>
      ipcRenderer.invoke('style:setActive', projectId, id),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('style:remove', id)
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
  },
  manuscript: {
    chapters: (projectId: string): Promise<Chapter[]> =>
      ipcRenderer.invoke('ms:chapters', projectId),
    chapterCreate: (projectId: string, title: string): Promise<Chapter> =>
      ipcRenderer.invoke('ms:chapterCreate', projectId, title),
    chapterRename: (id: string, title: string): Promise<Chapter | null> =>
      ipcRenderer.invoke('ms:chapterRename', id, title),
    chapterDelete: (id: string): Promise<boolean> => ipcRenderer.invoke('ms:chapterDelete', id),
    chaptersReorder: (projectId: string, ids: string[]): Promise<void> =>
      ipcRenderer.invoke('ms:chaptersReorder', projectId, ids),

    scenes: (projectId: string): Promise<Scene[]> => ipcRenderer.invoke('ms:scenes', projectId),
    sceneGet: (id: string): Promise<Scene | null> => ipcRenderer.invoke('ms:sceneGet', id),
    sceneCreate: (projectId: string, chapterId: string, title: string): Promise<Scene> =>
      ipcRenderer.invoke('ms:sceneCreate', projectId, chapterId, title),
    sceneUpdate: (id: string, patch: SceneUpdate): Promise<Scene | null> =>
      ipcRenderer.invoke('ms:sceneUpdate', id, patch),
    sceneDelete: (id: string): Promise<boolean> => ipcRenderer.invoke('ms:sceneDelete', id),
    scenesReorder: (chapterId: string, ids: string[]): Promise<void> =>
      ipcRenderer.invoke('ms:scenesReorder', chapterId, ids),
    sceneMove: (sceneId: string, toChapterId: string, toIndex: number): Promise<void> =>
      ipcRenderer.invoke('ms:sceneMove', sceneId, toChapterId, toIndex),

    notes: (projectId: string, scope?: NoteScope): Promise<Note[]> =>
      ipcRenderer.invoke('ms:notes', projectId, scope),
    noteCreate: (projectId: string, scope: NoteScope, content: string): Promise<Note> =>
      ipcRenderer.invoke('ms:noteCreate', projectId, scope, content),
    noteUpdate: (id: string, content: string): Promise<Note | null> =>
      ipcRenderer.invoke('ms:noteUpdate', id, content),
    noteDelete: (id: string): Promise<boolean> => ipcRenderer.invoke('ms:noteDelete', id),

    stats: (projectId: string): Promise<ProjectStats> => ipcRenderer.invoke('ms:stats', projectId)
  }
}

contextBridge.exposeInMainWorld('authoros', api)

export type AuthorOSApi = typeof api
