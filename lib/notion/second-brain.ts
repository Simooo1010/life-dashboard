import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import {
  notionSecondBrain,
  NOTION_DB,
  queryAll,
  getText,
  getSelect,
  getDate,
  getRelationIds,
  getUrl,
} from './client'
import type { KnowledgeNode, TruthCheckState } from '@/lib/second-brain/types'

type AnyProperty = PageObjectResponse['properties'][string]

export type { KnowledgeNode } from '@/lib/second-brain/types'

export interface RawSource {
  id: string
  name: string
  sourceUrl: string | null
  status: string | null
  dateIngested: string | null
  linkedEntityIds: string[]
  url: string
}

export interface SecondBrainData {
  recentConcepts: KnowledgeNode[]
  unprocessedSources: RawSource[]
  fetchedAt: string
}

export interface SecondBrainBundle {
  nodes: KnowledgeNode[]
  rawSources: RawSource[]
}

function getPropertyValue(prop: AnyProperty | undefined): string | null {
  if (!prop) return null
  if (prop.type === 'select') return prop.select?.name ?? null
  if (prop.type === 'status') return prop.status?.name ?? null
  if (prop.type === 'last_edited_time') return prop.last_edited_time
  return getText(prop) || getDate(prop)
}

function normalizeTruthCheck(prop: AnyProperty | undefined): TruthCheckState {
  if (!prop) return 'unknown'
  if (prop.type === 'checkbox') return prop.checkbox ? 'verified' : 'unverified'
  if (prop.type === 'date') return prop.date?.start ? 'verified' : 'unknown'
  const value = getPropertyValue(prop)?.trim().toLowerCase()
  if (!value) return 'unknown'
  if (['false', 'no', 'not checked', 'unverified', 'da verificare'].some(label => value.includes(label))) {
    return 'unverified'
  }
  return 'verified'
}

function getTitleFromPage(page: PageObjectResponse): string {
  const titleProperty = Object.values(page.properties).find(property => property.type === 'title')
  return getText(titleProperty)
}

export function normalizeKnowledgePage(
  page: PageObjectResponse,
  sourceLabels: Map<string, string> = new Map(),
): KnowledgeNode {
  const props = page.properties
  const sourceIds = getRelationIds(props['Source material'] ?? props['Source Material'] ?? props['Sources'])
  const lastUpdatedProperty = props['Last updated'] ?? props['Last Updated']

  return {
    id: page.id,
    concept: getText(props['Concept'] ?? props['Name']) || getTitleFromPage(page),
    category: getSelect(props['Category']),
    lastUpdated: getPropertyValue(lastUpdatedProperty) ?? page.last_edited_time,
    lastEditedAt: page.last_edited_time,
    relatedIds: getRelationIds(props['Related concepts'] ?? props['Related Concepts'] ?? props['Related']),
    sourceMaterials: sourceIds.map(id => sourceLabels.get(id) ?? id),
    truthChecked: normalizeTruthCheck(props['Truth-Checked'] ?? props['Truth Checked'] ?? props['Verified']),
    url: page.url,
  }
}

function normalizeRawSource(page: PageObjectResponse): RawSource {
  const props = page.properties
  return {
    id: page.id,
    name: getText(props['Name'] ?? props['Title']) || getTitleFromPage(page),
    sourceUrl: getUrl(props['Source URL'] ?? props['URL']),
    status: getPropertyValue(props['Status']),
    dateIngested: getDate(props['Date ingested'] ?? props['Date Ingested']),
    linkedEntityIds: getRelationIds(props['Linked Entities'] ?? props['Knowledge Graph']),
    url: page.url,
  }
}

export async function fetchSecondBrainBundle(
  query: typeof queryAll = queryAll,
): Promise<SecondBrainBundle> {
  const [knowledgePages, rawSourcePages] = await Promise.all([
    query(notionSecondBrain, NOTION_DB.knowledgeGraph),
    query(notionSecondBrain, NOTION_DB.rawSources),
  ])
  const rawSources = rawSourcePages.map(normalizeRawSource)
  const sourceLabels = new Map(rawSources.map(source => [source.id, source.name || source.sourceUrl || source.id]))

  const nodes = knowledgePages
    .map(page => normalizeKnowledgePage(page, sourceLabels))
    .filter(node => Boolean(node.concept.trim()))

  return { nodes, rawSources }
}

export async function fetchKnowledgeGraphIndex(): Promise<KnowledgeNode[]> {
  return (await fetchSecondBrainBundle()).nodes
}

export async function fetchSecondBrainData(): Promise<SecondBrainData> {
  const { nodes, rawSources } = await fetchSecondBrainBundle()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  return {
    recentConcepts: nodes
      .filter(node => new Date(node.lastEditedAt).getTime() >= cutoff.getTime())
      .sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt))
      .slice(0, 20),
    unprocessedSources: rawSources.filter(source => source.status?.toLowerCase() === 'unprocessed'),
    fetchedAt: new Date().toISOString(),
  }
}
