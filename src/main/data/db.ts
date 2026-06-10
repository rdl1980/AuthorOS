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
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  chapter_id TEXT,
  scene_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS style_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS beats (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  framework TEXT NOT NULL,
  beat_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS beat_scenes (
  id TEXT PRIMARY KEY,
  beat_id TEXT NOT NULL,
  scene_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  appearance TEXT NOT NULL DEFAULT '',
  traits TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS character_arcs (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  desire TEXT NOT NULL DEFAULT '',
  need TEXT NOT NULL DEFAULT '',
  fear TEXT NOT NULL DEFAULT '',
  wound TEXT NOT NULL DEFAULT '',
  lie TEXT NOT NULL DEFAULT '',
  transformation TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS arc_steps (
  id TEXT PRIMARY KEY,
  arc_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS world_elements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_world_project ON world_elements(project_id);
CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  when_label TEXT NOT NULL DEFAULT '',
  date_value INTEGER,
  location TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_characters (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  character_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_timeline_project ON timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_eventchars_event ON event_characters(event_id);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_arcs_character ON character_arcs(character_id);
CREATE INDEX IF NOT EXISTS idx_arcsteps_arc ON arc_steps(arc_id);
CREATE INDEX IF NOT EXISTS idx_beats_project ON beats(project_id);
CREATE INDEX IF NOT EXISTS idx_beatscenes_beat ON beat_scenes(beat_id);
CREATE INDEX IF NOT EXISTS idx_styles_project ON style_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_chapter ON scenes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
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
