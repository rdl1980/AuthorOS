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
