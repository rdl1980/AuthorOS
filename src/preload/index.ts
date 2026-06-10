import { contextBridge, ipcRenderer } from 'electron'
import type { AIRequest, AIResult, AIStatus, AssistKind } from '@shared/ai'
import type {
  ArcStep,
  ArcUpdate,
  Beat,
  BeatLink,
  Chapter,
  Character,
  CharacterArc,
  CharacterUpdate,
  EventCharacterLink,
  NewCharacter,
  NewTimelineEvent,
  Relationship,
  NewWorldElement,
  TimelineEvent,
  TimelineEventUpdate,
  TimelineIssue,
  WorldElement,
  WorldElementUpdate,
  WorldKind,
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
import type { ExportResult, ImportResult } from '@shared/publishing'
import type { SearchResult, SnapshotMeta } from '@shared/search'

// API tipata esposta al renderer. Nessun accesso diretto a Node/Electron dal renderer:
// tutto passa da questi canali (context isolation).
const api = {
  ai: {
    status: (): Promise<AIStatus> => ipcRenderer.invoke('ai:status'),
    generate: (req: AIRequest): Promise<AIResult> => ipcRenderer.invoke('ai:generate', req),
    deriveStyle: (sample: string): Promise<AIResult> =>
      ipcRenderer.invoke('ai:deriveStyle', sample),
    assist: (kind: AssistKind, payload: string): Promise<AIResult> =>
      ipcRenderer.invoke('ai:assist', kind, payload)
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
  },
  characters: {
    list: (projectId: string): Promise<Character[]> => ipcRenderer.invoke('char:list', projectId),
    create: (projectId: string, input: NewCharacter): Promise<Character> =>
      ipcRenderer.invoke('char:create', projectId, input),
    update: (id: string, patch: CharacterUpdate): Promise<Character | null> =>
      ipcRenderer.invoke('char:update', id, patch),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('char:delete', id),
    relationships: (projectId: string): Promise<Relationship[]> =>
      ipcRenderer.invoke('char:relationships', projectId),
    relAdd: (projectId: string, fromId: string, toId: string, label: string): Promise<Relationship> =>
      ipcRenderer.invoke('char:relAdd', projectId, fromId, toId, label),
    relRemove: (id: string): Promise<boolean> => ipcRenderer.invoke('char:relRemove', id),
    arc: (characterId: string): Promise<CharacterArc> => ipcRenderer.invoke('char:arc', characterId),
    arcUpdate: (characterId: string, patch: ArcUpdate): Promise<CharacterArc> =>
      ipcRenderer.invoke('char:arcUpdate', characterId, patch),
    arcSteps: (arcId: string): Promise<ArcStep[]> => ipcRenderer.invoke('char:arcSteps', arcId),
    arcStepAdd: (arcId: string, chapterId: string, description: string): Promise<ArcStep> =>
      ipcRenderer.invoke('char:arcStepAdd', arcId, chapterId, description),
    arcStepRemove: (id: string): Promise<boolean> => ipcRenderer.invoke('char:arcStepRemove', id)
  },
  search: {
    query: (projectId: string, q: string): Promise<SearchResult[]> =>
      ipcRenderer.invoke('search:query', projectId, q)
  },
  snapshots: {
    list: (projectId: string): Promise<SnapshotMeta[]> => ipcRenderer.invoke('snap:list', projectId),
    create: (projectId: string, label: string): Promise<SnapshotMeta | null> =>
      ipcRenderer.invoke('snap:create', projectId, label),
    restore: (projectId: string, file: string): Promise<boolean> =>
      ipcRenderer.invoke('snap:restore', projectId, file),
    remove: (projectId: string, file: string): Promise<boolean> =>
      ipcRenderer.invoke('snap:remove', projectId, file)
  },
  publishing: {
    exportDocx: (projectId: string): Promise<ExportResult> =>
      ipcRenderer.invoke('pub:exportDocx', projectId),
    exportPdf: (projectId: string): Promise<ExportResult> =>
      ipcRenderer.invoke('pub:exportPdf', projectId),
    exportEpub: (projectId: string): Promise<ExportResult> =>
      ipcRenderer.invoke('pub:exportEpub', projectId),
    importFile: (projectId: string): Promise<ImportResult> =>
      ipcRenderer.invoke('pub:import', projectId)
  },
  world: {
    list: (projectId: string, kind?: WorldKind): Promise<WorldElement[]> =>
      ipcRenderer.invoke('world:list', projectId, kind),
    create: (projectId: string, input: NewWorldElement): Promise<WorldElement> =>
      ipcRenderer.invoke('world:create', projectId, input),
    update: (id: string, patch: WorldElementUpdate): Promise<WorldElement | null> =>
      ipcRenderer.invoke('world:update', id, patch),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('world:remove', id)
  },
  timeline: {
    events: (projectId: string): Promise<TimelineEvent[]> =>
      ipcRenderer.invoke('tl:events', projectId),
    create: (projectId: string, input: NewTimelineEvent): Promise<TimelineEvent> =>
      ipcRenderer.invoke('tl:create', projectId, input),
    update: (id: string, patch: TimelineEventUpdate): Promise<TimelineEvent | null> =>
      ipcRenderer.invoke('tl:update', id, patch),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('tl:delete', id),
    reorder: (projectId: string, ids: string[]): Promise<void> =>
      ipcRenderer.invoke('tl:reorder', projectId, ids),
    links: (projectId: string): Promise<EventCharacterLink[]> =>
      ipcRenderer.invoke('tl:links', projectId),
    link: (eventId: string, characterId: string): Promise<void> =>
      ipcRenderer.invoke('tl:link', eventId, characterId),
    unlink: (eventId: string, characterId: string): Promise<void> =>
      ipcRenderer.invoke('tl:unlink', eventId, characterId),
    issues: (projectId: string): Promise<TimelineIssue[]> =>
      ipcRenderer.invoke('tl:issues', projectId)
  },
  structure: {
    beats: (projectId: string): Promise<Beat[]> => ipcRenderer.invoke('structure:beats', projectId),
    setFramework: (projectId: string, framework: string): Promise<Beat[]> =>
      ipcRenderer.invoke('structure:setFramework', projectId, framework),
    clear: (projectId: string): Promise<void> => ipcRenderer.invoke('structure:clear', projectId),
    links: (projectId: string): Promise<BeatLink[]> =>
      ipcRenderer.invoke('structure:links', projectId),
    link: (beatId: string, sceneId: string): Promise<void> =>
      ipcRenderer.invoke('structure:link', beatId, sceneId),
    unlink: (beatId: string, sceneId: string): Promise<void> =>
      ipcRenderer.invoke('structure:unlink', beatId, sceneId)
  }
}

contextBridge.exposeInMainWorld('authoros', api)

export type AuthorOSApi = typeof api
