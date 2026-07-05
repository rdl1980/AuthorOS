import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/settings'

/** Preferenze editor + obiettivo giornaliero (US-26.6, US-27.2), specchiate dalle settings. */
type Prefs = Pick<
  AppSettings,
  'dailyGoal' | 'editorFont' | 'editorSize' | 'editorWidth' | 'editorTheme'
>

interface PrefsState extends Prefs {
  init: (s: AppSettings) => void
  patch: (p: Partial<Prefs>) => void
}

export const usePrefs = create<PrefsState>((set) => ({
  dailyGoal: DEFAULT_SETTINGS.dailyGoal,
  editorFont: DEFAULT_SETTINGS.editorFont,
  editorSize: DEFAULT_SETTINGS.editorSize,
  editorWidth: DEFAULT_SETTINGS.editorWidth,
  editorTheme: DEFAULT_SETTINGS.editorTheme,
  init: (s) =>
    set({
      dailyGoal: s.dailyGoal,
      editorFont: s.editorFont,
      editorSize: s.editorSize,
      editorWidth: s.editorWidth,
      editorTheme: s.editorTheme
    }),
  patch: (p) => set(p)
}))

export const EDITOR_FONTS: Record<AppSettings['editorFont'], string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  mono: "'Cascadia Code', Consolas, monospace"
}

export const EDITOR_WIDTHS: Record<AppSettings['editorWidth'], string> = {
  narrow: '55ch',
  normal: '75ch',
  wide: '100%'
}
