# Life OS Operational Dashboard Design

**Date:** 2026-09-13

**Status:** Approved design direction; implementation pending

**Scope:** Replace the static Life OS rules view with a live operational interpretation of the Notion "Life OS Managing" page, Google Calendar, and future source-backed Life OS domains. Add a compact Life OS pulse to Home.

## Purpose

The Life OS area answers one question: **What is happening in my managed life now, and what should I be aware of?**

It is not a database browser and does not reproduce the Notion page. It converts source records into a concise, traceable operational view. Configuration, source contracts, and system rules remain secondary.

## Current State

- `lib/notion/life-os.ts` returns hardcoded boundaries and rules; it does not call Notion.
- `app/life-os/page.tsx` renders those rules as the page's primary content.
- Google Calendar already supplies today's events and the following seven days from the configured private iCal feed.
- `runDailyOrchestrator()` combines Calendar, Second Brain, and weather, but does not fetch Life OS.
- Home has no Life OS pulse.
- Both `/` and `/life-os` are dynamic server-rendered routes.
- The repository has TypeScript checking but no automated test runner.

## Design Decisions

### 1. Use deterministic interpretation for operational facts

Dates, counts, overdue state, nearest assessment, workload concentration, conflicts, and anomalies will be computed in TypeScript. They will not depend on an LLM. Every displayed item and derived statement must retain source identifiers and URLs so it can be traced back to Notion or Calendar.

The existing Groq synthesis may consume a small Life OS summary for the Home narrative, but the Life OS page and Home pulse will remain usable and factual without AI output.

### 2. Use a schema-tolerant Notion adapter

The existing `NOTION_PAGES.lifeOsManaging` page remains the root source. The adapter will:

1. retrieve the root page;
2. recursively inspect its child blocks for accessible child databases;
3. include optional database IDs supplied through environment variables;
4. retrieve each accessible database's metadata and rows;
5. normalize useful records through property-type inspection and documented aliases;
6. ignore unsupported records while reporting concise source diagnostics.

This lets the dashboard adapt as the page is populated without inventing a new mandatory Notion schema. Explicit database IDs remain available as a reliable fallback when databases are linked rather than nested or are otherwise undiscoverable through page blocks.

Property names are matched case-insensitively and without accents. The initial alias groups are:

- title: `name`, `nome`, `title`, `titolo`, or the database's title property;
- item type: `type`, `tipo`, `category`, `categoria`;
- domain: `area`, `domain`, `ambito`;
- subject: `subject`, `materia`, `discipline`;
- date/start: `date`, `data`, `start`, `inizio`, `quando`;
- due date: `due`, `deadline`, `scadenza`, `consegna`;
- end: `end`, `fine`;
- status: `status`, `stato`;
- completion: `done`, `completed`, `completato`, `fatto`;
- priority: `priority`, `priorita`, `priorità`;
- weekday: `day`, `giorno`, `weekday`;
- grade: `grade`, `voto`.

Property types take precedence over names. A title property supplies the title even when its name is unfamiliar. A checkbox can mark completion only when its property name belongs to the completion alias group. Relations are resolved to related page titles when the integration can access them; an inaccessible relation remains an anomaly rather than a guessed subject.

Optional environment variables will accept comma-separated database IDs by role:

- `NOTION_LIFE_OS_DATABASE_IDS` for general discovery fallback;
- `NOTION_LIFE_OS_SCHOOL_DATABASE_IDS` for school work, assessments, subjects, or schedule data;
- `NOTION_LIFE_OS_LOG_DATABASE_IDS` for source and synchronization information.

Discovered and configured IDs are de-duplicated before querying.

### 3. Normalize sources before rendering

The Notion adapter returns source-level data rather than view-specific JSX shapes.

```ts
type LifeOsItemType =
  | 'homework'
  | 'written-assessment'
  | 'oral-assessment'
  | 'school-event'
  | 'obligation'
  | 'other'

interface LifeOsItem {
  id: string
  title: string
  type: LifeOsItemType
  domain: string | null
  subject: string | null
  start: string | null
  due: string | null
  end: string | null
  status: 'open' | 'done' | 'unknown'
  priority: string | null
  grade: number | null
  sourceUrl: string
  sourceDatabaseId: string
  lastEditedAt: string
  issues: LifeOsIssue[]
}

interface SchoolScheduleEntry {
  id: string
  weekday: number
  subject: string
  startTime: string | null
  endTime: string | null
  sourceUrl: string
}

interface LifeOsSourceStatus {
  source: string
  state: 'available' | 'empty' | 'partial' | 'unavailable'
  checkedAt: string
  message?: string
}
```

Unrecognized types normalize to `other`. They are shown only when they have an actionable date or belong to a real non-school domain. Missing dates, subjects, or statuses are never inferred.

### 4. Keep Calendar canonical for scheduled commitments

Notion describes school work, assessments, schedules, and managed-life records. Google Calendar supplies actual commitments and timed events.

The interpretation service accepts normalized Notion data, Calendar data, the current time, and the configured time zone. It returns one `LifeOsOverview` consumed by both views:

```ts
interface LifeOsOverview {
  today: OperationalItem[]
  tomorrow: OperationalItem[]
  nextSevenDays: OperationalDay[]
  school: SchoolOverview
  otherAreas: LifeAreaOverview[]
  anomalies: LifeOsIssue[]
  sources: LifeOsSourceStatus[]
  pageUrl: string
  generatedAt: string
}
```

Calendar and Notion rows are not silently merged. Exact or near-exact title-and-date matches may be linked for display, but Calendar time and location win for scheduling. Conflicting dates or times remain separate and create a lightweight inconsistency note.

### 5. Define operational calculations explicitly

- **Due today/tomorrow:** open items whose due date falls on that local calendar day.
- **Overdue:** open items with a due date earlier than today. Items with unknown completion state are not labeled overdue; they receive a missing-status issue.
- **Upcoming assessment:** a written or oral assessment dated from today through the end of the next seven local days.
- **Nearest assessment:** the earliest upcoming assessment; equal dates preserve source order and display all tied items.
- **Open homework count:** homework with status `open`, regardless of whether it has a date.
- **Workload by day:** one point per open homework or obligation due that day, two points per assessment, and one point per school Calendar event. The interface shows counts alongside the relative bar so the score is not mistaken for time duration.
- **Highest workload day:** only reported when at least two dated items exist in the seven-day window. Ties are described as shared rather than broken arbitrarily.
- **Conflict:** overlapping timed Calendar events, or a Notion item and Calendar event with matching normalized title/date but materially different time data.
- **Missing metadata:** assessments without a subject, dated school items without a recognizable type, or actionable items without a status.
- **Stale information:** only reported when a source explicitly provides a synchronization timestamp or freshness marker. Record edit age alone does not prove staleness.

Dates are calculated in `WEATHER_TIMEZONE`, falling back to `Europe/Rome`. Date-only values remain local dates and are never shifted through UTC conversion.

## Data Flow

```text
Life OS Notion root
  -> discover databases + read rows
  -> normalize items, schedule entries, source status
                                          \
Google Calendar iCal -> normalize events ---> buildLifeOsOverview(now, zone)
                                          /
optional future adapters -----------------
                  |
                  +-> /life-os full operational view
                  +-> Home Life OS pulse
                  +-> compact facts for cached daily synthesis
```

`buildLifeOsOverview` is a pure function. Network access, parsing, normalization, interpretation, and presentation stay in separate modules so each can be tested independently.

## Page Design

### Dedicated Life OS page

The page uses a left-aligned, single-reading-flow layout with a wider desktop canvas than the current static rules page. It avoids turning every statistic into an identical card.

```text
┌─────────────────────────────────────────────────────────────┐
│ Life OS                         updated 08:42   Open Notion │
│ What matters today                                      │
├───────────────────────────────┬─────────────────────────────┤
│ Today / Now                   │ School pulse                │
│ chronological blue day rail  │ 4 open · 2 assessments     │
│ with school + commitments     │ workload strip             │
├───────────────────────────────┴─────────────────────────────┤
│ Next 7 days: grouped operational timeline                  │
├─────────────────────────────────────────────────────────────┤
│ Other Life Areas, only when backed by real source records  │
├─────────────────────────────────────────────────────────────┤
│ System / Sources (quiet, secondary, collapsible details)   │
└─────────────────────────────────────────────────────────────┘
```

The memorable element is the blue day/workload rail, derived from school-planner structure. The surrounding page stays visually quiet.

Sections behave as follows:

- **Today / Now:** today's timetable entries, due work, approaching assessments, and relevant Calendar commitments. Overdue items appear first but use restrained amber styling.
- **Next 7 days:** grouped by local date, ordered chronologically within each day, with distinct icons and plain-language labels for homework, written tests, oral tests, school events, and other obligations.
- **School overview:** available counts, nearest assessment, subjects involved, and a seven-day workload strip. Metrics with no backing data are omitted.
- **Other Life Areas:** one compact group per real non-school domain with actionable records. The entire section is hidden when no such records exist.
- **System / Sources:** freshness, partial failures, data issues, configured-but-unavailable sources, and the Notion link. It stays after operational content and does not restate operating rules.

### Home pulse

The pulse sits after today's Calendar timeline and before AI priorities. It contains at most four facts:

1. today's school subjects or the next school activity;
2. work due today or tomorrow;
3. the nearest assessment;
4. one overdue item or useful data issue.

It links to `/life-os` for the full view. If no operational facts exist but the Notion source is available, it shows one concise empty state. If the source is unavailable, it shows a small source-status message instead of implying that there is no work.

## Visual System

The implementation preserves the application's existing visual language and avoids a page-level redesign.

- canvas: `#F7F5F2`;
- paper: `#FFFFFF`;
- ink: `#1A1816`;
- school/action rail: `#3B6FD4`;
- primary action: `#C9671A`;
- anomaly accent: `#B45309`.

Inter remains the interface typeface. Numeric counts use tabular figures in the same family rather than introducing decorative monospace labels. Headings use sentence case. Color never carries item type or severity without an icon or text label.

The first visual proposal used the existing warm-card pattern too heavily. This revision keeps the inherited palette for consistency but replaces repeated cards with a day rail, grouped rows, and a workload strip tied specifically to school operations.

## Empty, Partial, and Error States

- An empty database does not generate placeholder records.
- Empty section copy is specific and short, such as “Nessun lavoro scolastico aperto” or “Orario settimanale non ancora popolato.”
- Sections with no useful information are hidden when another visible section already explains the state.
- A failed Notion read does not suppress Calendar information.
- A failed Calendar read does not suppress Notion work and assessment data.
- Partial database access produces a source diagnostic naming the inaccessible source without exposing tokens or internal API payloads.
- Unknown fields and types are retained only in source diagnostics unless they have enough real data to be operationally useful.

## Freshness and Caching

Both Home and `/life-os` fetch source data during dynamic server rendering. Operational source reads use no persistent application cache. The Calendar adapter will stop using a five-minute Next fetch cache for these views so a reload checks the configured feed again.

The existing daily AI synthesis cache remains input-hash based. Its hash will include the compact Life OS facts supplied to the synthesis, so a meaningful Notion change invalidates the cached narrative. The interface displays `LifeOsOverview.generatedAt` and per-source check times; it never labels cached AI generation time as source freshness.

## Module Boundaries

Planned modules and responsibilities:

- `lib/notion/life-os.ts`: Notion discovery, page/database reads, property extraction, normalization, and source diagnostics.
- `lib/life-os/types.ts`: normalized Life OS and operational view types.
- `lib/life-os/interpret.ts`: pure date bucketing, summaries, anomaly detection, workload calculation, and Calendar correlation.
- `lib/life-os/service.ts`: fetch Notion and Calendar with failure isolation, then build the overview.
- `components/life-os/*`: dedicated-page operational sections.
- `components/home/LifeOsPulse.tsx`: compact Home rendering.
- `app/life-os/page.tsx`: dynamic route composition and fatal-boundary handling.
- `lib/orchestrator/daily-sync.ts` and `lib/groq/synthesis.ts`: include normalized Life OS facts in Home data and cache invalidation without moving operational truth into Groq.
- `.env.example`: document optional Life OS database ID overrides.

Existing common components and tokens will be reused only where they preserve hierarchy. No new persistence tables are required.

## Testing Strategy

Vitest will be added as the repository's unit-test runner. Implementation follows test-first development.

### Parser and normalization tests

- common Italian and English property aliases;
- missing, malformed, and unsupported properties;
- title-property fallback;
- status and checkbox completion handling;
- relation title resolution and inaccessible relations;
- child-database discovery and configured-ID de-duplication;
- date-only values remaining local dates.

### Interpretation tests

- today, tomorrow, next-seven-days, and overdue boundaries in `Europe/Rome`;
- nearest assessment and tied dates;
- workload score and tied busiest days;
- Calendar-canonical timing and conflict detection;
- empty, partial, and source-unavailable results;
- non-school areas appearing only when backed by records;
- Home pulse selection capped at four facts.

### Integration and UI verification

- typecheck and production build;
- focused server-render/component checks for empty and populated fixtures;
- authenticated browser verification of Home and `/life-os` at desktop and mobile widths;
- visible verification that editing or adding a real Notion record changes the appropriate dashboard sections after reload;
- visible verification that Calendar and Notion items appear in the same operational timeline;
- keyboard focus, readable contrast, reduced-motion behavior, and overflow checks.

Runtime verification will distinguish source-access failures from empty datasets. If the current integration cannot see a database, implementation will report the exact missing access condition instead of claiming end-to-end success.

## Acceptance Criteria

1. Real changes in accessible Life OS Notion databases produce meaningful dashboard changes after reload.
2. Today and next-seven-days views combine Notion and Google Calendar data while retaining Calendar authority for scheduled commitments.
3. Hardcoded operating rules no longer dominate `/life-os` or Home.
4. Empty and partial datasets render without invented content.
5. Derived statements are deterministic and traceable to source records.
6. Home shows a compact Life OS pulse and `/life-os` shows the deeper view.
7. Other Life Areas appear only for domains represented by real data.
8. Source freshness and failures are visible without dominating the page.
9. Automated tests, typecheck, build, and browser checks cover the implemented behavior.

## Non-Goals

- Editing Notion or Calendar records from the dashboard.
- Creating new Life OS domains or mandatory databases.
- Reproducing the Notion page layout.
- Making AI-generated text the source of operational truth.
- Adding grades before a readable grade source exists.
- Redesigning unrelated dashboard pages.
