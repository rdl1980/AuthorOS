import type { IpcMain } from 'electron'
import type { AIRequest } from '@shared/ai'
import type { NewProject, ProjectUpdate } from '@shared/domain'
import { AIGateway } from './ai/gateway'
import type { ProjectRepository } from './data/types'

// Canali IPC esposti al renderer tramite il preload (window.authoros).
// Tutta la logica sensibile (API key, AI, accesso disco) resta nel main process.
export function registerIpc(ipc: IpcMain, projects: ProjectRepository): void {
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
}
