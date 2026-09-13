import { createHash } from 'node:crypto'
import { and, eq, gte } from 'drizzle-orm'
import { db, runMigrations } from '../../db'
import {
  knowledgeContentCache,
  secondBrainHistory,
  secondBrainRuns,
} from '../../db/schema'
import { dashboardSupabase } from '../supabase/dashboard-client'
import type { KnowledgeContentCache } from './content'
import type {
  KnowledgeDocument,
  RankedRecommendation,
  RecommendationHistoryEntry,
  SecondBrainResult,
} from './types'

export interface SecondBrainRepository extends KnowledgeContentCache {
  getRun(cacheKey: string): Promise<SecondBrainResult | null>
  putRun(cacheKey: string, localDate: string, result: SecondBrainResult): Promise<void>
  getHistory(sinceDate: string): Promise<RecommendationHistoryEntry[]>
  recordHistory(
    localDate: string,
    relevantToday: RankedRecommendation[],
    rediscover: RankedRecommendation[],
  ): Promise<void>
}

const isCloudMode = process.env.PERSISTENCE_MODE === 'supabase' || Boolean(process.env.VERCEL)
let migrationsPromise: Promise<void> | null = null

function ensureLocalTables(): Promise<void> {
  migrationsPromise ??= runMigrations()
  return migrationsPromise
}

export function buildRunCacheKey(
  localDate: string,
  contextHash: string,
  knowledgeRevisionHash: string,
  rankingVersion: string,
): string {
  return createHash('sha256')
    .update(JSON.stringify({ localDate, contextHash, knowledgeRevisionHash, rankingVersion }))
    .digest('hex')
}

export function uniqueHistoryEntries(
  date: string,
  relevantToday: RankedRecommendation[],
  rediscover: RankedRecommendation[],
): Array<{ date: string; pageId: string; score: number }> {
  const byPage = new Map<string, RankedRecommendation>()
  for (const recommendation of [...relevantToday, ...rediscover]) {
    const current = byPage.get(recommendation.id)
    if (!current || recommendation.score > current.score) byPage.set(recommendation.id, recommendation)
  }
  return Array.from(byPage.values()).map(recommendation => ({
    date,
    pageId: recommendation.id,
    score: recommendation.score,
  }))
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const secondBrainRepository: SecondBrainRepository = {
  async getContent(pageId, revision) {
    if (isCloudMode && dashboardSupabase) {
      const { data, error } = await dashboardSupabase
        .from('knowledge_content_cache')
        .select('revision,document_json')
        .eq('page_id', pageId)
        .eq('revision', revision)
        .maybeSingle()
      if (error) throw error
      return parseJson<KnowledgeDocument>(data?.document_json)
    }

    await ensureLocalTables()
    const rows = await db.select()
      .from(knowledgeContentCache)
      .where(and(eq(knowledgeContentCache.pageId, pageId), eq(knowledgeContentCache.revision, revision)))
      .limit(1)
    return parseJson<KnowledgeDocument>(rows[0]?.documentJson)
  },

  async putContent(document) {
    if (isCloudMode && dashboardSupabase) {
      const { error } = await dashboardSupabase.from('knowledge_content_cache').upsert({
        page_id: document.nodeId,
        revision: document.revision,
        document_json: JSON.stringify(document),
        cached_at: new Date().toISOString(),
      }, { onConflict: 'page_id' })
      if (error) throw error
      return
    }

    await ensureLocalTables()
    await db.insert(knowledgeContentCache).values({
      pageId: document.nodeId,
      revision: document.revision,
      documentJson: JSON.stringify(document),
    }).onConflictDoUpdate({
      target: knowledgeContentCache.pageId,
      set: {
        revision: document.revision,
        documentJson: JSON.stringify(document),
        cachedAt: new Date().toISOString(),
      },
    })
  },

  async getRun(cacheKey) {
    if (isCloudMode && dashboardSupabase) {
      const { data, error } = await dashboardSupabase
        .from('second_brain_runs')
        .select('result_json')
        .eq('cache_key', cacheKey)
        .maybeSingle()
      if (error) throw error
      const result = parseJson<SecondBrainResult>(data?.result_json)
      return result ? { ...result, fromCache: true } : null
    }

    await ensureLocalTables()
    const rows = await db.select()
      .from(secondBrainRuns)
      .where(eq(secondBrainRuns.cacheKey, cacheKey))
      .limit(1)
    const result = parseJson<SecondBrainResult>(rows[0]?.resultJson)
    return result ? { ...result, fromCache: true } : null
  },

  async putRun(cacheKey, localDate, result) {
    const resultJson = JSON.stringify({ ...result, fromCache: false })
    if (isCloudMode && dashboardSupabase) {
      const { error } = await dashboardSupabase.from('second_brain_runs').upsert({
        cache_key: cacheKey,
        local_date: localDate,
        result_json: resultJson,
        generated_at: result.generatedAt,
      }, { onConflict: 'cache_key' })
      if (error) throw error
      return
    }

    await ensureLocalTables()
    await db.insert(secondBrainRuns).values({
      cacheKey,
      localDate,
      resultJson,
      generatedAt: result.generatedAt,
    }).onConflictDoUpdate({
      target: secondBrainRuns.cacheKey,
      set: { resultJson, generatedAt: result.generatedAt },
    })
  },

  async getHistory(sinceDate) {
    if (isCloudMode && dashboardSupabase) {
      const { data, error } = await dashboardSupabase
        .from('second_brain_history')
        .select('date,page_id')
        .gte('date', sinceDate)
      if (error) throw error
      return (data ?? []).map(row => ({ date: row.date, pageId: row.page_id }))
    }

    await ensureLocalTables()
    const rows = await db.select({ date: secondBrainHistory.date, pageId: secondBrainHistory.pageId })
      .from(secondBrainHistory)
      .where(gte(secondBrainHistory.date, sinceDate))
    return rows
  },

  async recordHistory(localDate, relevantToday, rediscover) {
    const entries = uniqueHistoryEntries(localDate, relevantToday, rediscover)
    if (entries.length === 0) return

    if (isCloudMode && dashboardSupabase) {
      const { error } = await dashboardSupabase.from('second_brain_history').upsert(
        entries.map(entry => ({
          date: entry.date,
          page_id: entry.pageId,
          score: Math.round(entry.score * 1_000),
        })),
        { onConflict: 'date,page_id', ignoreDuplicates: true },
      )
      if (error) throw error
      return
    }

    await ensureLocalTables()
    await db.insert(secondBrainHistory).values(entries.map(entry => ({
      date: entry.date,
      pageId: entry.pageId,
      score: Math.round(entry.score * 1_000),
    }))).onConflictDoNothing()
  },
}
