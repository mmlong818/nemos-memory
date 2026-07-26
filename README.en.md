# Nemos Memory

[中文](README.md)

**A local-first, evidence-backed long-term memory engine that understands how facts change.**

Nemos Memory is built for AI assistants, agents, companion applications, and personal knowledge tools. Instead of merely storing chat fragments, it organizes source events, derived memories, current facts, historical versions, temporal relationships, and provenance into a maintainable memory system.

It ships as an embedded TypeScript SDK backed by local SQLite. Applications can integrate it without deploying a separate vector database or memory server.

> Current version: `0.7.5-alpha.9`. Core ingestion, fact evolution, recall, correction, invalidation, isolation, and export flows are available. APIs may still change before the stable release.

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

## Formal evaluation

`0.7.5-alpha.8` completed the full 500-question LongMemEval evaluation. All 500 answers were generated successfully, the official judge completed all 500 decisions, and both generation and judge error counts were zero.

| Metric | Result |
|---|---:|
| Overall accuracy | **84.6%** |
| Macro average across six task types | **85.9%** |
| Abstention accuracy | **86.7%** |
| Questions with traceable sources | 470 / 500 |
| At least one source recalled among traceable questions | **100.0%** |
| All sources recalled among traceable questions | **98.5%** |
| Search latency P50 | 787 ms |
| Search latency P95 | 940 ms |

| Task type | Accuracy |
|---|---:|
| Single-session user facts | **95.7%** |
| Single-session preferences | 73.3% |
| Single-session assistant statements | **94.6%** |
| Multi-session | 71.4% |
| Temporal reasoning | **82.7%** |
| Knowledge update | **97.4%** |

The run used the LongMemEval `oracle` dataset variant, Top-20 recall, the shared external reader `gpt-5.6-terra`, and the official judge model `gpt-4o-2024-08-06`. The track evaluates recalled memory facts without using each product's own agent answerer, so the result measures the ingestion, recall, and evidence-use pipeline rather than complete application intelligence.

Of the remaining 77 failures, 41 lacked sufficient evidence in the recall packet, 32 came from reader or conflict handling, and 4 came from abstention decisions. The next phase prioritizes sparse-evidence coverage for multi-session, preference, and temporal questions.

This is not directly comparable with the public LongMemEval leaderboard because the `oracle` variant and shared external reader define a separate track. Numerical comparisons with [Mem0](https://github.com/mem0ai/mem0), [LangMem](https://github.com/langchain-ai/langmem), and [Graphiti](https://github.com/getzep/graphiti) will only be published after rerunning them with identical data, models, parameters, and judging protocol.

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