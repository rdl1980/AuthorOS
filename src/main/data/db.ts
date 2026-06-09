import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import initSqlJs from 'sql.js'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import * as schema from './schema'

// DDL idempotente allineato a schema.ts. In una fase successiva si potrà passare a
// migrazioni versionate (drizzle-kit); per ora il CREATE IF NOT EXISTS è sufficiente.
const DDL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT,
  framework TEXT,
  target_word_count INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

export interface DB {
  orm: SQLJsDatabase<typeof schema>
  /** Esporta lo stato in-memory su disco. Da chiamare dopo ogni mutazione. */
  persist(): void
}

/**
 * Inizializza il database SQLite (WASM via sql.js) caricandolo dal file se presente.
 * `dataDir` è iniettato dal chiamante (in app: app.getPath('userData')) così questo
 * modulo resta privo di dipendenze da Electron ed è testabile sotto Node puro.
 */
export async function initDatabase(dataDir: string): Promise<DB> {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const file = join(dataDir, 'authoros.sqlite')

  const SQL = await initSqlJs()
  const sqldb = existsSync(file) ? new SQL.Database(readFileSync(file)) : new SQL.Database()
  sqldb.run(DDL)

  const orm = drizzle(sqldb, { schema })
  const persist = (): void => {
    writeFileSync(file, Buffer.from(sqldb.export()))
  }
  persist() // garantisce l'esistenza del file al primo avvio

  return { orm, persist }
}
