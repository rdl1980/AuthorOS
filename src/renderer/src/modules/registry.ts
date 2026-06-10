import type { AppModule } from './types'
import { LibraryView } from './views/LibraryView'
import { WritingWorkspaceView } from './views/WritingWorkspaceView'
import { AiAssistantView } from './views/AiAssistantView'
import { AuthorVoiceView } from './views/AuthorVoiceView'
import { StructureView } from './views/StructureView'
import { CharactersView } from './views/CharactersView'
import { TimelineView } from './views/TimelineView'
import { WorldView } from './views/WorldView'
import { AiEditorView } from './views/AiEditorView'
import { PublishingView } from './views/PublishingView'
import { SearchSnapshotsView } from './views/SearchSnapshotsView'
import { SettingsView } from './views/SettingsView'

/**
 * Registry dei moduli. Fase 0 registra i moduli must-have della V1: due funzionanti
 * end-to-end (Libreria, AI Assistant) e gli altri come segnaposto "planned", per
 * mostrare la struttura modulare completa. Nelle fasi successive ogni segnaposto
 * viene sostituito dalla sua implementazione reale.
 */
export const modules: AppModule[] = [
  {
    id: 'library',
    epic: 1,
    title: 'Libreria',
    icon: '📚',
    release: 'V1',
    status: 'ready',
    component: LibraryView
  },
  {
    id: 'writing',
    epic: 2,
    title: 'Workspace',
    icon: '✍️',
    release: 'V1',
    status: 'ready',
    component: WritingWorkspaceView
  },
  {
    id: 'ai-assistant',
    epic: 3,
    title: 'AI Assistant',
    icon: '✨',
    release: 'V1',
    status: 'ready',
    component: AiAssistantView
  },
  {
    id: 'voice',
    epic: 23,
    title: 'Author Voice',
    icon: '🎙️',
    release: 'V1',
    status: 'ready',
    component: AuthorVoiceView
  },
  {
    id: 'structure',
    epic: 4,
    title: 'Struttura',
    icon: '🧭',
    release: 'V1',
    status: 'ready',
    component: StructureView
  },
  {
    id: 'characters',
    epic: 6,
    title: 'Personaggi',
    icon: '🎭',
    release: 'V1',
    status: 'ready',
    component: CharactersView
  },
  {
    id: 'world',
    epic: 7,
    title: 'Mondo',
    icon: '🌍',
    release: 'V1',
    status: 'ready',
    component: WorldView
  },
  {
    id: 'timeline',
    epic: 9,
    title: 'Timeline',
    icon: '🕒',
    release: 'V1',
    status: 'ready',
    component: TimelineView
  },
  {
    id: 'editor',
    epic: 10,
    title: 'AI Editor',
    icon: '🔍',
    release: 'V1',
    status: 'ready',
    component: AiEditorView
  },
  {
    id: 'publish',
    epic: 16,
    title: 'Publishing',
    icon: '📦',
    release: 'V1',
    status: 'ready',
    component: PublishingView
  },
  {
    id: 'archive',
    epic: 24,
    title: 'Cerca & Snapshot',
    icon: '🔎',
    release: 'V1',
    status: 'ready',
    component: SearchSnapshotsView
  },
  {
    id: 'settings',
    epic: 22,
    title: 'Impostazioni',
    icon: '⚙️',
    release: 'V1',
    status: 'ready',
    component: SettingsView
  }
]

export const getModule = (id: string): AppModule | undefined => modules.find((m) => m.id === id)
