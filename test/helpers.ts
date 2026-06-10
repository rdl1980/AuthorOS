import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initDatabase, type DB } from '../src/main/data/db'

/** Crea un DB SQLite (sql.js) reale in una cartella temporanea per i test. */
export async function makeDb(): Promise<DB> {
  const dir = mkdtempSync(join(tmpdir(), 'authoros-db-'))
  return initDatabase(dir)
}

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'authoros-cfg-'))
}
