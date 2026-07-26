# Nemos Memory

[English](README.en.md)

**一个本机优先、证据可追溯、能够理解事实变化的 AI 长期记忆引擎。**

Nemos Memory 面向 AI 助理、Agent、陪伴应用和个人知识工具。它不只是保存聊天片段，而是把原始输入、派生记忆、当前事实、历史版本、时间关系和来源链组织成一套可持续维护的记忆系统。

项目以嵌入式 TypeScript SDK 交付，默认数据存储为本机 SQLite。应用可以直接接入，不需要另行部署向量数据库或记忆服务器。

> 当前版本：`0.7.5-alpha.8`。核心写入、事实更新、召回、纠正、失效、隔离和导出链路已经可用；API 在正式版前仍可能调整。

## 为什么需要 Nemos Memory

普通的向量检索擅长找“相似内容”，但长期记忆还必须回答另外几类问题：

- 用户现在住在哪里，而不是曾经住在哪里？
- 一条结论来自哪句话，是否还能回到原始证据？
- 新旧说法冲突时，应该更新、保留历史，还是等待确认？
- 玩笑、引用、角色扮演和第三方信息会不会被误记成用户事实？
- 不同用户、角色和使用场景之间是否真正隔离？
- 用户纠正或删除后，依赖旧事实的记忆如何同步处理？

Nemos Memory 围绕这些问题设计。它把“发生过的内容”和“系统当前相信的事实”分开保存，并让每次召回都保留来源、时间和命中理由。

## 核心能力

| 能力 | Nemos Memory 的处理方式 |
|---|---|
| 五层记忆 | 分为原始档案、事件、通用知识、个人事实和做事方法 |
| 证据与结论分离 | 原始输入不可变保存，派生记忆可追溯到来源事件 |
| 事实演化 | 使用稳定的 `claim_key`、有效时间和事件顺序维护当前值与历史值 |
| 冲突与纠正 | 支持确认、取代、争议、人工纠正、显式失效和身份合并/拆分 |
| 可控召回 | 组合结构化事实、全文、向量、实体、时间和证据回退通道 |
| 长期保留 | 持久化显著性、证据数量和覆盖状态，降低陈旧琐事的召回概率 |
| 隔离与敏感性 | 所有读写受租户、用户、scope 和敏感级别约束 |
| 本机部署 | 默认使用 SQLite；向量能力可选，不依赖常驻服务 |
| 可解释性 | 返回来源、召回理由和轨迹，可检查候选、过滤与排序过程 |
| 数据主权 | 支持纠正、失效、删除以及 JSON-LD / Markdown 导出 |

## 工作方式

```text
用户输入
   ↓
原始证据归档（不可变）
   ↓
抽取 → 规范化 → 事实对账 → 来源关联
   ↓
五层记忆 + 事实版本 + 时间与来源
   ↓
查询规划 → 多通道召回 → 边界过滤 → 排序与解释
```

同一事实的新值不会抹掉旧记录。Nemos Memory 会保留它的历史版本，并在默认查询中只返回当前有效值。即使较早事件的异步抽取较晚完成，也不能覆盖时间上更新的事实。

## 与其他开源项目的比较

这些项目的定位不同：Nemos Memory 是嵌入式、本机优先的记忆内核；[Mem0](https://github.com/mem0ai/mem0) 更强调通用集成与服务生态；[LangMem](https://github.com/langchain-ai/langmem) 面向 LangGraph Agent；[Graphiti](https://github.com/getzep/graphiti) 使用时态知识图处理动态关系。

### 2026-07-25 同轮测试

本轮从零建立 `core-v2` 中文测试集，包含 24 个场景、37 条事件和 41 个查询。四个产品在同一轮运行中接收相同输入、事件时间、查询和 Top-5 限制，统一使用 `gpt-5.6-terra` 与 `text-embedding-3-small`。答案采用冻结别名规则评分，不使用模型裁判。

| 产品 | 版本 | Recall@5 | MRR | Top-1 | Top-1 安全 | 严格无污染 | 来源可见 | 事实时间可见 | 写入均值 | 查询均值 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Nemos Memory** | **0.7.5-alpha.4** | **100.0%** | **0.976** | 95.1% | **100.0%** | **100.0%** | **100.0%** | **100.0%** | 5325 ms | **387 ms** |
| Mem0 OSS | 2.0.14 | 97.6% | 0.939 | 90.2% | 95.2% | 85.7% | 0.0% | 0.0% | **4127 ms** | 683 ms |
| LangMem | 0.0.30 | 97.6% | **0.976** | **97.6%** | **100.0%** | **100.0%** | 0.0% | 0.0% | 4197 ms | 529 ms |
| Graphiti OSS | 0.29.2 | 70.7% | 0.677 | 65.9% | 85.7% | 71.4% | 70.7% | 70.7% | 11772 ms | 599 ms |

`Top-1 安全`检查首条结果是否为已知错误事实；`严格无污染`要求整个 Top-5 都不出现旧值、角色扮演或第三方污染。来源与时间的 0% 只表示该产品在本轮适配器使用的原生搜索结果中没有暴露这些字段，不代表它完全没有相关内部能力。

### 当前判断

本轮中，Nemos 的 Recall@5、Top-1 安全、严格无污染、来源可见和事实时间可见均为 100%，查询均值 387 ms，且整轮没有运行错误。它已补齐显式年份历史召回、办公地点、密集文本高价值事实、相对时间锚点和长期设备更新等上一轮暴露的问题。

剩余差距主要在首条排序与写入耗时：Nemos 的 Top-1 为 95.1%，仍低于 LangMem 的 97.6%；单次写入均值也高于 Mem0 和 LangMem。下一阶段应继续提升开放事实类型的自动归一能力，并减少抽取过程中的模型等待时间。

这不是通用排行榜。测试集规模仍有限，也没有覆盖删除传播、超长期衰减、并发写入和调用成本。Nemos 本轮使用单次抽取，并关闭双重校验和自动关联，避免通过额外模型调用取得不对等优势。

## 安装

需要 Node.js 20 或更高版本。当前版本从源码接入：

```powershell
git clone https://github.com/mmlong818/nemos-memory.git
cd nemos-memory\sdk\typescript
npm install
npm run build
```

在另一个 TypeScript 项目中安装本地包：

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

await memory.ingest("我最近搬到了福州，并开始骑车通勤。", {
  scenario: "chat",
  contentDate: "2026-07-25",
});

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
| `forget(memoryId)` | 删除允许删除的记忆及相关索引 |
| `export(format)` | 导出 JSON-LD 或 Markdown |
| `explainRecall(traceId)` | 查看召回通道、过滤和排序依据 |

## 文档与开发

- [架构说明](docs/architecture.md)：数据流、五层记忆、事实更新、召回与存储设计。
- [TypeScript SDK](sdk/typescript/README.md)：初始化、写入、查询和数据操作示例。

在 `sdk/typescript` 目录运行完整检查：

```powershell
npm run check
```

## 许可证

[PolyForm Noncommercial 1.0.0](LICENSE)。允许非商业使用、修改和分发；商业使用需要单独授权。