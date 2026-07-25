# Nemos Memory

[English](README.en.md)

Nemos Memory 是一个本机优先、应用无关的 AI 长期记忆引擎。它把用户原始输入、派生记忆、事实版本、时间关系和来源链保存在本机 SQLite 中，并向上层 AI 应用提供稳定、可解释的写入与召回接口。

## 核心能力

- **五层记忆**：archival、episodic、semantic、personal semantic、procedural 分层保存。
- **原始证据不可变**：用户原文单独归档，派生摘要始终可以追溯到来源。
- **事实更新**：使用稳定的 `claim_key`、有效时间和事件顺序维护当前值与历史值。
- **冲突处理**：支持确认、取代、争议、用户纠正、显式失效和身份合并/拆分。
- **两阶段召回**：优先返回结构化事实和派生记忆，不足时再补充一条最相关的原始证据。
- **长期显著性**：为每条记忆持久化显著性分数、保留信号和证据覆盖状态，降低陈旧琐事的默认召回概率。
- **权限边界**：按用户、scope、敏感级别和来源隔离，避免跨用户或跨场景污染。
- **本机运行**：默认使用 SQLite，无需部署独立数据库或记忆服务器。

## 安装

需要 Node.js 20 或更高版本。

```powershell
cd sdk\typescript
npm install
npm run build
```

也可以从其他 TypeScript 项目安装本地包：

```powershell
npm install <仓库路径>\sdk\typescript
```

## 快速开始

```typescript
import { Nemos } from "@nemos/sdk";

const nemos = new Nemos({
  storage: { type: "sqlite", path: "./nemos.db" },
  llm: {
    provider: "zhipu",
    apiKey: process.env.ZHIPU_API_KEY!,
  },
  embedding: {
    provider: "zhipu",
    apiKey: process.env.ZHIPU_API_KEY!,
  },
});

const memory = nemos.forUser("user-001");

await memory.ingest("我最近搬到了福州，并开始骑车通勤。");

const packet = await memory.recall("我现在住在哪里？");
for (const item of packet.items) {
  console.log(item.memory.content, item.reasons);
}

await nemos.close();
```

LLM 支持 Anthropic、OpenAI、智谱和自定义 Provider。Embedding 可选；未配置时仍可使用结构化、全文和时间检索。

## 主要接口

| 接口 | 用途 |
|---|---|
| `ingest(content, options)` | 归档原文并抽取派生记忆 |
| `recall(query, options)` | 返回带来源和命中理由的记忆包 |
| `getRelevantContext(query)` | 生成可直接加入模型提示词的上下文 |
| `write(input)` | 写入显式结构化记忆 |
| `correct(memoryId, correction)` | 纠正事实并传播到依赖记忆 |
| `invalidate(memoryId, reason)` | 显式使记忆失效 |
| `resolveDispute(claimKey, winnerId)` | 解决冲突事实 |
| `export(format)` | 导出 JSON-LD 或 Markdown |
| `forget(memoryId)` | 删除允许删除的记忆及相关索引 |
| `explainRecall(traceId)` | 查看召回通道、过滤和排序依据 |

## 数据模型

每条记忆都包含用户边界、scope、来源、置信信息、时间、信念状态和来源事件。结构化事实还包含主体、predicate、对象和值域上下文。

详细数据流见 [架构说明](docs/architecture.md)。完整 TypeScript 接口见 [SDK 文档](sdk/typescript/README.md)。

## 仓库结构

```text
sdk/typescript/src/       记忆引擎实现
docs/architecture.md      当前实现架构
```

## 许可证

[PolyForm Noncommercial 1.0.0](LICENSE)。允许非商业使用、修改和分发；商业使用需要单独授权。