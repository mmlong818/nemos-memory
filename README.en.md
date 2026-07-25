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

These projects do not solve exactly the same problem:

| Project | Primary focus | Best fit |
|---|---|---|
| **Nemos Memory** | Embedded, local-first memory kernel focused on fact versions, provenance, and controlled recall | Local data ownership, Chinese personal memory, and evolving facts |
| [Mem0](https://github.com/mem0ai/mem0) | General agent memory layer with broad SDK, integration, and hosted-service coverage | Mature integrations and cross-platform adoption |
| [LangMem](https://github.com/langchain-ai/langmem) | Agent memory management toolkit closely integrated with LangGraph storage | LangGraph applications using hot-path and background memory management |
| [Graphiti](https://github.com/getzep/graphiti) | Temporal context graph for changing relationships and historical queries | Relationship-heavy systems requiring graph traversal and custom ontologies |

### Current-version results

On July 25, 2026, the current build completed five consecutive runs of the Chinese `core-v1` suite. It contains 10 scenarios and 12 queries per run, scored with frozen answer aliases and no LLM judge.

| Product | Version and run | Recall@5 | MRR | Top-1 | Conflict safety | Provenance visible | Fact time visible | Mean query |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Nemos Memory** | **0.7.4-alpha.1 latest performance run** | **100.0%** | **1.000** | **100.0%** | **100.0%** | 91.7% | **100.0%** | **345 ms** |

Across the five stability runs, Recall@5, MRR, Top-1, conflict safety, and fact-time visibility remained at 100%. The optimized performance run reduced mean query time from the five-run baseline of 1019 ms to 345 ms, while exact structured-fact queries took roughly 2 to 6 ms. Provenance visibility varied from 75.0% to 91.7%, so its presentation still needs to be made more consistent.

### Historical head-to-head baseline

Before those fixes, four fixed product versions received the same inputs, order, language model, and embedding model in one shared black-box run. Every scenario started with empty storage and each query returned at most five results.

| Product | Version tested then | Recall@5 | MRR | Top-1 | Conflict safety | Provenance visible | Fact time visible | Mean query |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Nemos Memory | 0.7.4-alpha.1 pre-fix baseline | 91.7% | 0.917 | 91.7% | 91.7% | 75.0% | **100.0%** | 1246 ms |
| Mem0 OSS | 2.0.13 | **100.0%** | 0.958 | 91.7% | **100.0%** | 0.0% | 0.0% | 660 ms |
| LangMem | 0.0.30 | **100.0%** | **1.000** | **100.0%** | **100.0%** | 0.0% | 0.0% | **567 ms** |
| Graphiti OSS | 0.29.2 | 58.3% | 0.500 | 41.7% | 91.7% | 66.7% | 66.7% | 600 ms |

The historical table explains where the fixed problems were found. It does not represent the current Nemos Memory score and is not a general leaderboard. The fixed build has not yet been rerun head-to-head with the other products, and the suite contains only 12 queries. The current evidence shows stable basic recall and fact updates on this small regression suite, with temporal and provenance modeling as explicit strengths. Larger Chinese datasets, deletion propagation, long-term decay, and cost evaluation remain future work.

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