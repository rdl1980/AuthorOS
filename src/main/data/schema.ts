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
