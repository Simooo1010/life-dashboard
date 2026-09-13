import { describe, expect, it } from 'vitest'
import {
  interpretNewsletterProject,
  parseStructuredProjectState,
  reconcileProjectState,
  selectOperationalBlocks,
} from './interpretation'
import type { NewsletterProjectState, NewsletterSourceBlock } from './types'

const source = {
  pageId: 'newsletter-page',
  pageUrl: 'https://notion.so/newsletter',
  pageTitle: 'AI Newsletter — Master Project Brief & Source of Truth',
  lastEditedAt: '2026-09-13T10:59:00.000Z',
  fetchedAt: '2026-09-13T11:00:00.000Z',
  contentHash: 'source-hash',
}

function block(id: string, text: string, type = 'paragraph', headingPath: string[] = []): NewsletterSourceBlock {
  return { id, type, text, depth: headingPath.length, headingPath }
}

function state(overrides: Partial<NewsletterProjectState> = {}): NewsletterProjectState {
  return {
    projectName: 'AI, But clearer',
    source: { ...source, interpretation: 'deterministic', interpretedAt: source.fetchedAt },
    pulse: { evidenceBlockIds: {} },
    decisions: [],
    hypotheses: [],
    recommendations: [],
    openQuestions: [],
    blockers: [],
    components: [],
    recentChanges: [],
    milestones: [],
    additionalSections: [],
    ...overrides,
  }
}

describe('structured Current Project State', () => {
  it('takes priority and supports open-ended component names and extra sections', () => {
    const blocks = [
      block('h1', 'Current Project State', 'heading_1'),
      block('phase', 'Phase: Foundation'),
      block('focus', 'Current focus: Define the free and premium boundary'),
      block('d-head', 'Confirmed decisions', 'heading_2'),
      block('decision', 'Substack is the initial publishing and email engine', 'bulleted_list_item'),
      block('h-head', 'Active hypotheses', 'heading_2'),
      block('hypothesis', 'Instagram may be the first discovery channel', 'bulleted_list_item'),
      block('r-head', 'Recommendations', 'heading_2'),
      block('recommendation', 'Keep the website MVP small', 'bulleted_list_item'),
      block('q-head', 'Open questions', 'heading_2'),
      block('question', 'What belongs in the paid layer?', 'bulleted_list_item'),
      block('c-head', 'Active channels', 'heading_2'),
      block('component', 'Community lab — experimental — Member learning space', 'bulleted_list_item'),
      block('extra-head', 'Audience signals', 'heading_2'),
      block('extra', 'Beginners ask for practical starting points', 'bulleted_list_item'),
      block('stop', 'Deep strategy', 'heading_1'),
    ]

    const result = parseStructuredProjectState(blocks, source)

    expect(result?.pulse.phase).toBe('Foundation')
    expect(result?.pulse.currentFocus).toBe('Define the free and premium boundary')
    expect(result?.decisions).toHaveLength(1)
    expect(result?.hypotheses).toHaveLength(1)
    expect(result?.recommendations).toHaveLength(1)
    expect(result?.openQuestions).toHaveLength(1)
    expect(result?.components).toEqual([
      expect.objectContaining({ name: 'Community lab', status: 'experimental' }),
    ])
    expect(result?.additionalSections).toEqual([
      expect.objectContaining({ title: 'Audience signals', items: [expect.objectContaining({ title: 'Beginners ask for practical starting points' })] }),
    ])
  })
})

describe('state reconciliation', () => {
  it('removes resolved questions and promoted hypotheses when later decisions cover the topic', () => {
    const blocks = [
      block('old-question', 'OPEN: Which publishing platform should own email?'),
      block('old-hypothesis', 'Working hypothesis: use Substack as publishing platform.'),
      block('new-decision', 'CONFIRMED: Substack is the publishing and email platform.'),
    ]
    const result = reconcileProjectState(state({
      decisions: [{ id: 'd', title: 'Substack publishing and email platform', evidenceBlockIds: ['new-decision'] }],
      hypotheses: [{ id: 'h', title: 'Use Substack as publishing platform', evidenceBlockIds: ['old-hypothesis'] }],
      openQuestions: [{ id: 'q', title: 'Which publishing platform should own email?', evidenceBlockIds: ['old-question'] }],
    }), blocks)

    expect(result.decisions).toHaveLength(1)
    expect(result.hypotheses).toHaveLength(0)
    expect(result.openQuestions).toHaveLength(0)
  })

  it('drops superseded and unsupported current-state claims', () => {
    const blocks = [block('superseded', 'The newsletter-centred assumption has been superseded.')]
    const result = reconcileProjectState(state({
      decisions: [
        { id: 'old', title: 'Newsletter is the centre', evidenceBlockIds: ['superseded'] },
        { id: 'invented', title: 'Launch a podcast', evidenceBlockIds: ['missing'] },
      ],
    }), blocks)

    expect(result.decisions).toEqual([])
  })
})

describe('local project interpretation', () => {
  it('separates current decisions, hypotheses, recommendations, open questions and changes', async () => {
    const current = ['Next active phase — Operating model', 'Core architecture']
    const blocks = [
      block('phase', '26. Next active phase — Operating model', 'heading_1', ['26. Next active phase — Operating model']),
      block('status', 'Status: working direction agreed in discussion; details still to be specified.', 'paragraph', current),
      block('name', 'Newsletter name — CONFIRMED / LOCKED: "AI, But clearer."', 'paragraph', current),
      block('change', 'Update — 11 September 2026: the newsletter-centred assumption has been superseded.', 'paragraph', current),
      block('substack', 'Substack = initial publishing + email engine. This is a strong operating choice.', 'bulleted_list_item', current),
      block('website', 'Website = brand home and connective layer.', 'bulleted_list_item', current),
      block('hypothesis', 'The existence of multiple channels is a strong working hypothesis.', 'paragraph', current),
      block('recommendation', 'Assistant recommendation: build a website MVP, not the final technical platform.', 'paragraph', ['Next active phase — Operating model', 'Website strategy']),
      block('question', 'Status: OPEN / TO BE DECIDED. Define the FREE vs PREMIUM boundary precisely.', 'paragraph', ['Next active phase — Operating model', 'Immediate next decision']),
    ]

    const result = await interpretNewsletterProject({ source, blocks })

    expect(result.source.interpretation).toBe('deterministic')
    expect(result.projectName).toBe('AI, But clearer')
    expect(result.pulse.phase).toContain('Operating model')
    expect(result.pulse.currentState).toContain('working direction agreed')
    expect(result.decisions.map(item => item.evidenceBlockIds[0])).toEqual(expect.arrayContaining(['name', 'substack']))
    expect(result.hypotheses.map(item => item.evidenceBlockIds[0])).toEqual(['hypothesis'])
    expect(result.recommendations.map(item => item.evidenceBlockIds[0])).toEqual(['recommendation'])
    expect(result.openQuestions.map(item => item.evidenceBlockIds[0])).toEqual(['question'])
    expect(result.components.map(component => component.name)).toEqual(['Substack', 'Website'])
    expect(result.recentChanges).toEqual([expect.objectContaining({ date: '2026-09-11' })])
  })

  it('does not require a known component list and stays coherent when a component disappears', async () => {
    const path = ['Next active phase', 'Core architecture']
    const added = await interpretNewsletterProject({ source, blocks: [
      block('new-component', 'Community lab = experimental member learning space.', 'bulleted_list_item', path),
    ] })
    const removed = await interpretNewsletterProject({ source, blocks: [] })

    expect(added.components.map(component => component.name)).toEqual(['Community lab'])
    expect(removed.components).toEqual([])
  })
})

describe('operational block selection', () => {
  it('keeps current status signals without copying unrelated mission prose', () => {
    const blocks = [
      block('mission-h', 'Core mission', 'heading_1'),
      block('mission', 'A timeless mission statement.'),
      block('phase-h', 'Next active phase — Foundation', 'heading_1'),
      block('locked', 'Status: LOCKED — the brand name is AI, But clearer.'),
    ]

    const ids = selectOperationalBlocks(blocks).map(item => item.id)
    expect(ids).toContain('locked')
    expect(ids).not.toContain('mission')
  })
})
