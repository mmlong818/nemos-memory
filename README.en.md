# Nemos Memory

[中文](README.md)

Nemos Memory is a local-first, application-agnostic long-term memory engine for AI systems. It stores raw user evidence, derived memories, fact versions, temporal relationships, and provenance in local SQLite, then exposes stable and explainable ingestion and recall APIs to any AI application.

## Core capabilities

- **Five memory layers**: archival, episodic, semantic, personal semantic, and procedural.
- **Immutable raw evidence**: user input is archived separately and every derived memory remains traceable.
- **Fact evolution**: stable `claim_key` identity, valid time, and event order preserve both current and historical values.
- **Conflict handling**: confirm, supersede, dispute, correct, invalidate, and reversible identity merge/split operations.
- **Two-stage recall**: structured and derived memories first, with one bounded raw-evidence fallback when needed.
- **Long-term salience**: stale trivia is suppressed while important experiences, recent content, and explicit time queries remain available.
- **Isolation**: user, scope, sensitivity, and provenance boundaries prevent cross-user and cross-context contamination.
- **Embedded deployment**: SQLite is the default; no separate memory server or database service is required.

## Install

Node.js 20 or later is required.

```powershell
cd sdk\typescript
npm install
npm run build
```

Install the local package from another TypeScript project:

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

await memory.ingest("I recently moved to Fuzhou and started cycling to work.");

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
| `recall(query, options)` | Return a memory packet with provenance and reasons |
| `getRelevantContext(query)` | Build prompt-ready memory context |
| `write(input)` | Write an explicit structured memory |
| `correct(memoryId, correction)` | Correct a fact and propagate the change |
| `invalidate(memoryId, reason)` | Explicitly invalidate a memory |
| `resolveDispute(claimKey, winnerId)` | Resolve conflicting facts |
| `export(format)` | Export JSON-LD or Markdown |
| `forget(memoryId)` | Remove deletable memory and related indexes |
| `explainRecall(traceId)` | Inspect recall channels, filtering, and ranking |

## Data model

Each memory carries user boundaries, scope, provenance, confidence signals, time, belief state, and source-event links. Structured assertions also carry subject, predicate, object, and context dimensions.

See [Architecture](docs/architecture.md) for the data flow and [SDK documentation](sdk/typescript/README.en.md) for the complete TypeScript interface.

## Repository layout

```text
sdk/typescript/src/       Memory engine implementation
docs/architecture.md      Current implementation architecture
```

## License

[PolyForm Noncommercial 1.0.0](LICENSE). Non-commercial use, modification, and distribution are allowed; commercial use requires a separate license.