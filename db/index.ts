import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const isVercel = Boolean(process.env.VERCEL)
const DB_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data')
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'dashboard.db')

// Ensure directory exists if not in serverless read-only mode
if (!isVercel && !fs.existsSync(DB_DIR)) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true })
  } catch {
    // Ignore error in environments where disk creation is restricted
  }
}

const client = createClient({
  url: `file:${DB_PATH}`,
})

export const db = drizzle(client, { schema })

// Run inline migrations for local SQLite
export async function runMigrations() {
  if (isVercel || process.env.PERSISTENCE_MODE === 'supabase') {
    return
  }
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS daily_syntheses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      input_hash TEXT NOT NULL,
      synthesis_json TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      source TEXT NOT NULL DEFAULT 'groq'
    );

    CREATE TABLE IF NOT EXISTS day_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      synthesis_json TEXT NOT NULL,
      archived_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS knowledge_content_cache (
      page_id TEXT PRIMARY KEY,
      revision TEXT NOT NULL,
      document_json TEXT NOT NULL,
      cached_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS second_brain_runs (
      cache_key TEXT PRIMARY KEY,
      local_date TEXT NOT NULL,
      result_json TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS second_brain_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      page_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS second_brain_history_date_page_unique
      ON second_brain_history(date, page_id);

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      detail TEXT,
      error_message TEXT
    );
  `)
}

export default db
