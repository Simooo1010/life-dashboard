export interface NewsletterSourceBlock {
  id: string
  type: string
  text: string
  depth: number
  headingPath: string[]
}

export interface NewsletterSourceSnapshot {
  pageId: string
  pageUrl: string
  pageTitle: string
  lastEditedAt: string
  fetchedAt: string
  contentHash: string
}

export interface NewsletterStateItem {
  id: string
  title: string
  detail?: string
  date?: string
  evidenceBlockIds: string[]
}

export interface NewsletterComponent extends Omit<NewsletterStateItem, 'title'> {
  name: string
  kind?: string
  status?: string
}

export interface NewsletterSection {
  id: string
  title: string
  items: NewsletterStateItem[]
}

export interface NewsletterProjectState {
  projectName: string
  source: NewsletterSourceSnapshot & {
    interpretation: 'structured' | 'deterministic'
    interpretedAt: string
    warning?: string
  }
  pulse: {
    currentState?: string
    phase?: string
    currentFocus?: string
    latestMeaningfulChange?: string
    nextMilestone?: string
    evidenceBlockIds: Partial<Record<
      'currentState' | 'phase' | 'currentFocus' | 'latestMeaningfulChange' | 'nextMilestone',
      string[]
    >>
  }
  decisions: NewsletterStateItem[]
  hypotheses: NewsletterStateItem[]
  recommendations: NewsletterStateItem[]
  openQuestions: NewsletterStateItem[]
  blockers: NewsletterStateItem[]
  components: NewsletterComponent[]
  recentChanges: NewsletterStateItem[]
  milestones: NewsletterStateItem[]
  additionalSections: NewsletterSection[]
}

export interface NewsletterPageContent {
  source: NewsletterSourceSnapshot
  blocks: NewsletterSourceBlock[]
}
