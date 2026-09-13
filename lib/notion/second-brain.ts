import { notionSecondBrain, NOTION_DB, queryAll, getText, getSelect, getDate, getMultiSelect, getRelationIds, getUrl } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface KnowledgeNode {
  id: string
  concept: string
  category: string | null
  lastUpdated: string | null
  relatedIds: string[]
  url: string
}

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
  recentConcepts: KnowledgeNode[]  // updated in last 14 days
  unprocessedSources: RawSource[]
  fetchedAt: string
}

// ─── Fetchers ──────────────────────────────────────────────────────────────────
export async function fetchSecondBrainData(): Promise<SecondBrainData> {
  const [knowledgePages, rawSourcePages] = await Promise.all([
    queryAll(
      notionSecondBrain,
      NOTION_DB.knowledgeGraph,
      undefined,
      [{ property: 'Last updated', direction: 'descending' }],
    ),
    queryAll(
      notionSecondBrain,
      NOTION_DB.rawSources,
      {
        property: 'Status',
        select: { equals: 'Unprocessed' },
      },
    ),
  ])

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const cutoff = twoWeeksAgo.toISOString().split('T')[0]

  const recentConcepts: KnowledgeNode[] = knowledgePages
    .map(page => {
      const props = page.properties
      const lastUpdated = getDate(props['Last updated'] ?? props['Last Updated'])
      return {
        id: page.id,
        concept: getText(props['Concept'] ?? props['Name']),
        category: getSelect(props['Category']),
        lastUpdated,
        relatedIds: getRelationIds(props['Related concepts'] ?? props['Related']),
        url: page.url,
      }
    })
    .filter(n => n.lastUpdated && n.lastUpdated >= cutoff)
    .slice(0, 20)

  const unprocessedSources: RawSource[] = rawSourcePages.map(page => {
    const props = page.properties
    return {
      id: page.id,
      name: getText(props['Name']),
      sourceUrl: getUrl(props['Source URL']),
      status: getSelect(props['Status']),
      dateIngested: getDate(props['Date ingested']),
      linkedEntityIds: getRelationIds(props['Linked Entities']),
      url: page.url,
    }
  })

  return {
    recentConcepts,
    unprocessedSources,
    fetchedAt: new Date().toISOString(),
  }
}
