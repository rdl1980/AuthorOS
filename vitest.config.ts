import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// I test girano sotto Node (sql.js è WASM, identico a Electron). Il modulo 'electron'
// è sostituito da uno stub di test (safeStorage/app) così i repository sono testabili headless.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      electron: resolve(__dirname, 'test/stubs/electron.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false
  }
})
