import type { IpcMain } from 'electron'
import type { AIRequest, AssistKind } from '@shared/ai'
import type {
  ArcUpdate,
  CharacterUpdate,
  NewCharacter,
  NewProject,
  NewStyleProfile,
  NewTimelineEvent,
  NoteScope,
  ProjectUpdate,
  SceneUpdate,
  NewWorldElement,
  StyleProfileUpdate,
  TimelineEventUpdate,
  WorldElementUpdate,
  WorldKind
} from '@shared/domain'
import type { AIProviderId, SettingsUpdate } from '@shared/settings'
import { AIGateway } from './ai/gateway'
import type {
  CharacterRepository,
  ManuscriptRepository,
  ProjectRepository,
  StructureRepository,
  StyleRepository,
  TimelineRepository,
  WorldRepository
} from './data/types'
import type { SettingsRepository } from './data/settings-repository'
import type { PlotService } from './data/plot-service'
import type { SearchService } from './data/search-service'
import type { SnapshotService } from './data/snapshot-service'
import { PublishingService } from './export/publishing'

interface Deps {
  projects: ProjectRepository
  manuscript: ManuscriptRepository
  styles: StyleRepository
  structure: StructureRepository
  characters: CharacterRepository
  timeline: TimelineRepository
  world: WorldRepository
  settings: SettingsRepository
  searchService: SearchService
  snapshots: SnapshotService
  plot: PlotService
}

type LiveProvider = Exclude<AIProviderId, 'mock'>

// Canali IPC esposti al renderer tramite il preload (window.authoros).
// Tutta la logica sensibile (API key, AI, accesso disco) resta nel main process.
export function registerIpc(
  ipc: IpcMain,
  { projects, manuscript, styles, structure, characters, timeline, world, settings, searchService, snapshots, plot }: Deps
): void {
  const ai = new AIGateway(() => settings.resolveAi())
  const publishing = new PublishingService(projects, manuscript, structure)

  // Publishing: export/import (Epic 16 + 21)
  ipc.handle('pub:exportDocx', (_e, projectId: string) => publishing.exportDocx(projectId))
  ipc.handle('pub:exportPdf', (_e, projectId: string) => publishing.exportPdf(projectId))
  ipc.handle('pub:exportEpub', (_e, projectId: string) => publishing.exportEpub(projectId))
  ipc.handle('pub:import', (_e, projectId: string) => publishing.importFile(projectId))

  ipc.handle('ai:status', () => ai.status())
  ipc.handle('ai:generate', (_e, req: AIRequest) => ai.generate(req))
  ipc.handle('ai:deriveStyle', (_e, sample: string) => ai.deriveStyle(sample))
  ipc.handle('ai:assist', (_e, kind: AssistKind, payload: string) => ai.assist(kind, payload))

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

  // Character Bible & Arc (Epic 6 + Epic 5)
  ipc.handle('char:list', (_e, projectId: string) => characters.listCharacters(projectId))
  ipc.handle('char:create', (_e, projectId: string, input: NewCharacter) =>
    characters.createCharacter(projectId, input)
  )
  ipc.handle('char:update', (_e, id: string, patch: CharacterUpdate) =>
    characters.updateCharacter(id, patch)
  )
  ipc.handle('char:delete', (_e, id: string) => characters.deleteCharacter(id))
  ipc.handle('char:relationships', (_e, projectId: string) =>
    characters.listRelationships(projectId)
  )
  ipc.handle('char:relAdd', (_e, projectId: string, fromId: string, toId: string, label: string) =>
    characters.addRelationship(projectId, fromId, toId, label)
  )
  ipc.handle('char:relRemove', (_e, id: string) => characters.removeRelationship(id))
  ipc.handle('char:arc', (_e, characterId: string) => characters.getArc(characterId))
  ipc.handle('char:arcUpdate', (_e, characterId: string, patch: ArcUpdate) =>
    characters.updateArc(characterId, patch)
  )
  ipc.handle('char:arcSteps', (_e, arcId: string) => characters.listArcSteps(arcId))
  ipc.handle('char:arcStepAdd', (_e, arcId: string, chapterId: string, description: string) =>
    characters.addArcStep(arcId, chapterId, description)
  )
  ipc.handle('char:arcStepRemove', (_e, id: string) => characters.removeArcStep(id))

  // Plot Intelligence (Epic 8)
  ipc.handle('plot:analyze', (_e, projectId: string) => plot.analyze(projectId))

  // Ricerca & Snapshot (Epic 24)
  ipc.handle('search:query', (_e, projectId: string, q: string) =>
    searchService.search(projectId, q)
  )
  ipc.handle('snap:list', (_e, projectId: string) => snapshots.list(projectId))
  ipc.handle('snap:create', (_e, projectId: string, label: string) =>
    snapshots.create(projectId, label)
  )
  ipc.handle('snap:restore', (_e, projectId: string, file: string) =>
    snapshots.restore(projectId, file)
  )
  ipc.handle('snap:remove', (_e, projectId: string, file: string) =>
    snapshots.remove(projectId, file)
  )

  // World Building (Epic 7)
  ipc.handle('world:list', (_e, projectId: string, kind?: WorldKind) => world.list(projectId, kind))
  ipc.handle('world:create', (_e, projectId: string, input: NewWorldElement) =>
    world.create(projectId, input)
  )
  ipc.handle('world:update', (_e, id: string, patch: WorldElementUpdate) => world.update(id, patch))
  ipc.handle('world:remove', (_e, id: string) => world.remove(id))

  // Timeline Engine (Epic 9)
  ipc.handle('tl:events', (_e, projectId: string) => timeline.listEvents(projectId))
  ipc.handle('tl:create', (_e, projectId: string, input: NewTimelineEvent) =>
    timeline.createEvent(projectId, input)
  )
  ipc.handle('tl:update', (_e, id: string, patch: TimelineEventUpdate) =>
    timeline.updateEvent(id, patch)
  )
  ipc.handle('tl:delete', (_e, id: string) => timeline.deleteEvent(id))
  ipc.handle('tl:reorder', (_e, projectId: string, ids: string[]) =>
    timeline.reorder(projectId, ids)
  )
  ipc.handle('tl:links', (_e, projectId: string) => timeline.links(projectId))
  ipc.handle('tl:link', (_e, eventId: string, characterId: string) =>
    timeline.linkCharacter(eventId, characterId)
  )
  ipc.handle('tl:unlink', (_e, eventId: string, characterId: string) =>
    timeline.unlinkCharacter(eventId, characterId)
  )
  ipc.handle('tl:issues', (_e, projectId: string) => timeline.issues(projectId))

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
