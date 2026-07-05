import { create } from 'zustand'
import type { Language } from '@shared/settings'

/**
 * i18n leggero (US-32.4): la lingua vive nelle settings (persistita) e qui come
 * store per la reattività. Primo perimetro tradotto: shell (sidebar, palette).
 * Le viste interne seguiranno progressivamente; l'italiano resta la lingua base.
 */
interface LangState {
  lang: Language
  setLang: (lang: Language) => void
}

export const useLang = create<LangState>((set) => ({
  lang: 'it',
  setLang: (lang) => set({ lang })
}))

/** Titoli dei moduli in inglese (in italiano vale il titolo della registry). */
const MODULE_TITLES_EN: Record<string, string> = {
  library: 'Library',
  copilot: 'Copilot',
  writing: 'Workspace',
  'ai-assistant': 'AI Assistant',
  chat: 'Chat',
  voice: 'Author Voice',
  structure: 'Structure',
  characters: 'Characters',
  world: 'World',
  timeline: 'Timeline',
  plot: 'Plot',
  editor: 'AI Editor',
  stats: 'Progress',
  readers: 'Readers',
  publish: 'Publishing',
  marketing: 'Marketing',
  archive: 'Search & Snapshots',
  settings: 'Settings'
}

export function moduleTitle(id: string, fallback: string, lang: Language): string {
  return lang === 'en' ? (MODULE_TITLES_EN[id] ?? fallback) : fallback
}
