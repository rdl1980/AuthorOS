import type { AuthorOSApi } from './index'

declare global {
  interface Window {
    authoros: AuthorOSApi
  }
}

export {}
