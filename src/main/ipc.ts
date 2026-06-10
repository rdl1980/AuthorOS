import type { IpcMain } from 'electron'
import type { AIRequest } from '@shared/ai'
import type { NewProject, NoteScope, ProjectUpdate, SceneUpdate } from '@shared/domain'
import { AIGateway } from './ai/gateway'
import type { ManuscriptRepository, ProjectRepository } from './data/types'

interface Repos {
  projects: ProjectRepository
  manuscript: ManuscriptRepository
}

// Canali IPC esposti al renderer tramite il preload (window.authoros).
// Tutta la logica sensibile (API key, AI, accesso disco) resta nel main process.
export function registerIpc(ipc: IpcMain, { projects, manuscript }: Repos): void {
  const ai = new AIGateway()

  ipc.handle('ai:status', () => ai.status())
  ipc.handle('ai:generate', (_e, req: AIRequest) => ai.generate(req))

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
}
