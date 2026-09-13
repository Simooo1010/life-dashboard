import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
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

export type DailySynthesisRow = typeof dailySyntheses.$inferSelect
export type DayHistoryRow = typeof dayHistory.$inferSelect
