# Life OS Operational Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Life OS rules screen with a live, source-traceable operational view that combines Notion and Google Calendar, and add a compact Life OS pulse to Home.

**Architecture:** A tolerant Notion adapter normalizes accessible databases beneath “Life OS Managing” into stable domain types. A pure interpretation layer combines those records with Calendar, computes deterministic summaries and anomalies, and feeds both the dedicated page and Home; Groq may narrate the facts but never defines them.

**Tech Stack:** Next.js 15 App Router, React 19 server components, TypeScript 5.6, Notion SDK 2, Tailwind CSS 3, Vitest 3, Google Calendar iCal.

**Spec:** `docs/superpowers/specs/2026-09-13-life-os-operational-dashboard-design.md`

## Global Constraints

- Google Calendar is canonical for scheduled commitments, times, and locations.
- Operational facts and summaries are deterministic TypeScript outputs and retain source identifiers or URLs.
- Never invent dates, priorities, subjects, statuses, grades, domains, or sample records.
- Date-only values stay local; calculate boundaries in `WEATHER_TIMEZONE`, falling back to `Europe/Rome`.
- Show non-school Life Areas only when backed by real normalized records.
- Keep system/source information secondary and distinguish unavailable sources from empty sources.
- Preserve the current Inter typography and palette: `#F7F5F2`, `#FFFFFF`, `#1A1816`, `#3B6FD4`, `#C9671A`, and `#B45309`.
- The dedicated page and Home pulse must remain factual without Groq output.
- Do not modify or commit the pre-existing untracked `ONBOARDING.md`.

## File Structure

- Create `vitest.config.ts`: test environment and `@` alias.
- Modify `package.json` and `package-lock.json`: add Vitest and test scripts.
- Create `lib/life-os/types.ts`: source-normalized and operational view contracts.
- Create `lib/life-os/dates.ts`: time-zone-safe local-day helpers.
- Create `lib/life-os/dates.test.ts`: local-date and window boundary tests.
- Create `lib/notion/life-os-schema.ts`: pure property aliasing and row normalization.
- Create `lib/notion/life-os-schema.test.ts`: realistic Notion row fixtures.
- Rewrite `lib/notion/life-os.ts`: page/database discovery, queries, relation resolution, diagnostics.
- Create `lib/notion/life-os.test.ts`: fake-client discovery and partial-access tests.
- Create `lib/life-os/interpret.ts`: deterministic bucketing, summary, workload, conflicts, and pulse selection.
- Create `lib/life-os/interpret.test.ts`: operational behavior tests.
- Create `lib/life-os/service.ts`: failure-isolated Notion plus Calendar composition.
- Create `lib/life-os/service.test.ts`: available, empty, partial, and unavailable source tests.
- Modify `lib/calendar/google.ts`: live fetch, explicit source availability, and correct seven-day boundary.
- Modify `lib/orchestrator/daily-sync.ts`: fetch and expose Life OS alongside existing sources.
- Modify `lib/groq/synthesis.ts`: stable Life OS hash input and bounded prompt facts.
- Create `lib/groq/synthesis.test.ts`: cache invalidation and timestamp exclusion tests.
- Create `components/life-os/LifeOsDashboard.tsx`: dedicated-page composition.
- Create `components/life-os/TodayNow.tsx`: blue operational day rail.
- Create `components/life-os/NextSevenDays.tsx`: grouped chronological list.
- Create `components/life-os/SchoolOverview.tsx`: counts, nearest assessment, and workload strip.
- Create `components/life-os/OtherLifeAreas.tsx`: source-backed non-school domains.
- Create `components/life-os/SystemStatus.tsx`: secondary freshness and diagnostics.
- Create `components/life-os/LifeOsDashboard.test.tsx`: server-rendered populated and empty fixtures.
- Replace `app/life-os/page.tsx`: live service call and error boundary.
- Create `components/home/LifeOsPulse.tsx`: compact Home summary.
- Create `components/home/LifeOsPulse.test.tsx`: cap, empty, and unavailable rendering.
- Modify `app/page.tsx`: place the pulse after today's timeline.
- Modify `.env.example` and `README.md`: document optional database overrides and source behavior.

---

### Task 1: Test foundation and stable domain contracts

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/life-os/types.ts`
- Create: `lib/life-os/dates.ts`
- Test: `lib/life-os/dates.test.ts`

**Interfaces:**
- Produces: `LifeOsItem`, `SchoolScheduleEntry`, `LifeOsSnapshot`, `LifeOsSourceStatus`, `OperationalItem`, `OperationalDay`, `SchoolOverview`, `LifeAreaOverview`, `LifeOsOverview`, `LifeOsPulseFact`, `toLocalDateKey()`, and `getOperationalDateWindow()`.

- [ ] **Step 1: Install and configure Vitest**

Run: `npm install --save-dev vitest@^3.2.4`

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Configure the Node environment and repository alias:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { environment: 'node' },
})
```

- [ ] **Step 2: Write failing local-date boundary tests**

```ts
import { describe, expect, it } from 'vitest'
import { getOperationalDateWindow, toLocalDateKey } from './dates'

describe('Life OS date boundaries', () => {
  it('keeps date-only values unchanged', () => {
    expect(toLocalDateKey('2026-09-13', 'Europe/Rome')).toBe('2026-09-13')
  })

  it('uses Rome local time across a UTC midnight', () => {
    expect(toLocalDateKey('2026-09-12T22:30:00.000Z', 'Europe/Rome')).toBe('2026-09-13')
  })

  it('defines tomorrow through day seven as exactly seven future dates', () => {
    expect(getOperationalDateWindow(new Date('2026-09-13T10:00:00+02:00'), 'Europe/Rome')).toEqual({
      today: '2026-09-13', tomorrow: '2026-09-14', futureEnd: '2026-09-20',
    })
  })
})
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- lib/life-os/dates.test.ts`

Expected: FAIL because `dates.ts` and its exports do not exist.

- [ ] **Step 4: Add domain types and the minimal date implementation**

Define the contracts from the design spec. Implement date formatting with `Intl.DateTimeFormat(...).formatToParts()` and add days by moving a UTC-noon anchor so DST transitions cannot skip a local date.

```ts
export function toLocalDateKey(value: string | Date, timeZone: string): string
export function getOperationalDateWindow(
  now: Date,
  timeZone: string,
): { today: string; tomorrow: string; futureEnd: string }
```

- [ ] **Step 5: Verify GREEN and compile the contracts**

Run: `npm test -- lib/life-os/dates.test.ts`

Expected: 3 tests pass.

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/life-os/types.ts lib/life-os/dates.ts lib/life-os/dates.test.ts
git commit -m "test: add Life OS domain foundation"
```

### Task 2: Tolerant Notion discovery and normalization

**Files:**
- Create: `lib/notion/life-os-schema.ts`
- Test: `lib/notion/life-os-schema.test.ts`
- Rewrite: `lib/notion/life-os.ts`
- Test: `lib/notion/life-os.test.ts`
- Modify: `lib/notion/client.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `LifeOsItem`, `SchoolScheduleEntry`, `LifeOsSnapshot`, and `LifeOsSourceStatus` from Task 1.
- Produces: `normalizeLifeOsPage(page, relationTitles, role)`, `discoverLifeOsDatabaseIds(client, rootId)`, and `fetchLifeOsData(options?): Promise<LifeOsSnapshot>`.

- [ ] **Step 1: Write failing normalization tests**

Use typed fixture builders for Notion `PageObjectResponse` properties. Cover:

```ts
it('normalizes Italian homework fields without inventing a priority', () => {
  const result = normalizeLifeOsPage(page({
    Titolo: title('Esercizi 42-48'),
    Tipo: select('Compiti'),
    Materia: select('Matematica'),
    Scadenza: date('2026-09-15'),
    Stato: status('Da fare'),
  }), new Map(), 'school')

  expect(result.item).toMatchObject({
    title: 'Esercizi 42-48', type: 'homework', subject: 'Matematica',
    due: '2026-09-15', status: 'open', priority: null,
  })
})

it('creates a schedule entry only from a real weekday and subject', () => {
  const result = normalizeLifeOsPage(page({
    Nome: title('Prima ora'), Giorno: select('Lunedì'), Materia: select('Fisica'),
  }), new Map(), 'school')
  expect(result.scheduleEntry).toMatchObject({ weekday: 1, subject: 'Fisica' })
})

it('flags an assessment whose subject relation is inaccessible', () => {
  const result = normalizeLifeOsPage(page({
    Nome: title('Verifica'), Tipo: select('Verifica scritta'), Materia: relation('missing-id'),
    Data: date('2026-09-18'),
  }), new Map(), 'school')
  expect(result.item?.issues.map(issue => issue.code)).toContain('missing-subject')
})
```

- [ ] **Step 2: Verify schema tests fail for missing exports**

Run: `npm test -- lib/notion/life-os-schema.test.ts`

Expected: FAIL because the normalizer is absent.

- [ ] **Step 3: Implement alias-driven normalization**

Implement `normalizePropertyName()` with lowercase Unicode NFD accent removal. Inspect property types before alias names. Map explicit type values using Italian/English keywords; unrecognized values become `other`. Map status values such as `done`, `completed`, `completato`, and `fatto` to `done`, and `open`, `to do`, `da fare`, and `in corso` to `open`; absent or unknown statuses remain `unknown`.

Return this explicit result:

```ts
interface NormalizedLifeOsPage {
  item: LifeOsItem | null
  scheduleEntry: SchoolScheduleEntry | null
  sourceIssues: LifeOsIssue[]
}
```

- [ ] **Step 4: Run normalization tests and verify GREEN**

Run: `npm test -- lib/notion/life-os-schema.test.ts`

Expected: all normalization tests pass.

- [ ] **Step 5: Write failing discovery and partial-access tests**

Create a fake client whose `blocks.children.list` returns nested `child_database` blocks and whose database query rejects for one ID. Assert that discovery de-duplicates configured IDs and `fetchLifeOsData` returns usable rows plus a `partial` status for the failed database.

```ts
expect(snapshot.items).toHaveLength(1)
expect(snapshot.sources).toEqual(expect.arrayContaining([
  expect.objectContaining({ sourceId: 'blocked-db', state: 'partial' }),
]))
```

- [ ] **Step 6: Verify discovery tests fail**

Run: `npm test -- lib/notion/life-os.test.ts`

Expected: FAIL because live discovery is not implemented.

- [ ] **Step 7: Implement the Notion adapter**

Add a narrow injected client interface around `pages.retrieve`, `blocks.children.list`, `databases.retrieve`, and `databases.query`. Paginate block children and database rows. Traverse blocks with `has_children` to a maximum depth of four, track visited block IDs, resolve related page titles through a per-request `Map`, and isolate failures per database.

```ts
export interface FetchLifeOsOptions {
  client?: LifeOsNotionClient
  rootPageId?: string
  databaseIds?: string[]
  schoolDatabaseIds?: string[]
  logDatabaseIds?: string[]
}

export async function fetchLifeOsData(
  options: FetchLifeOsOptions = {},
): Promise<LifeOsSnapshot>
```

If the token or root page is unavailable, return an empty snapshot with an `unavailable` source status. Do not return the former hardcoded operating rules.

- [ ] **Step 8: Document database overrides and verify GREEN**

Document `NOTION_LIFE_OS_DATABASE_IDS`, `NOTION_LIFE_OS_SCHOOL_DATABASE_IDS`, and `NOTION_LIFE_OS_LOG_DATABASE_IDS` as optional comma-separated IDs. Explain that nested databases are discovered automatically and linked databases may need an override.

Run: `npm test -- lib/notion/life-os-schema.test.ts lib/notion/life-os.test.ts`

Expected: all adapter tests pass.

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add lib/notion/life-os-schema.ts lib/notion/life-os-schema.test.ts lib/notion/life-os.ts lib/notion/life-os.test.ts lib/notion/client.ts .env.example README.md
git commit -m "feat: read structured Life OS data from Notion"
```

### Task 3: Deterministic operational interpretation

**Files:**
- Create: `lib/life-os/interpret.ts`
- Test: `lib/life-os/interpret.test.ts`

**Interfaces:**
- Consumes: `LifeOsSnapshot`, `CalendarData`, `CalendarEvent`, `now`, and `timeZone`.
- Produces: `buildLifeOsOverview(snapshot, calendar, options): LifeOsOverview` and `selectHomeLifeOsPulse(overview, limit?): LifeOsPulseFact[]`.

- [ ] **Step 1: Write failing behavior tests**

Create fixed fixtures for 2026-09-13 in `Europe/Rome` and assert:

```ts
const overview = buildLifeOsOverview(snapshot, calendar, {
  now: new Date('2026-09-13T10:00:00+02:00'),
  timeZone: 'Europe/Rome',
})

expect(overview.today.map(item => item.title)).toContain('Italiano')
expect(overview.tomorrow.map(item => item.title)).toContain('Esercizi 42-48')
expect(overview.school.openHomeworkCount).toBe(2)
expect(overview.school.nearestAssessments[0].title).toBe('Verifica di fisica')
expect(overview.anomalies.map(issue => issue.code)).toContain('overdue')
expect(overview.nextSevenDays).toHaveLength(7)
```

Add separate tests for tied nearest assessments, tied busiest days, unknown status not becoming overdue, Calendar time winning on a title/date match, overlapping Calendar events, non-school domain suppression, and the four-fact Home cap.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/life-os/interpret.test.ts`

Expected: FAIL because the interpreter is missing.

- [ ] **Step 3: Implement minimal bucketing and aggregation**

Implement:

```ts
export interface BuildLifeOsOverviewOptions { now: Date; timeZone: string }

export function buildLifeOsOverview(
  snapshot: LifeOsSnapshot,
  calendar: CalendarData,
  options: BuildLifeOsOverviewOptions,
): LifeOsOverview

export function selectHomeLifeOsPulse(
  overview: LifeOsOverview,
  limit = 4,
): LifeOsPulseFact[]
```

Use the scoring formula from the spec: homework/obligation `1`, assessment `2`, and school Calendar event `1`. Keep every `OperationalItem.sourceId`, `sourceUrl`, and `source` intact. Link duplicate-looking records for presentation only; preserve both source references and create a conflict issue when times disagree.

- [ ] **Step 4: Verify GREEN and refactor only after passing**

Run: `npm test -- lib/life-os/interpret.test.ts`

Expected: all interpretation tests pass.

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/life-os/interpret.ts lib/life-os/interpret.test.ts
git commit -m "feat: derive operational Life OS insights"
```

### Task 4: Fresh source composition and route service

**Files:**
- Modify: `lib/calendar/google.ts`
- Create: `lib/life-os/service.ts`
- Test: `lib/life-os/service.test.ts`
- Modify: `app/api/sync/[source]/route.ts`

**Interfaces:**
- Consumes: `fetchLifeOsData()`, `fetchCalendarData()`, and `buildLifeOsOverview()`.
- Produces: `fetchLifeOsOverview(options?): Promise<LifeOsOverview>` and explicit Calendar availability.

- [ ] **Step 1: Write failing service isolation tests**

Inject source fetchers and assert that a rejected Notion fetch still returns Calendar operational items with a Notion `unavailable` status, while a rejected Calendar fetch still returns Notion homework with a Calendar `unavailable` status.

```ts
const overview = await fetchLifeOsOverview({
  fetchNotion: async () => { throw new Error('denied') },
  fetchCalendar: async () => calendarFixture,
  now: new Date('2026-09-13T10:00:00+02:00'),
  timeZone: 'Europe/Rome',
})
expect(overview.today.some(item => item.source === 'calendar')).toBe(true)
expect(overview.sources).toContainEqual(expect.objectContaining({ source: 'notion', state: 'unavailable' }))
```

- [ ] **Step 2: Verify service test RED**

Run: `npm test -- lib/life-os/service.test.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement failure-isolated composition**

Use `Promise.allSettled`. Convert rejected results into explicit source statuses, not empty-success states. Pass `WEATHER_TIMEZONE || 'Europe/Rome'` to the interpreter.

Change Calendar fetching to `{ cache: 'no-store' }`. Add `availability: 'available' | 'unavailable'` and optional `error` to `CalendarData`. Fix its future filter to include tomorrow through local day `+7`, not `+8`.

- [ ] **Step 4: Keep the sync API source-level and verify GREEN**

`GET /api/sync/life-os` continues to return the raw normalized Notion snapshot for diagnostics. No operational interpretation is hidden inside the API route.

Run: `npm test -- lib/life-os/service.test.ts lib/life-os/interpret.test.ts`

Expected: all tests pass.

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/google.ts lib/life-os/service.ts lib/life-os/service.test.ts app/api/sync/[source]/route.ts
git commit -m "feat: compose fresh Life OS sources"
```

### Task 5: Dedicated operational Life OS page

**Files:**
- Create: `components/life-os/LifeOsDashboard.tsx`
- Create: `components/life-os/TodayNow.tsx`
- Create: `components/life-os/NextSevenDays.tsx`
- Create: `components/life-os/SchoolOverview.tsx`
- Create: `components/life-os/OtherLifeAreas.tsx`
- Create: `components/life-os/SystemStatus.tsx`
- Test: `components/life-os/LifeOsDashboard.test.tsx`
- Replace: `app/life-os/page.tsx`

**Interfaces:**
- Consumes: `LifeOsOverview` and `fetchLifeOsOverview()`.
- Produces: `<LifeOsDashboard overview={overview} />` and the live `/life-os` route.

- [ ] **Step 1: Write failing server-render tests**

Use `renderToStaticMarkup` with complete fixtures. Assert the populated result contains “Oggi”, “Prossimi 7 giorni”, “Verifica scritta”, “Carico scolastico”, and the Notion source link. Assert an empty available fixture contains “Nessun lavoro scolastico aperto” and does not contain “Altre aree”. Assert unavailable Notion plus available Calendar still renders Calendar content.

- [ ] **Step 2: Verify component test RED**

Run: `npm test -- components/life-os/LifeOsDashboard.test.tsx`

Expected: FAIL because the components are absent.

- [ ] **Step 3: Implement the dedicated components**

Build the approved hierarchy with semantic elements:

```tsx
<LifeOsDashboard>
  <TodayNow />
  <SchoolOverview />
  <NextSevenDays />
  <OtherLifeAreas />
  <SystemStatus />
</LifeOsDashboard>
```

Use a blue left rail for chronological items, plain grouped rows for future days, tabular counts and proportional workload bars, subdued amber for anomalies, and a secondary `<details>` source section. Every source-backed Notion item with a URL gets an accessible “Apri in Notion” link. Hide absent Other Life Areas.

- [ ] **Step 4: Replace the route composition**

Call `fetchLifeOsOverview()` in a `try/catch`. A fatal unexpected error renders a concise availability state plus the canonical Notion link; normal per-source failures are rendered from `overview.sources`.

- [ ] **Step 5: Verify GREEN, typecheck, and build**

Run: `npm test -- components/life-os/LifeOsDashboard.test.tsx`

Expected: all component tests pass.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run build`

Expected: production build exits 0.

- [ ] **Step 6: Commit**

```bash
git add components/life-os app/life-os/page.tsx
git commit -m "feat: build operational Life OS page"
```

### Task 6: Home pulse and daily synthesis integration

**Files:**
- Create: `components/home/LifeOsPulse.tsx`
- Test: `components/home/LifeOsPulse.test.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/orchestrator/daily-sync.ts`
- Modify: `lib/groq/synthesis.ts`
- Test: `lib/groq/synthesis.test.ts`

**Interfaces:**
- Consumes: `LifeOsOverview`, `selectHomeLifeOsPulse()`, raw Notion snapshot, and Calendar data.
- Produces: `AllSourceData.lifeOs`, `OrchestratorResult.sourceData.lifeOs`, and `<LifeOsPulse overview={overview} />`.

- [ ] **Step 1: Write failing pulse rendering tests**

Assert at most four operational facts render, the full-page link targets `/life-os`, available empty data says “Nessun lavoro scolastico aperto”, and an unavailable Notion source says “Dati Life OS non disponibili” without claiming there is no work.

- [ ] **Step 2: Write failing synthesis hash tests**

Create two `AllSourceData` fixtures. Changing a Life OS due date must change `computeInputHash`; changing only `generatedAt` or source check timestamps must not change it.

```ts
expect(computeInputHash(withDue('2026-09-15')))
  .not.toBe(computeInputHash(withDue('2026-09-16')))
expect(computeInputHash(withGeneratedAt('08:00')))
  .toBe(computeInputHash(withGeneratedAt('09:00')))
```

- [ ] **Step 3: Verify both suites RED**

Run: `npm test -- components/home/LifeOsPulse.test.tsx lib/groq/synthesis.test.ts`

Expected: FAIL because the component and Life OS hash input are missing.

- [ ] **Step 4: Integrate Life OS into orchestration**

Fetch the raw Notion snapshot in the existing `Promise.allSettled` source batch. Derive `LifeOsOverview` from that snapshot and the already-fetched Calendar data. Add it to `AllSourceData` and the orchestrator result.

Hash only stable fields: item IDs, titles, types, dates, statuses, subjects, relevant Calendar references, and issue codes. Exclude `generatedAt`, `checkedAt`, and error wording. Add bounded prompt facts: today's Life OS facts, the nearest assessment, and at most five upcoming school items.

- [ ] **Step 5: Implement and place the pulse**

Render `<LifeOsPulse>` after `<TimelineSection>` and before AI priorities. The component calls the pure selector and links to `/life-os`; it performs no source fetching.

- [ ] **Step 6: Verify GREEN and all automated checks**

Run: `npm test -- components/home/LifeOsPulse.test.tsx lib/groq/synthesis.test.ts`

Expected: all focused tests pass.

Run: `npm test`

Expected: all repository tests pass with zero failures.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run build`

Expected: production build exits 0.

- [ ] **Step 7: Commit**

```bash
git add components/home/LifeOsPulse.tsx components/home/LifeOsPulse.test.tsx app/page.tsx lib/orchestrator/daily-sync.ts lib/groq/synthesis.ts lib/groq/synthesis.test.ts
git commit -m "feat: add Life OS pulse to Home"
```

### Task 7: Live-source and browser acceptance

**Files:**
- Modify only if acceptance exposes a defect: the smallest affected file and its focused regression test.

**Interfaces:**
- Consumes: completed `/life-os`, Home, `/api/sync/life-os`, and the configured Notion/Calendar sources.
- Produces: verified desktop/mobile behavior and an explicit record of any external limitation.

- [ ] **Step 1: Run the complete verification suite fresh**

Run: `npm test`

Expected: zero failing tests.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0 with `/` and `/life-os` built successfully.

- [ ] **Step 2: Start the local dashboard and authenticate**

Run: `npm run dev`

Use the configured dashboard login through the browser. Do not print secrets or `.env.local` values.

- [ ] **Step 3: Verify live Notion ingestion**

Open `/api/sync/life-os` in the authenticated browser and confirm the response identifies the root page, accessible database sources, normalized rows, and source statuses. If linked databases are not discoverable, add their real IDs to the documented environment overrides and restart the server.

Do not create or modify a Notion record without explicit authorization. If an existing record can be safely edited by the user, reload and verify its changed title/date/status appears in both the API response and UI. Otherwise report mutation propagation as the only unverified acceptance item.

- [ ] **Step 4: Verify the product as a user**

At desktop and mobile widths, verify:

- Home shows no more than four Life OS facts and links to `/life-os`;
- `/life-os` combines Calendar and Notion items in the relevant day groups;
- Today, tomorrow, overdue, nearest assessment, and workload summaries match visible source data;
- empty and unavailable states are distinguishable;
- Other Life Areas do not appear without real data;
- System / Sources is secondary;
- source links open the correct Notion records;
- keyboard focus is visible, text does not overflow, and mobile bottom navigation does not cover content.

- [ ] **Step 5: Fix one acceptance defect at a time**

For each defect, write the smallest failing regression test, run it to verify RED, implement the minimal fix, and rerun the focused test to GREEN before checking the browser again.

- [ ] **Step 6: Final diff and verification review**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only intentional Life OS changes plus the untouched untracked `ONBOARDING.md`.

Run the full test, typecheck, and build commands once more after the final browser change. Report exact pass counts and name any live-source behavior that could not be verified.
