import type { ComponentType } from 'react'

/**
 * Contratto di un modulo dell'app. Ogni epica del backlog è (o sarà) un modulo
 * registrato qui: questo è il cuore dell'architettura modulare (Epic 18, US-18.1).
 * Aggiungere una feature = aggiungere un AppModule alla registry, senza toccare la shell.
 */
export interface AppModule {
  id: string
  epic: number
  title: string
  /** Glyph/emoji segnaposto finché non introduciamo un set di icone. */
  icon: string
  release: 'V1' | 'V1.5' | 'V2' | 'V3'
  status: 'ready' | 'planned'
  component: ComponentType
}
