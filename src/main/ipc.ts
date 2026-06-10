import type { IpcMain } from 'electron'
import type { AIRequest } from '@shared/ai'
import type {
  NewProject,
  NewStyleProfile,
  NoteScope,
  ProjectUpdate,
  SceneUpdate,
  StyleProfileUpdate
} from '@shared/domain'
import type { AIProviderId, SettingsUpdate } from '@shared/settings'
import { AIGateway } from './ai/gateway'
import type {
  ManuscriptRepository,
  ProjectRepository,
  StructureRepository,
  StyleRepository
} from './data/types'
import type { SettingsRepository } from './data/settings-repository'

interface Deps {
  projects: ProjectRepository
  manuscript: ManuscriptRepository
  styles: StyleRepository
  structure: StructureRepository
  settings: SettingsRepository
}

type LiveProvider = Exclude<AIProviderId, 'mock'>

// Canali IPC esposti al renderer tramite il preload (window.authoros).
// Tutta la logica sensibile (API key, AI, accesso disco) resta nel main process.
export function registerIpc(
  ipc: IpcMain,
  { projects, manuscript, styles, structure, settings }: Deps
): void {
  const ai = new AIGateway(() => settings.resolveAi())

  ipc.handle('ai:status', () => ai.status())
  ipc.handle('ai:generate', (_e, req: AIRequest) => ai.generate(req))
  ipc.handle('ai:deriveStyle', (_e, sample: string) => ai.deriveStyle(sample))

  // Impostazioni & AI Config (Epic 22)
  ipc.handle('settings:get', () => settings.get())
  ipc.handle('settings:update', (_e, patch: SettingsUpdate) => settings.update(patch))
  ipc.handle('settings:setKey', (_e, provider: LiveProvider, key: string) =>
    settings.setKey(provider, key)
  )
  ipc.handle('settings:clearKey', (_e, provider: LiveProvider) => settings.clearKey(provider))

  // Progetti (Epic 1)
  ipc.handle('projects:list', (_e, includeArchived?: boolean) => projects.list(includeArchived))
  ipc.handle('projects:get', (_e, id: string) => projects.get(id))
  ipc.handle('projects:create', (_e, input: NewProject) => projects.create(input))
  ipc.handle('projects:update', (_e, id: string, patch: ProjectUpdate) => projects.update(id, patch))
  ipc.handle('projects:duplicate', (_e, id: string) => projects.duplicate(id))
  ipc.handle('projects:setArchived', (_e, id: string, archived: boolean) =>
    projects.setArchived(id, archived)
  )
  ipc.handle('projects:remove', (_e, id: string) => projects.remove(id))

  // Manoscritto (Epic 2)
  ipc.handle('ms:chapters', (_e, projectId: string) => manuscript.listChapters(projectId))
  ipc.handle('ms:chapterCreate', (_e, projectId: string, title: string) =>
    manuscript.createChapter(projectId, title)
  )
  ipc.handle('ms:chapterRename', (_e, id: string, title: string) =>
    manuscript.renameChapter(id, title)
  )
  ipc.handle('ms:chapterDelete', (_e, id: string) => manuscript.deleteChapter(id))
  ipc.handle('ms:chaptersReorder', (_e, projectId: string, ids: string[]) =>
    manuscript.reorderChapters(projectId, ids)
  )

  ipc.handle('ms:scenes', (_e, projectId: string) => manuscript.listScenes(projectId))
  ipc.handle('ms:sceneGet', (_e, id: string) => manuscript.getScene(id))
  ipc.handle('ms:sceneCreate', (_e, projectId: string, chapterId: string, title: string) =>
    manuscript.createScene(projectId, chapterId, title)
  )
  ipc.handle('ms:sceneUpdate', (_e, id: string, patch: SceneUpdate) =>
    manuscript.updateScene(id, patch)
  )
  ipc.handle('ms:sceneDelete', (_e, id: string) => manuscript.deleteScene(id))
  ipc.handle('ms:scenesReorder', (_e, chapterId: string, ids: string[]) =>
    manuscript.reorderScenes(chapterId, ids)
  )
  ipc.handle('ms:sceneMove', (_e, sceneId: string, toChapterId: string, toIndex: number) =>
    manuscript.moveScene(sceneId, toChapterId, toIndex)
  )

  ipc.handle('ms:notes', (_e, projectId: string, scope?: NoteScope) =>
    manuscript.listNotes(projectId, scope)
  )
  ipc.handle('ms:noteCreate', (_e, projectId: string, scope: NoteScope, content: string) =>
    manuscript.createNote(projectId, scope, content)
  )
  ipc.handle('ms:noteUpdate', (_e, id: string, content: string) =>
    manuscript.updateNote(id, content)
  )
  ipc.handle('ms:noteDelete', (_e, id: string) => manuscript.deleteNote(id))

  ipc.handle('ms:stats', (_e, projectId: string) => manuscript.getStats(projectId))

  // Author Voice / Style Profile (Epic 23)
  ipc.handle('style:list', (_e, projectId: string) => styles.list(projectId))
  ipc.handle('style:active', (_e, projectId: string) => styles.getActive(projectId))
  ipc.handle('style:create', (_e, projectId: string, input: NewStyleProfile) =>
    styles.create(projectId, input)
  )
  ipc.handle('style:update', (_e, id: string, patch: StyleProfileUpdate) => styles.update(id, patch))
  ipc.handle('style:setActive', (_e, projectId: string, id: string) =>
    styles.setActive(projectId, id)
  )
  ipc.handle('style:remove', (_e, id: string) => styles.remove(id))

  // Story Structure (Epic 4)
  ipc.handle('structure:beats', (_e, projectId: string) => structure.listBeats(projectId))
  ipc.handle('structure:setFramework', (_e, projectId: string, framework: string) =>
    structure.setFramework(projectId, framework)
  )
  ipc.handle('structure:clear', (_e, projectId: string) => structure.clear(projectId))
  ipc.handle('structure:links', (_e, projectId: string) => structure.links(projectId))
  ipc.handle('structure:link', (_e, beatId: string, sceneId: string) =>
    structure.linkScene(beatId, sceneId)
  )
  ipc.handle('structure:unlink', (_e, beatId: string, sceneId: string) =>
    structure.unlinkScene(beatId, sceneId)
  )
}
