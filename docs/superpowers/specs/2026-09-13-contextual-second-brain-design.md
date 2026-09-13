# Contextual Second Brain Design

**Date:** 2026-09-13

**Status:** Approved design direction

**Scope:** Replace the Knowledge Graph recency feed with a grounded contextual recommendation system shared by Home and `/second-brain`. Bring live Life OS and Newsletter Notion state into the daily context where required.

## Product question

The system answers: **Given what is actually happening in Simone's life today, which parts of his existing Knowledge Graph are genuinely useful to bring back into awareness now?**

It does not browse Notion, fill a discovery quota, or substitute generic model knowledge for absent Knowledge Graph content.

## Current state

- Google Calendar is the only live operational day source.
- `fetchLifeOsData()` returns hardcoded prose.
- Newsletter UI is static although the Newsletter root page ID is configured.
- `fetchSecondBrainData()` queries Knowledge Graph metadata, sorts by `Last updated`, keeps a 14-day slice, and never reads page blocks.
- Home and `/second-brain` render the recency result separately.
- Persistence contains daily synthesis data but no Knowledge Graph content cache or recommendation history.
- Day boundaries use UTC rather than the configured Europe/Rome day.

The live Life OS work follows the normalized, schema-tolerant design in `docs/superpowers/specs/2026-09-13-life-os-operational-dashboard-design.md`; this feature consumes the normalized result rather than inventing a second Life OS model.

## Architecture

```text
Google Calendar ----\
Life OS Notion ------> normalized DailyContext facts
Newsletter Notion --/             |
                                  v
Knowledge Graph metadata -> content cache/refresher -> broad candidate set
                                                        |
                                                        v
                                     semantic scoring + graph expansion
                                                        |
                                                        v
                                quality + history + diversity + threshold
                                                        |
                           +----------------------------+------------------+
                           v                                               v
                  Relevant today                                    Rediscover
                           |
                    Home takes top 1-2
```

Network adapters, pure normalization/ranking, persistence, and rendering remain separate. Notion and Calendar remain authoritative; stored application records are derived cache and history only.

## Source adapters and daily context

### Calendar

The existing iCal adapter remains canonical for scheduled events. Its date calculations move to `WEATHER_TIMEZONE`, falling back to `Europe/Rome`. A short fetch cache is acceptable, but no cache entry can cross the local-day boundary.

### Life OS

The implementation completes the previously approved schema-tolerant adapter:

1. retrieve the configured Life OS root page;
2. recursively discover accessible child databases;
3. include optional configured database IDs;
4. query and normalize schedule, homework, written/oral assessments, deadlines, subjects, and other dated operational records;
5. preserve source IDs, URLs, dates, status, and source diagnostics;
6. omit fields that cannot be supported by source data.

### Newsletter

The Newsletter adapter retrieves the configured root page content, recursively discovers accessible child databases, and normalizes dated or status-bearing project records. It contributes context only when records or page content describe current work, an upcoming date, or an explicit active state. Static mission copy does not create a daily signal by itself.

### Daily context

`buildDailyContext()` is a pure function. It accepts normalized source snapshots and returns facts with stable evidence IDs:

```ts
interface DailyContextFact {
  id: string
  source: 'calendar' | 'life-os' | 'newsletter'
  kind: string
  title: string
  detail: string | null
  occursAt: string | null
  urgency: 'today' | 'soon' | 'overdue' | 'background'
  sourceUrl: string | null
  tokens: string[]
}

interface DailyContext {
  localDate: string
  timeZone: string
  facts: DailyContextFact[]
  workload: {
    todayCount: number
    nextThreeDaysCount: number
    assessmentCount: number
    concentration: 'low' | 'medium' | 'high'
  }
  sourceStatuses: SourceStatus[]
  contextHash: string
}
```

Workload is derived from real dated facts. Empty sources add no facts. Source failure and source emptiness remain distinct.

## Knowledge Graph ingestion

The adapter queries all accessible Knowledge Graph rows and normalizes:

- Concept and Category;
- Related concepts;
- Source material, including relation, URL, text, or select representations;
- Truth-Checked, including checkbox, select, or status representations;
- Notion URL and `last_edited_time`;
- recursive page block content.

Text extraction supports headings, paragraphs, lists, quotes, callouts, toggles, code, captions, and nested children. Unsupported blocks produce diagnostics rather than invented text.

`knowledge_content_cache` stores normalized content keyed by page ID and Notion edit revision. Unchanged pages use cached content. Missing or changed pages are fetched from Notion with bounded concurrency. If a changed page cannot be refreshed, it is excluded from content-grounded recommendations rather than represented by stale content.

## Candidate retrieval and ranking

The implementation deliberately avoids a vector database. The existing Groq integration supplies semantic judgment while TypeScript owns source normalization, deterministic signals, validation, history, diversity, and thresholds.

### Candidate stages

1. Query the complete accessible Knowledge Graph metadata set.
2. Ensure a usable content excerpt exists for nodes under consideration.
3. Run a broad batched semantic scan over title, category, content excerpt, current context, and quality metadata.
4. Retain the strongest preliminary candidates and expand their Related concepts one hop.
5. Retrieve full cached/refreshed content for the expanded set.
6. Produce evidence-bound semantic and situational scores.
7. Combine deterministic, semantic, graph, quality, recency, and repetition signals.
8. Apply minimum quality/relevance thresholds and maximal-marginal-relevance-style diversity.
9. Select zero to five `Relevant today` items and a smaller curated `Rediscover` set.

### Score dimensions

- direct contextual relevance;
- situational usefulness given workload and day structure;
- semantic relevance from actual page content;
- one-hop graph relevance;
- Source material and Truth-Checked support;
- a small recency tie-breaker;
- a negative history signal based on distinct recently surfaced days.

The scoring weights and threshold are versioned constants. Relevance may overcome a history penalty; history must not ban a genuinely useful repeat.

`Rediscover` excludes `Relevant today` results and favors substantive, high-quality, long-unseen nodes that form a useful graph or thematic connection. It is deterministic and never random.

## Grounding contract

Groq returns structured recommendation assessments containing context fact IDs and Knowledge Graph evidence text/IDs. The server validates that:

- every `Why today` fact ID exists in the current context;
- every `Key idea` evidence ID belongs to the candidate's stored page content;
- the candidate contains substantive content;
- scores are finite and within the accepted range;
- unsupported candidates and hallucinated references are discarded.

The final `Why today` may be model-written only from validated current facts. `Key idea` may be a concise paraphrase only of validated Knowledge Graph content. If semantic scoring fails, the fallback returns only candidates with deterministic direct evidence and may return zero.

## Persistence and freshness

SQLite and Supabase receive equivalent derived tables:

- `knowledge_content_cache` for Notion content revisions;
- `second_brain_runs` for one recommendation result per date/context/KG/ranking-version hash;
- `second_brain_history` for one row per recommended page and local day.

A page view that reuses a run does not add another history event. A cache key includes the local date, context hash, Knowledge Graph revision hash, and ranking version. Meaningful Calendar, Life OS, Newsletter, or Knowledge Graph changes therefore invalidate the recommendation result.

## Integration and presentation

`loadDailyContext()` is shared by the daily orchestrator and the Second Brain service. The orchestrator returns the contextual recommendation result as source data and incorporates its hash into the existing synthesis cache key.

Home renders only `relevantToday.slice(0, 2)`. `/second-brain` renders the same result's full `relevantToday` collection and its curated `rediscover` collection.

Each recommendation contains:

- concept/page name;
- category;
- `Why today`;
- content-grounded `Key idea`;
- original Notion URL;
- optional related concept, Source material, and Truth-Checked context.

Sections do not force a minimum count. Zero is valid.

## Failure behavior

- One failed daily-context source does not suppress facts from successful sources.
- Notion access/schema failures appear as concise source diagnostics.
- A page without substantive content is ineligible for recommendation.
- A failed semantic call activates the conservative evidence-only fallback.
- Invalid model JSON or evidence references are rejected.
- A stale cache from another local date is never presented as current.

## Testing and acceptance

Vitest is added and implementation follows red-green-refactor. Pure fixtures verify all ranking and context behavior without making network calls. Adapter tests use complete Notion response shapes at the external boundary.

Automated acceptance coverage includes:

1. Calendar/Life OS context changes alter recommendations.
2. Old, strongly relevant content beats recent irrelevant content.
3. Page content affects ranking independently of title.
4. Related concepts affect discovery and scoring.
5. Normalized homework, assessments, and schedule facts affect context.
6. `Why today` accepts only real context evidence.
7. `Key idea` accepts only Knowledge Graph content evidence.
8. Weak candidates are omitted.
9. Recent recommendation history applies a recoverable penalty.
10. Home is a one-to-two-item slice of the same result used by `/second-brain`.

Completion also requires typecheck, production build, authenticated desktop/mobile browser verification, live read-only source inspection, and a demonstrated real-source refresh. A mutation of user-owned Notion data requires an existing user-made change or separate explicit authorization for a reversible test record.

## Non-goals

- Editing Notion or Calendar from the dashboard.
- Copying canonical Notion data into a new permanent source of truth.
- Introducing a vector database before scale requires it.
- Reproducing Notion database browsers in the dashboard.
- Generating generic advice when stored knowledge is absent.
- Redesigning unrelated dashboard sections.
