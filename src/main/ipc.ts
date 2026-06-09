import type { IpcMain } from 'electron'
import type { AIRequest } from '@shared/ai'
import type { NewProject } from '@shared/domain'
import { AIGateway } from './ai/gateway'
import { FileProjectRepository } from './data/repository'

// Canali IPC esposti al renderer tramite il preload (window.authoros).
// Tutta la logica sensibile (API key, AI, accesso disco) resta nel main process.
export function registerIpc(ipc: IpcMain): void {
  const ai = new AIGateway()
  const projects = new FileProjectRepository()

  ipc.handle('ai:status', () => ai.status())
  ipc.handle('ai:generate', (_e, req: AIRequest) => ai.generate(req))

  ipc.handle('projects:list', () => projects.list())
  ipc.handle('projects:create', (_e, input: NewProject) => projects.create(input))
}
