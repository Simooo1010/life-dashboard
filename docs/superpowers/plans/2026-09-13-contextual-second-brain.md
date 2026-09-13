# Contextual Second Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live, grounded, graph-aware Second Brain recommender shared by Home and `/second-brain`.

**Architecture:** Normalize live Calendar, Life OS, and Newsletter data into evidence-addressable daily facts. Refresh/cache real Knowledge Graph page content, score candidates through deterministic and Groq semantic signals, then validate evidence, apply graph/history/diversity rules, and persist the derived result.

**Tech Stack:** Next.js 15, React 19, TypeScript, Notion SDK, Groq SDK, Drizzle/libSQL, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-contextual-second-brain-design.md`

## Global Constraints

- Notion and Google Calendar remain authoritative; local/Supabase records are derived cache or history only.
- No Knowledge Graph page without substantive retrieved content can produce a recommendation.
- `Why today` and `Key idea` must pass source-evidence validation.
- Home displays the first one or two items from the same ranked result used by `/second-brain`.
- Empty and partial data never produce invented facts or quota-filling recommendations.
- All day boundaries use `WEATHER_TIMEZONE`, falling back to `Europe/Rome`.

---

### Task 1: Test runner and live Notion primitives

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `lib/notion/client.ts`
- Create: `lib/notion/blocks.ts`
- Test: `lib/notion/blocks.test.ts`

**Interfaces:**
- Produces: `listAllBlockChildren(blockId: string): Promise<BlockObjectResponse[]>`
- Produces: `extractBlockText(blocks: BlockObjectResponse[]): string`
- Produces: property readers for status, checkbox/select truth state, and relation-backed source material.

- [ ] Add Vitest and a `test` script.
- [ ] Write failing tests proving recursive block text extraction preserves headings, lists, nested children, links, and excludes unsupported empty blocks.
- [ ] Run the focused tests and confirm failure because the block module is absent.
- [ ] Implement paginated recursive block retrieval and deterministic normalized text extraction.
- [ ] Run focused tests and typecheck.

### Task 2: Live Life OS and Newsletter adapters

**Files:**
- Modify: `lib/notion/life-os.ts`
- Create: `lib/notion/newsletter.ts`
- Create: `lib/life-os/types.ts`
- Create: `lib/life-os/normalize.ts`
- Test: `lib/life-os/normalize.test.ts`
- Test: `lib/notion/newsletter.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `fetchLifeOsSnapshot(): Promise<LifeOsSnapshot>`
- Produces: `fetchNewsletterSnapshot(): Promise<NewsletterSnapshot>`
- Normalized records retain source IDs, URLs, dates, status, type, subject/domain, and source diagnostics.

- [ ] Write failing normalization tests for schedule, homework, written/oral assessments, dates, statuses, Italian/English aliases, empty data, and inaccessible relations.
- [ ] Confirm the focused tests fail against the current hardcoded adapter.
- [ ] Implement root-block database discovery, configured-ID de-duplication, schema-tolerant row normalization, and source diagnostics.
- [ ] Write and run failing Newsletter tests for active/due project state and static-background omission.
- [ ] Implement live Newsletter page/database retrieval and normalization.
- [ ] Run both focused suites and typecheck.

### Task 3: Evidence-addressable daily context

**Files:**
- Create: `lib/daily-context/types.ts`
- Create: `lib/daily-context/build.ts`
- Create: `lib/daily-context/service.ts`
- Test: `lib/daily-context/build.test.ts`
- Modify: `lib/calendar/google.ts`

**Interfaces:**
- Produces: `buildDailyContext(input: DailyContextInput): DailyContext`
- Produces: `loadDailyContext(now?: Date): Promise<DailyContextResult>`
- Every fact has a stable ID, source, kind, title, optional detail/date/URL, urgency, and normalized tokens.

- [ ] Write failing tests for Europe/Rome day boundaries, Calendar facts, school schedule, homework, assessments, deadlines, Newsletter relevance, workload concentration, empty-source omission, and deterministic context hashing.
- [ ] Confirm failures reflect missing context behavior.
- [ ] Implement the pure builder and local-date helpers.
- [ ] Update Calendar bucketing to the shared local-day logic and prevent cache reuse across local days.
- [ ] Implement the source-isolated context service.
- [ ] Run the focused suite and typecheck.

### Task 4: Knowledge Graph content model and derived persistence

**Files:**
- Replace: `lib/notion/second-brain.ts`
- Create: `lib/second-brain/types.ts`
- Create: `lib/second-brain/content.ts`
- Create: `lib/second-brain/repository.ts`
- Modify: `db/schema.ts`
- Modify: `db/index.ts`
- Modify: `supabase-init.sql`
- Test: `lib/second-brain/content.test.ts`
- Test: `lib/second-brain/repository.test.ts`

**Interfaces:**
- Produces: `fetchKnowledgeGraphIndex(): Promise<KnowledgeNode[]>`
- Produces: `refreshKnowledgeContent(nodes: KnowledgeNode[]): Promise<KnowledgeDocument[]>`
- Produces: repository methods `getContent`, `putContent`, `getRun`, `putRun`, `getHistory`, and `recordHistory` across local and cloud modes.

- [ ] Write failing tests for Category, relations, Source material, Truth-Checked variants, actual page content, changed-revision refresh, and changed-page failure exclusion.
- [ ] Implement the schema-tolerant Knowledge Graph adapter and content refresher with bounded concurrency.
- [ ] Write failing repository contract tests proving cache revision checks and one-history-row-per-page/day behavior.
- [ ] Add equivalent SQLite/Supabase tables and repository implementations.
- [ ] Run focused suites and typecheck.

### Task 5: Ranking, graph expansion, grounding, and repetition control

**Files:**
- Create: `lib/second-brain/rank.ts`
- Create: `lib/second-brain/grounding.ts`
- Create: `lib/second-brain/semantic.ts`
- Test: `lib/second-brain/rank.test.ts`
- Test: `lib/second-brain/grounding.test.ts`

**Interfaces:**
- Produces: `rankRecommendations(input: RankingInput): RankedRecommendation[]`
- Produces: `expandGraphCandidates(seedIds: string[], graph: KnowledgeNode[]): string[]`
- Produces: `validateSemanticAssessments(assessments, context, documents): GroundedAssessment[]`
- Semantic assessments contain candidate ID, direct/situational/semantic scores, context fact IDs, content evidence IDs, explanation, and key idea.

- [ ] Write failing tests matching acceptance behaviors 1-9 with hand-derived score expectations.
- [ ] Confirm each test fails because ranking/grounding behavior is absent.
- [ ] Implement deterministic score composition, one-hop expansion, quality/recency/history signals, thresholding, and diversity.
- [ ] Implement strict semantic response parsing and evidence validation.
- [ ] Implement batched Groq assessment plus an evidence-only fallback.
- [ ] Run both focused suites and typecheck.

### Task 6: Contextual recommendation service and cache invalidation

**Files:**
- Create: `lib/second-brain/service.ts`
- Test: `lib/second-brain/service.test.ts`
- Modify: `lib/groq/synthesis.ts`
- Modify: `lib/orchestrator/daily-sync.ts`

**Interfaces:**
- Produces: `getContextualSecondBrain(contextResult?: DailyContextResult): Promise<SecondBrainResult>`
- `SecondBrainResult` contains `relevantToday`, `rediscover`, diagnostics, hashes, and `generatedAt`.
- `OrchestratorResult` exposes the same `SecondBrainResult` consumed by both surfaces.

- [ ] Write failing service tests for cache keys, changed context, changed KG revision, cached page refreshes, idempotent history, and zero-result behavior.
- [ ] Implement orchestration of index, content refresh, semantic assessment, graph expansion, ranking, result persistence, and history.
- [ ] Update daily synthesis input/hash to use daily context and contextual recommendations rather than recent titles.
- [ ] Run focused suites and typecheck.

### Task 7: Shared Home and `/second-brain` presentation

**Files:**
- Modify: `components/home/SecondBrainSection.tsx`
- Create: `components/second-brain/RecommendationCard.tsx`
- Create: `components/second-brain/RelevantToday.tsx`
- Create: `components/second-brain/Rediscover.tsx`
- Modify: `app/second-brain/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/api/sync/[source]/route.ts`
- Test: `components/second-brain/recommendation-view.test.tsx`

**Interfaces:**
- Home consumes `SecondBrainResult.relevantToday.slice(0, 2)`.
- The dedicated page consumes the complete shared `SecondBrainResult`.

- [ ] Add the React test dependencies required for server-safe component rendering.
- [ ] Write failing render tests proving evidence fields, Notion links, zero-state behavior, maximum counts, and acceptance behavior 10.
- [ ] Implement recommendation cards and the two dedicated sections using existing visual tokens.
- [ ] Replace Home's recency chips with the strongest one or two shared recommendations.
- [ ] Update the sync API to return contextual results and diagnostics.
- [ ] Run focused render tests and typecheck.

### Task 8: Full verification and real-source acceptance

**Files:**
- Modify when required by discovered live schema: `.env.example`, relevant Notion adapters, and their tests.
- Modify: `ONBOARDING.md` only if verified architecture facts changed and without overwriting unrelated content.

**Interfaces:**
- No new production interface; this task validates the complete feature.

- [ ] Inspect the live connected Notion roots/databases read-only and compare actual property/block types with adapter diagnostics.
- [ ] Add a failing fixture regression before correcting any live-schema mismatch.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run typecheck` and require exit code 0.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Start the authenticated dashboard and verify Home plus `/second-brain` at desktop and mobile widths.
- [ ] Demonstrate that current real Calendar/Life OS/Newsletter facts appear in `Why today` and Knowledge Graph content appears in `Key idea`.
- [ ] Demonstrate source-change invalidation using a user-made Notion change or obtain explicit authorization before creating a reversible temporary record.
- [ ] Review all ten acceptance criteria against fresh evidence and report any externally blocked item precisely.
