// Stub di 'electron' per i test headless. safeStorage usa il fallback base64
// (isEncryptionAvailable=false), così SettingsRepository è verificabile sotto Node.
import { tmpdir } from 'node:os'

export const safeStorage = {
  isEncryptionAvailable: (): boolean => false,
  encryptString: (s: string): Buffer => Buffer.from(s, 'utf8'),
  decryptString: (b: Buffer): string => b.toString('utf8')
}

export const app = {
  getPath: (): string => tmpdir()
}

// Stub per PublishingService nei test headless: i dialoghi risultano annullati.
export const dialog = {
  showSaveDialog: async (): Promise<{ canceled: boolean; filePath?: string }> => ({
    canceled: true
  }),
  showOpenDialog: async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({
    canceled: true,
    filePaths: []
  })
}

export class BrowserWindow {
  webContents = { printToPDF: async (): Promise<Buffer> => Buffer.alloc(0) }
  async loadURL(): Promise<void> {}
  destroy(): void {}
}
