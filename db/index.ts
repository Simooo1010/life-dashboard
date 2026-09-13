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
  `)
}

export default db
