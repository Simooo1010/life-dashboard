import type {
  NewsletterComponent,
  NewsletterPageContent,
  NewsletterProjectState,
  NewsletterSection,
  NewsletterSourceBlock,
  NewsletterSourceSnapshot,
  NewsletterStateItem,
} from './types'

type CollectionKey = 'decisions' | 'hypotheses' | 'recommendations' | 'openQuestions' | 'blockers' | 'components' | 'recentChanges' | 'milestones'

const STRUCTURED_HEADING = /^(current project state|current state|project pulse|stato corrente del progetto)$/i
const COLLECTION_LABELS: Array<[CollectionKey, RegExp]> = [
  ['decisions', /^(confirmed|locked|current) decisions?|decisioni (confermate|correnti)$/i],
  ['hypotheses', /^(active|working) hypotheses?|ipotesi (attive|di lavoro)$/i],
  ['recommendations', /^recommendations?|raccomandazioni$/i],
  ['openQuestions', /^(open|unresolved) (questions?|decisions?)|questioni aperte|decisioni irrisolte$/i],
  ['blockers', /^blockers?|blocchi|ostacoli$/i],
  ['components', /^(active )?(channels?|components?|ecosystem)|canali attivi|componenti$/i],
  ['recentChanges', /^recent (meaningful )?changes?|cambiamenti recenti$/i],
  ['milestones', /^(upcoming )?milestones?|prossime tappe$/i],
]

function slug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function emptyState(source: NewsletterSourceSnapshot, interpretation: NewsletterProjectState['source']['interpretation']): NewsletterProjectState {
  return {
    projectName: source.pageTitle.replace(/\s+[—–-]\s+Master Project Brief.*$/i, '').trim(),
    source: { ...source, interpretation, interpretedAt: new Date().toISOString() },
    pulse: { evidenceBlockIds: {} },
    decisions: [], hypotheses: [], recommendations: [], openQuestions: [], blockers: [],
    components: [], recentChanges: [], milestones: [], additionalSections: [],
  }
}

function label(text: string): string {
  return text.trim().replace(/[:：]\s*$/, '')
}

function collectionFor(text: string): CollectionKey | null {
  return COLLECTION_LABELS.find(([, pattern]) => pattern.test(label(text)))?.[0] ?? null
}

function concise(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= 240) return clean
  const sentence = clean.slice(0, 240).match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()
  return sentence && sentence.length > 50 ? sentence : `${clean.slice(0, 237).trim()}…`
}

function item(block: NewsletterSourceBlock, prefix: string): NewsletterStateItem {
  return { id: `${prefix}-${slug(block.id) || slug(block.text)}`, title: concise(block.text), date: extractDate(block.text), evidenceBlockIds: [block.id] }
}

function itemWithTitle(block: NewsletterSourceBlock, prefix: string, title: string): NewsletterStateItem {
  return { id: `${prefix}-${slug(block.id) || slug(title)}`, title: concise(title), date: extractDate(block.text), evidenceBlockIds: [block.id] }
}

function openClause(text: string): string | null {
  if (/^(important:\s*distinguish|update this page|prompt for the next clean conversation)/i.test(text.trim())) return null
  if (/^these remain unresolved/i.test(text.trim())) return null
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
  const match = sentences.find(sentence => /open\s*\/\s*to be decided|open question|remains? open|still open|remains? unresolved|no .{0,80} (?:has|have) been decided yet|not yet decided/i.test(sentence))
  if (!match) return null
  const clean = match.replace(/^status\s*:\s*/i, '').trim()
  if (clean.length < 40 && /^open\s*\//i.test(clean)) {
    const expanded = sentences.slice(0, 2).join(' ').replace(/^status\s*:\s*/i, '').trim()
    return /this section records|does not yet lock/i.test(expanded) ? null : expanded
  }
  return clean
}

function component(block: NewsletterSourceBlock): NewsletterComponent {
  const parts = block.text.split(/\s*(?:=|[—–])\s*/).map(part => part.trim()).filter(Boolean)
  const statusPhrase = `${parts[0]} ${parts[1]?.slice(0, 60) ?? ''}`
  const explicitStatus = statusPhrase.match(/\b(active|planned|experimental|future|paused|undecided|initial|intended)\b/i)?.[1].toLowerCase()
  return {
    id: `component-${slug(block.id) || slug(block.text)}`,
    name: parts[0] ?? concise(block.text),
    ...(explicitStatus ? { status: explicitStatus } : {}),
    ...(parts.length > 1 ? { detail: concise(parts.slice(1).join(' — ')) } : {}),
    evidenceBlockIds: [block.id],
  }
}

export function parseStructuredProjectState(blocks: NewsletterSourceBlock[], source: NewsletterSourceSnapshot): NewsletterProjectState | null {
  const start = blocks.findIndex(block => block.type === 'heading_1' && STRUCTURED_HEADING.test(block.text.trim()))
  if (start < 0) return null
  const state = emptyState(source, 'structured')
  let collection: CollectionKey | null = null
  let additional: NewsletterSection | null = null

  for (let index = start + 1; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block.type === 'heading_1') break
    const knownCollection = collectionFor(block.text)
    if (knownCollection) {
      collection = knownCollection
      additional = null
      continue
    }
    if (block.type === 'heading_2') {
      collection = null
      additional = { id: `section-${slug(block.text)}`, title: block.text, items: [] }
      state.additionalSections.push(additional)
      continue
    }

    const scalar = block.text.match(/^(project(?: name)?|phase|status|current (?:project )?state|current focus|next milestone|last meaningful (?:update|change))\s*:\s*(.+)$/i)
    if (scalar) {
      const key = scalar[1].toLowerCase()
      const value = scalar[2].trim()
      if (key.startsWith('project')) state.projectName = value
      else if (key === 'phase') { state.pulse.phase = value; state.pulse.evidenceBlockIds.phase = [block.id] }
      else if (key === 'current focus') { state.pulse.currentFocus = value; state.pulse.evidenceBlockIds.currentFocus = [block.id] }
      else if (key === 'next milestone') { state.pulse.nextMilestone = value; state.pulse.evidenceBlockIds.nextMilestone = [block.id] }
      else if (key.startsWith('last meaningful')) { state.pulse.latestMeaningfulChange = value; state.pulse.evidenceBlockIds.latestMeaningfulChange = [block.id] }
      else { state.pulse.currentState = value; state.pulse.evidenceBlockIds.currentState = [block.id] }
      continue
    }
    if (!block.text.trim() || block.type.startsWith('heading_')) continue
    if (additional) additional.items.push(item(block, additional.id))
    else if (collection === 'components') state.components.push(component(block))
    else if (collection) state[collection].push(item(block, collection))
  }
  return reconcileProjectState(state, blocks)
}

const MONTHS: Record<string, string> = {
  january: '01', gennaio: '01', february: '02', febbraio: '02', march: '03', marzo: '03', april: '04', aprile: '04', may: '05', maggio: '05', june: '06', giugno: '06', july: '07', luglio: '07', august: '08', agosto: '08', september: '09', settembre: '09', october: '10', ottobre: '10', november: '11', novembre: '11', december: '12', dicembre: '12',
}

function extractDate(text: string): string | undefined {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) return iso[0]
  const dayFirst = text.match(/\b(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(20\d{2})\b/)
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()]
    if (month) return `${dayFirst[3]}-${month}-${dayFirst[1].padStart(2, '0')}`
  }
  return undefined
}

const STOP_WORDS = new Set('a an and are as at be by for from how in is it of on or should the to use what which with che come con da del della di e il in la le per un una status current confirmed locked decision recommendation open final simone'.split(' '))

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(token => token.length > 2 && !STOP_WORDS.has(token)).map(token => token === 'naming' ? 'name' : token.endsWith('ed') ? token.slice(0, -1) : token))
}

function sameTopic(left: string, right: string): boolean {
  const topicKey = (value: string) => {
    if (/\bfinal newsletter name\b|\b(?:newsletter|final)\s+(?:name|naming)\b|\b(?:name|naming)\b.{0,30}\bnewsletter\b|\b(?:name|naming)\b/i.test(value)) return 'project-name'
    if (/\b(?:substack|publishing).{0,50}\b(?:email|platform|engine)\b|\b(?:email|platform|engine).{0,50}\b(?:substack|publishing)\b/i.test(value)) return 'publishing-platform'
    return null
  }
  const leftKey = topicKey(left)
  const rightKey = topicKey(right)
  if (leftKey && leftKey === rightKey) return true
  const a = tokens(left); const b = tokens(right)
  if (!a.size || !b.size) return false
  const overlap = [...a].filter(token => b.has(token)).length
  return overlap >= 2 && overlap / Math.min(a.size, b.size) >= 0.5
}

function evidenceIndex(entry: { evidenceBlockIds: string[] }, indexes: Map<string, number>): number {
  return Math.max(-1, ...entry.evidenceBlockIds.map(id => indexes.get(id) ?? -1))
}

function dedupe<T extends { title?: string; name?: string }>(entries: T[]): T[] {
  const seen = new Set<string>()
  return entries.filter(entry => {
    const key = slug(entry.title ?? entry.name ?? '')
    if (!key || seen.has(key)) return false
    seen.add(key); return true
  })
}

export function reconcileProjectState(state: NewsletterProjectState, blocks: NewsletterSourceBlock[]): NewsletterProjectState {
  const byId = new Map(blocks.map(block => [block.id, block]))
  const indexes = new Map(blocks.map((block, index) => [block.id, index]))
  const grounded = <T extends { evidenceBlockIds: string[] }>(entries: T[]) => entries.filter(entry => entry.evidenceBlockIds.some(id => byId.has(id)))
  const superseded = (entry: NewsletterStateItem) => {
    const evidence = entry.evidenceBlockIds.map(id => byId.get(id)?.text ?? '').join(' ')
    return /supersed|superat|no longer|non (?:è|e) più/i.test(evidence) && sameTopic(entry.title, evidence)
  }
  const sortCurrent = <T extends { date?: string; evidenceBlockIds: string[] }>(entries: T[]) => [...entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || evidenceIndex(b, indexes) - evidenceIndex(a, indexes))

  const topicDedupe = (entries: NewsletterStateItem[]) => entries.filter((entry, index) => !entries.slice(0, index).some(existing => sameTopic(existing.title, entry.title)))
  const decisions = topicDedupe(sortCurrent(dedupe(grounded(state.decisions).filter(entry => !superseded(entry))))).slice(0, 6)
  const resolved = (entry: NewsletterStateItem) => decisions.some(decision => evidenceIndex(decision, indexes) >= evidenceIndex(entry, indexes) && sameTopic(decision.title, entry.title))
  const filterItems = (entries: NewsletterStateItem[], allowSuperseded = false) => sortCurrent(dedupe(grounded(entries).filter(entry => allowSuperseded || !superseded(entry)))).slice(0, 8)
  const recentChanges = filterItems(state.recentChanges, true).slice(0, 5)
  const milestones = filterItems(state.milestones).slice(0, 6)
  const pulse = { ...state.pulse, evidenceBlockIds: { ...state.pulse.evidenceBlockIds } }
  for (const key of ['currentState', 'phase', 'currentFocus', 'latestMeaningfulChange', 'nextMilestone'] as const) {
    if (pulse[key] && !(pulse.evidenceBlockIds[key] ?? []).some(id => byId.has(id))) delete pulse[key]
  }
  if (!pulse.latestMeaningfulChange && recentChanges[0]) { pulse.latestMeaningfulChange = recentChanges[0].title; pulse.evidenceBlockIds.latestMeaningfulChange = recentChanges[0].evidenceBlockIds }

  return {
    ...state,
    pulse,
    decisions,
    hypotheses: filterItems(state.hypotheses).filter(entry => !resolved(entry)).slice(0, 6),
    recommendations: filterItems(state.recommendations).filter(entry => !resolved(entry)).slice(0, 6),
    openQuestions: filterItems(state.openQuestions).filter(entry => !resolved(entry)).slice(0, 6),
    blockers: filterItems(state.blockers).slice(0, 5),
    components: dedupe(grounded(state.components)).slice(0, 12),
    recentChanges,
    milestones: grounded(state.milestones).slice(0, 6),
    additionalSections: state.additionalSections.map(section => ({ ...section, items: filterItems(section.items) })).filter(section => section.items.length > 0),
  }
}

const OPERATIONAL_SIGNAL = /\b(confirmed|locked|working hypothesis|working direction|recommendation|open question|open\s*\/\s*to be decided|to be decided|unresolved|supersed(?:e|ed|es|ing)?|status update|current direction|current principle|strong operating choice|immediate next decision|next active phase|blocker|milestone|phase\s+\d)\b/i
const OPERATIONAL_HEADING = /\b(current|confirmed|decision|hypothes|question|blocker|milestone|operating model|core architecture|ecosystem|channels?|rollout phases?|capacity constraint|free vs premium|content architecture|personalisation model|website strategy|next active phase)\b/i

export function selectOperationalBlocks(blocks: NewsletterSourceBlock[], maxCharacters = 90_000): NewsletterSourceBlock[] {
  const chosen: NewsletterSourceBlock[] = []
  let characters = 0
  for (const block of blocks) {
    const relevant = OPERATIONAL_SIGNAL.test(block.text) || OPERATIONAL_HEADING.test(block.text) || block.headingPath.some(heading => OPERATIONAL_HEADING.test(heading))
    if (!relevant) continue
    const length = block.text.length + block.headingPath.join(' > ').length + 20
    if (characters + length > maxCharacters) continue
    chosen.push(block); characters += length
  }
  return chosen
}

function interpretDeterministically(content: NewsletterPageContent): NewsletterProjectState {
  const state = emptyState(content.source, 'deterministic')
  let rolloutPhase = 0
  let activeRolloutPhase = 0

  for (const block of content.blocks) {
    const text = block.text.trim()
    const path = block.headingPath.join(' > ')
    const currentContext = /next active phase|current project state|operating[- ]model update|core architecture|immediate next decision|website strategy|current strategic model|free vs premium|content architecture|capacity constraint/i.test(path)
    const proseBlock = !block.type.startsWith('heading_') && block.type !== 'quote'
    const name = text.match(/newsletter name[^:]*\b(?:confirmed|locked)\b[^:]*:\s*["“]?([^"”]+?)["”]?(?:\.|$)/i)
    if (name) state.projectName = name[1].replace(/["“”]/g, '').replace(/\.$/, '').trim()

    if (/next active phase/i.test(text) && block.type === 'heading_1') {
      state.pulse.phase = text.replace(/^\d+\.\s*/, '').replace(/^next active phase\s*[—–:-]?\s*/i, '').trim()
      state.pulse.evidenceBlockIds.phase = [block.id]
    }
    if (/^status\s*:/i.test(text) && /next active phase|operating-model update/i.test(path) && !state.pulse.currentState) {
      state.pulse.currentState = concise(text.replace(/^status\s*:\s*/i, ''))
      state.pulse.evidenceBlockIds.currentState = [block.id]
    }
    if (/immediate next decision/i.test(path) && !block.type.startsWith('heading_') && !state.pulse.currentFocus && !/^status\s*:/i.test(text)) {
      state.pulse.currentFocus = concise(text)
      state.pulse.evidenceBlockIds.currentFocus = [block.id]
    }

    const isNotConfirmed = /not (?:yet )?confirmed|non (?:ancora )?confermat/i.test(text)
    const isRecommendation = /\b(?:assistant )?recommendation\b/i.test(text)
    const explicitGlobalDecision = /(?:newsletter name|naming decision|final newsletter name).{0,140}\b(confirmed|locked)\b|\b(confirmed|locked)\b.{0,140}(?:newsletter name|final newsletter name)/i.test(text)
    const currentOperatingUpdate = /(?:status update|current working direction).{0,140}(?:substack|initial publishing|website|ecosystem)/i.test(text)
    const isDecision = block.type !== 'quote' && !isNotConfirmed && !isRecommendation && (explicitGlobalDecision || (currentContext && /\b(confirmed|locked|strong operating choice|agreed working distinction|current principle|current strategic stance|current launch principle)\b/i.test(text)) || currentOperatingUpdate)
    if (isDecision) state.decisions.push(item(block, 'decision'))
    else if (proseBlock && isRecommendation && currentContext) state.recommendations.push(item(block, 'recommendation'))
    else if (proseBlock && currentContext && !/^status\s*:/i.test(text) && /\b(working hypothesis|working direction|strong working hypothesis)\b/i.test(text)) state.hypotheses.push(item(block, 'hypothesis'))

    const unresolved = proseBlock ? openClause(text) : null
    if (unresolved) state.openQuestions.push(itemWithTitle(block, 'question', unresolved))
    if (currentContext && /\b(blocker|blocked|capacity constraint)\b/i.test(text)) state.blockers.push(item(block, 'blocker'))
    const datedUpdate = Boolean(extractDate(text)) && /^(?:status update|update|operating[- ]model update|naming status update)/i.test(text)
    if (datedUpdate && /\b(supersed(?:e|ed|es|ing)?|status update|update\s*[—–-])\b/i.test(text)) state.recentChanges.push(item(block, 'change'))

    if (/core architecture|ecosystem components?|channels?/i.test(path) && /bulleted_list_item|numbered_list_item/.test(block.type) && /(?:=|[—–])/.test(text)) state.components.push(component(block))

    const phaseMatch = text.match(/^phase\s+(\d+)\s*[—–:-]\s*(.+)$/i)
    if (/rollout phases?/i.test(path) && phaseMatch) {
      rolloutPhase = Number(phaseMatch[1])
      if (!activeRolloutPhase) activeRolloutPhase = rolloutPhase
      if (!state.pulse.phase) { state.pulse.phase = phaseMatch[2].trim(); state.pulse.evidenceBlockIds.phase = [block.id] }
      continue
    }
    if (rolloutPhase === activeRolloutPhase && /rollout phases?/i.test(path) && /bulleted_list_item|numbered_list_item/.test(block.type)) state.milestones.push(item(block, 'milestone'))
  }

  return reconcileProjectState(state, content.blocks)
}

export async function interpretNewsletterProject(content: NewsletterPageContent): Promise<NewsletterProjectState> {
  return parseStructuredProjectState(content.blocks, content.source) ?? interpretDeterministically(content)
}
