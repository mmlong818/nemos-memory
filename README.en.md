# Nemos Memory

[中文](README.md)

**A local-first, evidence-backed long-term memory engine that understands how facts change.**

Nemos Memory is built for AI assistants, agents, companion applications, and personal knowledge tools. Instead of merely storing chat fragments, it organizes source events, derived memories, current facts, historical versions, temporal relationships, and provenance into a maintainable memory system.

It ships as an embedded TypeScript SDK backed by local SQLite. Applications can integrate it without deploying a separate vector database or memory server.

> Current version: `0.7.5-alpha.17`. Core ingestion, fact evolution, recall, correction, invalidation, isolation, and export flows are available. APIs may still change before the stable release.

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

`0.7.5-alpha.17` completed a full 500-question, five-product LongMemEval comparison under identical conditions. Every system completed all 500 questions with zero generation or judge errors. Nemos Memory ranked first with **89.8%** overall accuracy.

| Product | Overall accuracy | Six-task macro average | Abstention accuracy | End-to-end P50 |
|---|---:|---:|---:|---:|
| **Nemos Memory** | **89.8%** | **91.2%** | **96.7%** | 94.6 s |
| Hindsight | 79.2% | 78.0% | 96.7% | 29.6 s |
| Mem0 OSS | 74.6% | 80.8% | 93.3% | 36.8 s |
| Graphiti OSS | 60.0% | 63.5% | 96.7% | 74.1 s |
| LangMem | 52.0% | 56.4% | 93.3% | 18.9 s |

| Nemos Memory task type | Accuracy |
|---|---:|
| Single-session user facts | 97.1% |
| Single-session preferences | 90.0% |
| Single-session assistant statements | 96.4% |
| Multi-session | 82.7% |
| Temporal reasoning | 88.7% |
| Knowledge update | 92.3% |

The run used the LongMemEval `oracle` dataset variant, Top-20 recall, the shared external reader `gpt-5.6-terra`, and the official judge model `gpt-4o-2024-08-06`. The track evaluates recalled memory facts without using each product's own agent answerer, so the result measures the ingestion, recall, and evidence-use pipeline rather than complete application intelligence.

Nemos Memory recalled at least one answer source for all 469 traceable questions and recalled every answer source in 94.9% of them. Its isolated search latency was P50 378 ms and P95 640 ms. The clearest engineering weakness is end-to-end ingestion and generation time; an accuracy lead does not imply that the complete product experience already leads.

This is not directly comparable with the public LongMemEval leaderboard because the `oracle` variant and shared external reader define a separate track. [Mem0](https://github.com/mem0ai/mem0), [LangMem](https://github.com/langchain-ai/langmem), [Graphiti](https://github.com/getzep/graphiti), and [Hindsight](https://github.com/vectorize-io/hindsight) were rerun here with the same data, models, parameters, and judging protocol; the numbers apply only to this reproducible protocol.

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