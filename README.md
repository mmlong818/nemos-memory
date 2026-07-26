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

## 正式评测

`0.7.5-alpha.8` 完成了全量 500 题 LongMemEval 评测。500 题全部成功生成，官方裁判完成 500 次判定，生成和裁判错误均为 0，结果满足正式统计条件。

| 指标 | 结果 |
|---|---:|
| 总准确率 | **84.6%** |
| 六类任务平均准确率 | **85.9%** |
| 拒答准确率 | **86.7%** |
| 可追溯来源的题目 | 470 / 500 |
| 可追溯题中至少命中一个答案来源 | **100.0%** |
| 可追溯题中命中全部答案来源 | **98.5%** |
| 搜索延迟 P50 | 787 ms |
| 搜索延迟 P95 | 940 ms |

| 任务类型 | 准确率 |
|---|---:|
| 单轮用户事实 | **95.7%** |
| 单轮偏好 | 73.3% |
| 单轮助手陈述 | **94.6%** |
| 多轮综合 | 71.4% |
| 时间推理 | **82.7%** |
| 知识更新 | **97.4%** |

评测使用 LongMemEval `oracle` 数据变体、Top-20 召回、统一外部回答模型 `gpt-5.6-terra` 和官方裁判模型 `gpt-4o-2024-08-06`。赛道只比较记忆事实，不使用产品自带 Agent 的回答能力，因此结果衡量的是记忆写入、召回和事实使用链路，而不是整个应用的综合智能。

剩余 77 个错误中，41 个来自召回包缺少充分证据，32 个来自回答或冲突处理，4 个来自拒答判断。下一阶段将优先改善多轮综合、偏好召回和时间推理中的稀疏证据覆盖。

这不是对公开 LongMemEval 排行榜的直接对照：`oracle` 数据变体和统一外部回答模型构成了独立赛道。与 [Mem0](https://github.com/mem0ai/mem0)、[LangMem](https://github.com/langchain-ai/langmem) 和 [Graphiti](https://github.com/getzep/graphiti) 的数字比较，只有在相同数据、模型、参数和裁判协议下重新运行后才会发布。

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