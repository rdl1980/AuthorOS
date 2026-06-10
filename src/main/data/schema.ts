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

export const styleProfiles = sqliteTable('style_profiles', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  tone: text('tone').notNull().default(''),
  instructions: text('instructions').notNull().default(''),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const beats = sqliteTable('beats', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  framework: text('framework').notNull(),
  beatKey: text('beat_key').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull()
})

export const beatScenes = sqliteTable('beat_scenes', {
  id: text('id').primaryKey(),
  beatId: text('beat_id').notNull(),
  sceneId: text('scene_id').notNull()
})

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  summary: text('summary').notNull().default(''),
  appearance: text('appearance').notNull().default(''),
  traits: text('traits').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  fromId: text('from_id').notNull(),
  toId: text('to_id').notNull(),
  label: text('label').notNull().default(''),
  createdAt: text('created_at').notNull()
})

export const characterArcs = sqliteTable('character_arcs', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull(),
  desire: text('desire').notNull().default(''),
  need: text('need').notNull().default(''),
  fear: text('fear').notNull().default(''),
  wound: text('wound').notNull().default(''),
  lie: text('lie').notNull().default(''),
  transformation: text('transformation').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const arcSteps = sqliteTable('arc_steps', {
  id: text('id').primaryKey(),
  arcId: text('arc_id').notNull(),
  chapterId: text('chapter_id').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull()
})

export const timelineEvents = sqliteTable('timeline_events', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  whenLabel: text('when_label').notNull().default(''),
  dateValue: integer('date_value'),
  location: text('location').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const eventCharacters = sqliteTable('event_characters', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  characterId: text('character_id').notNull()
})

export type ChapterRow = typeof chapters.$inferSelect
export type SceneRow = typeof scenes.$inferSelect
export type NoteRow = typeof notes.$inferSelect
export type StyleProfileRow = typeof styleProfiles.$inferSelect
export type BeatRow = typeof beats.$inferSelect
export type CharacterRow = typeof characters.$inferSelect
