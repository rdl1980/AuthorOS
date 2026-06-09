// Smoke test del data layer: verifica insert/select/update + persistenza (export→reload)
// di SQLite (sql.js) + Drizzle. Esegue sotto Node puro; lo stesso WASM gira in Electron.
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import initSqlJs from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { eq } from 'drizzle-orm'

const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  genre: text('genre'),
  framework: text('framework'),
  targetWordCount: integer('target_word_count'),
  status: text('status').notNull().default('active'),
  ownerId: text('owner_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})
const DDL = `CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, genre TEXT, framework TEXT,
  target_word_count INTEGER, status TEXT NOT NULL DEFAULT 'active', owner_id TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`

const SQL = await initSqlJs()
let raw = new SQL.Database()
raw.run(DDL)
let db = drizzle(raw, { schema: { projects } })

const now = new Date().toISOString()
const p = {
  id: randomUUID(), title: 'Romanzo di prova', genre: 'Fantasy', framework: "Hero's Journey",
  targetWordCount: 80000, status: 'active', ownerId: null, createdAt: now, updatedAt: now
}
db.insert(projects).values(p).run()
assert.equal(db.select().from(projects).all().length, 1, 'insert+select')

// persistenza: export -> reload
const bytes = raw.export()
raw = new SQL.Database(Buffer.from(bytes))
db = drizzle(raw, { schema: { projects } })
const reloaded = db.select().from(projects).where(eq(projects.id, p.id)).get()
assert.equal(reloaded.title, 'Romanzo di prova', 'persistenza dopo reload')
assert.equal(reloaded.framework, "Hero's Journey", 'campo framework persistito')

// update
db.update(projects).set({ title: 'Titolo aggiornato' }).where(eq(projects.id, p.id)).run()
assert.equal(
  db.select().from(projects).where(eq(projects.id, p.id)).get().title,
  'Titolo aggiornato',
  'update'
)

console.log('✓ smoke-db: insert, select, persistenza (reload) e update OK')
