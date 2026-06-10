// Smoke test del data layer (SQLite via sql.js + Drizzle): valida le operazioni su cui
// poggiano i repository (progetti + manoscritto). Gira sotto Node puro; stesso WASM in Electron.
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import initSqlJs from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { and, asc, eq } from 'drizzle-orm'

const id = () => randomUUID()
const now = () => new Date().toISOString()
const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).filter(Boolean).length : 0)

const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})
const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0)
})
const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  chapterId: text('chapter_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  wordCount: integer('word_count').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0)
})

const DDL = `
CREATE TABLE projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE chapters (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE scenes (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, chapter_id TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', word_count INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0);
`

const SQL = await initSqlJs()
let raw = new SQL.Database()
raw.run(DDL)
let db = drizzle(raw, { schema: { projects, chapters, scenes } })

// progetto
const pid = id()
db.insert(projects).values({ id: pid, title: 'Romanzo', status: 'active', createdAt: now(), updatedAt: now() }).run()

// persistenza progetto (export -> reload)
raw = new SQL.Database(Buffer.from(raw.export()))
db = drizzle(raw, { schema: { projects, chapters, scenes } })
assert.equal(db.select().from(projects).where(eq(projects.id, pid)).get().title, 'Romanzo', 'persistenza progetto')

// capitoli
const c1 = id(), c2 = id()
db.insert(chapters).values({ id: c1, projectId: pid, title: 'Cap 1', sortOrder: 0 }).run()
db.insert(chapters).values({ id: c2, projectId: pid, title: 'Cap 2', sortOrder: 1 }).run()

// scene nel cap 1
const s1 = id(), s2 = id()
db.insert(scenes).values({ id: s1, projectId: pid, chapterId: c1, title: 'S1', content: '', wordCount: 0, sortOrder: 0 }).run()
db.insert(scenes).values({ id: s2, projectId: pid, chapterId: c1, title: 'S2', content: '', wordCount: 0, sortOrder: 1 }).run()

// update contenuto + word count
const text1 = 'Era una notte buia e tempestosa'
db.update(scenes).set({ content: text1, wordCount: countWords(text1) }).where(eq(scenes.id, s1)).run()
assert.equal(db.select().from(scenes).where(eq(scenes.id, s1)).get().wordCount, 6, 'word count')

// reorder scene nel cap 1 (swap)
;[s2, s1].forEach((sid, i) => db.update(scenes).set({ sortOrder: i }).where(eq(scenes.id, sid)).run())
const ordered = db.select().from(scenes).where(eq(scenes.chapterId, c1)).orderBy(asc(scenes.sortOrder)).all()
assert.equal(ordered[0].id, s2, 'reorder scene')

// move scena s1 nel cap 2
db.update(scenes).set({ chapterId: c2 }).where(eq(scenes.id, s1)).run()
const inC2 = db.select().from(scenes).where(eq(scenes.chapterId, c2)).all()
assert.equal(inC2.length, 1, 'move scena tra capitoli')
assert.equal(inC2[0].id, s1, 'scena spostata corretta')

// stats: somma word_count del progetto
const total = db.select().from(scenes).where(eq(scenes.projectId, pid)).all().reduce((a, r) => a + r.wordCount, 0)
assert.equal(total, 6, 'stats somma parole')

// query composta (and) — cap 2 contiene s1
const found = db.select().from(scenes).where(and(eq(scenes.projectId, pid), eq(scenes.chapterId, c2))).all()
assert.equal(found.length, 1, 'query and')

console.log('✓ smoke-db: progetti + manoscritto (word count, reorder, move, stats) OK')
