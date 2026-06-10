import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Schema Drizzle (SQLite). Le colonne mappano 1:1 sui tipi di @shared/domain e sono
 * progettate cloud-ready: stessa forma riusabile su Postgres in V2.
 */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  genre: text('genre'),
  framework: text('framework'),
  targetWordCount: integer('target_word_count'),
  status: text('status', { enum: ['active', 'archived'] })
    .notNull()
    .default('active'),
  ownerId: text('owner_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export type ProjectRow = typeof projects.$inferSelect

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  chapterId: text('chapter_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  wordCount: integer('word_count').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  chapterId: text('chapter_id'),
  sceneId: text('scene_id'),
  content: text('content').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export type ChapterRow = typeof chapters.$inferSelect
export type SceneRow = typeof scenes.$inferSelect
export type NoteRow = typeof notes.$inferSelect
