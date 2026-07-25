# Nemos Memory

[中文](README.md)

**A local-first, evidence-backed long-term memory engine that understands how facts change.**

Nemos Memory is built for AI assistants, agents, companion applications, and personal knowledge tools. Instead of merely storing chat fragments, it organizes source events, derived memories, current facts, historical versions, temporal relationships, and provenance into a maintainable memory system.

It ships as an embedded TypeScript SDK backed by local SQLite. Applications can integrate it without deploying a separate vector database or memory server.

> Current version: `0.7.4-alpha.1`. Core ingestion, fact evolution, recall, correction, invalidation, isolation, and export flows are available. APIs may still change before the stable release.

## Why Nemos Memory

Vector similarity can find related text, but long-term memory must answer harder questions:

- Where does the user live now, rather than where they used to live?
- Which source statement supports a conclusion?
- Should conflicting statements supersede each other, coexist as history, or await resolution?
- Can jokes, quotations, role-play, and third-party claims be kept out of personal facts?
- Are users and contexts genuinely isolated?
- What happens to dependent memories after a correction or deletion?

Nemos Memory separates what happened from what the system currently believes. Recall results retain provenance, time, and selection reasons.

## Core capabilities

| Capability | How Nemos Memory handles it |
|---|---|
| Five memory layers | Archival evidence, episodes, general knowledge, personal facts, and procedures |
| Evidence-belief separation | Immutable source events with traceable derived memories |
| Fact evolution | Stable `claim_key`, valid time, and event order preserve current and historical values |
| Conflict and correction | Confirmation, supersession, dispute, correction, invalidation, and reversible identity merge/split |
| Controlled recall | Structured facts, full text, vectors, entities, time, and bounded evidence fallback |
| Long-term retention | Persisted salience, evidence count, and coverage suppress stale trivia |
| Isolation and sensitivity | Tenant, user, scope, and sensitivity constraints on every read and write |
| Local deployment | SQLite by default, optional vectors, and no required resident service |
| Explainability | Provenance, recall reasons, and traces for candidate, filter, and ranking inspection |
| Data control | Correction, invalidation, deletion, and JSON-LD / Markdown export |

## How it works

```text
User input
   ↓
Immutable source archive
   ↓
Extract → normalize → reconcile facts → link provenance
   ↓
Five memory layers + fact versions + time and provenance
   ↓
Query planning → multi-channel recall → boundary filters → ranking and explanation
```

A new fact value does not erase the old record. Nemos Memory retains history and returns only the active value by default. An older event that finishes asynchronous extraction late cannot overwrite a newer fact.

## Comparison with other open-source projects

The projects have different goals. Nemos Memory is an embedded, local-first memory kernel; [Mem0](https://github.com/mem0ai/mem0) emphasizes broad integrations and a service ecosystem; [LangMem](https://github.com/langchain-ai/langmem) targets LangGraph agents; and [Graphiti](https://github.com/getzep/graphiti) models changing relationships as a temporal knowledge graph.

### July 25, 2026 head-to-head run

This run started from a new Chinese `core-v2` suite with 24 scenarios, 37 events, and 41 queries. All four products received the same inputs, event times, queries, and Top-5 limit in one run, using `gpt-5.6-terra` and `text-embedding-3-small`. Frozen answer aliases provided deterministic scoring; no LLM judge was used.

| Product | Version | Recall@5 | MRR | Top-1 | Top-1 safety | Strict no-pollution | Provenance visible | Fact time visible | Mean ingest | Mean query |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Nemos Memory** | **0.7.4-alpha.1** | 87.8% | 0.841 | 80.5% | 85.7% | **92.9%** | **87.8%** | **87.8%** | 5472 ms | **461 ms** |
| Mem0 OSS | 2.0.14 | **97.6%** | 0.951 | 92.7% | **100.0%** | 85.7% | 0.0% | 0.0% | **4067 ms** | 680 ms |
| LangMem | 0.0.30 | **97.6%** | **0.976** | **97.6%** | **100.0%** | **92.9%** | 0.0% | 0.0% | 4292 ms | 533 ms |
| Graphiti OSS | 0.29.2 | 73.2% | 0.689 | 65.9% | 90.5% | 78.6% | 73.2% | 73.2% | 13154 ms | 578 ms |

`Top-1 safety` checks whether the first result is a known incorrect fact. `Strict no-pollution` requires the complete Top-5 to exclude stale values, role-play, and third-party contamination. A 0% provenance or fact-time score only means those fields were not exposed by the product's native search result through the adapter used in this run; it does not prove that the product has no related internal capability.

### Current assessment

Nemos' demonstrated strengths are query latency, embedded local operation, pollution control, and visible provenance and fact time on successful results. It passed every constraint, attribution-safety, negation, user-isolation, plan-change, multilingual, routine, and procedure query, with no runtime errors.

The gaps are equally clear: Nemos still trails Mem0 and LangMem on Recall@5 and Top-1. Its five misses came from four root causes: explicit-year queries did not automatically enable historical recall; office location was normalized as residence; dense text extraction omitted passport and emergency-contact facts; and relative dates were not anchored to the source event time. One long-gap fact update was found in Top-5, but the stale camera still ranked first.

This is not a universal leaderboard. The suite is still limited and does not yet cover deletion propagation, very-long-term decay, concurrent writes, or API cost. Nemos used single-pass extraction with double checking and automatic linking disabled, so it did not gain an advantage from extra model calls.

## Install

Node.js 20 or later is required. The current release is integrated from source:

```powershell
git clone https://github.com/mmlong818/nemos-memory.git
cd nemos-memory\sdk\typescript
npm install
npm run build
```

Install the local package into another TypeScript project:

```powershell
npm install <repository-path>\sdk\typescript
```

## Quick start

```typescript
import { Nemos } from "@nemos/sdk";

const nemos = new Nemos({
  storage: { type: "sqlite", path: "./nemos.db" },
  llm: {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
  },
  embedding: {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
  },
});

const memory = nemos.forUser("user-001");

await memory.ingest("I recently moved to Fuzhou and started cycling to work.", {
  scenario: "chat",
  contentDate: "2026-07-25",
});

const packet = await memory.recall("Where do I currently live?");
for (const item of packet.items) {
  console.log(item.memory.content, item.reasons);
}

await nemos.close();
```

Anthropic, OpenAI, Zhipu, and custom LLM providers are supported. Embeddings are optional; structured, full-text, and temporal retrieval remain available without them.

## Main APIs

| API | Purpose |
|---|---|
| `ingest(content, options)` | Archive source content and extract derived memories |
| `recall(query, options)` | Return a memory packet with provenance and selection reasons |
| `getRelevantContext(query)` | Build prompt-ready memory context |
| `write(input)` | Write an explicit structured memory |
| `correct(memoryId, correction)` | Correct a fact and propagate the change |
| `invalidate(memoryId, reason)` | Explicitly invalidate a memory |
| `resolveDispute(claimKey, winnerId)` | Resolve conflicting facts |
| `forget(memoryId)` | Remove deletable memory and related indexes |
| `export(format)` | Export JSON-LD or Markdown |
| `explainRecall(traceId)` | Inspect recall channels, filtering, and ranking |

## Documentation and development

- [Architecture](docs/architecture.md): data flow, memory layers, fact evolution, recall, and storage.
- [TypeScript SDK](sdk/typescript/README.en.md): setup, ingestion, recall, and data operation examples.

Run the complete check from `sdk/typescript`:

```powershell
npm run check
```

## License

[PolyForm Noncommercial 1.0.0](LICENSE). Non-commercial use, modification, and distribution are allowed; commercial use requires a separate license.