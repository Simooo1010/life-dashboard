import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Synthesis cache ─────────────────────────────────────────────────────────
export const dailySyntheses = sqliteTable('daily_syntheses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  inputHash: text('input_hash').notNull(),
  synthesisJson: text('synthesis_json').notNull(),
  generatedAt: text('generated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  source: text('source').notNull().default('groq'),
})

// ─── Day history ──────────────────────────────────────────────────────────────
export const dayHistory = sqliteTable('day_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  synthesisJson: text('synthesis_json').notNull(),
  archivedAt: text('archived_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

// ─── Derived Knowledge Graph content cache ──────────────────────────────────
export const knowledgeContentCache = sqliteTable('knowledge_content_cache', {
  pageId: text('page_id').primaryKey(),
  revision: text('revision').notNull(),
  documentJson: text('document_json').notNull(),
  cachedAt: text('cached_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

// ─── Contextual recommendation cache ────────────────────────────────────────
export const secondBrainRuns = sqliteTable('second_brain_runs', {
  cacheKey: text('cache_key').primaryKey(),
  localDate: text('local_date').notNull(),
  resultJson: text('result_json').notNull(),
  generatedAt: text('generated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

// ─── One recommendation-history row per concept and local day ──────────────
export const secondBrainHistory = sqliteTable('second_brain_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  pageId: text('page_id').notNull(),
  score: integer('score').notNull(),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, table => ({
  datePageUnique: uniqueIndex('second_brain_history_date_page_unique').on(table.date, table.pageId),
}))

export type DailySynthesisRow = typeof dailySyntheses.$inferSelect
export type DayHistoryRow = typeof dayHistory.$inferSelect
export type KnowledgeContentCacheRow = typeof knowledgeContentCache.$inferSelect
export type SecondBrainRunRow = typeof secondBrainRuns.$inferSelect
export type SecondBrainHistoryRow = typeof secondBrainHistory.$inferSelect
