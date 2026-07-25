# Nemos Memory 架构

## 总览

Nemos Memory 以嵌入式 TypeScript SDK 运行。上层应用通过 `Nemos.forUser()` 获取用户隔离的 `UserMemory`，所有写入、查询和数据操作都显式携带 tenant、user 和 scope 边界。

```text
AI application
    |
    v
UserMemory API
    |
    +-- LifecycleOrchestrator
    |      +-- archival event
    |      +-- extraction
    |      +-- normalization
    |      +-- reconciliation
    |      +-- provenance linking
    |
    +-- RecallService
    |      +-- claim
    |      +-- full text
    |      +-- embedding
    |      +-- entity
    |      +-- time
    |      +-- evidence fallback
    |
    v
SQLite / in-memory storage
```

## 五层记忆

| 层 | 内容 | 主要性质 |
|---|---|---|
| `archival` | 用户原始输入 | 不可变、可追溯 |
| `episodic` | 发生过的事件 | 带事件时间 |
| `semantic` | 一般事实和知识 | 可由内容抽取 |
| `personal_semantic` | 关于用户的稳定事实 | 支持 claim 更新 |
| `procedural` | 做事方法和习惯 | 适合流程召回 |

原始证据和派生信念分开存储。派生记忆通过 `archival_ref` 和 `source_event_ids` 回到原始事件。

## 写入生命周期

1. 用户输入先写入 archival。
2. 系统分配单调 `event_seq` 并记录生命周期状态。
3. LLM 生成派生候选；受控个人事实还会经过确定性规范化。
4. 规范化阶段生成主体、predicate、对象和 `claim_key`。
5. Reconcile 根据有效时间、事件顺序和信任级别决定新增、确认、取代或争议。
6. 来源边和实体关系写入存储。
7. 同步、后台、重试和重启都复用同一套生命周期记录。

## 事实更新

结构化事实由以下部分定义：

```text
subject + predicate + context dimensions -> claim_key
```

同一 `claim_key` 下可以存在多个历史版本，但默认召回只返回当前 active 版本。旧事件即使晚完成抽取，也不能覆盖事件时间更晚的新事实。

用户可以通过 `correct()`、`invalidate()` 和 `resolveDispute()` 显式改变事实状态。变更沿 provenance 边传播，使依赖错误事实且没有独立证据的派生记忆进入 stale 状态。

## 召回流程

`recall()` 先生成确定性的 Query Plan，识别查询意图、目标层、scope、主体、predicate 和时间范围。候选来自多个通道，并通过 RRF 融合。

准入阶段会过滤：

- 不属于目标层或 scope 的内容
- 未授权的敏感记忆
- disputed、stale、hidden 或未生效事实
- 当前事实查询中的假设、玩笑和角色扮演文本
- 陈旧且持久化显著性不足的无结构琐事

每条记录在写入时计算并保存显著性分数、命中信号和证据覆盖状态。来源从单一事件增加到多事件时，覆盖状态和分数会同步重算。`recall()` 直接使用这份持久化结果，避免每次查询临时猜测。

当结构化和派生结果不足时，系统可以从 archival 补充最多一条直接证据。证据按语义与关键词融合排序，并按内容等价性去重。

每次召回都会生成进程内 `RecallTrace`，记录候选通道、拒绝原因、最终结果和耗时。

## 存储

默认 SQLite 存储包含：

- 五层记忆表与 FTS 索引
- embedding 表
- ingest queue 与生命周期记录
- claim index、predicate registry 和 claim-key alias
- provenance edge 与操作日志
- 持久化显著性与证据覆盖元数据
- identity operation
- reflection cursor 与 lease

`archival` 受数据库触发器保护，禁止更新。写入和索引维护在 SQLite 事务中完成。

## 隔离

所有存储查询至少受 `tenant_id + user_id` 约束。scope 提供同一用户内部的进一步边界。敏感内容默认不会进入普通召回；调用方必须显式请求。

## 关闭与恢复

后台任务使用持久化队列和 `next_attempt_at` 退避。异常退出后，超出租约的 analyzing 任务可以恢复。`Nemos.close()` 会先等待在途任务结束，再关闭存储连接。