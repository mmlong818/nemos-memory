// cjk-fts.test.ts
// 回归：FTS5 对中文可用。unicode61 把一整段连续中文当成一个词，搜「验收」找不到「交付验收标准」。
// 修复后写入端把 CJK 片段分词后入 FTS 列，查询端同样分词；主表原文不变；旧库升级时重建 FTS。

import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteStorage } from "../../../src/index.js";
import type { Memory, Prospective } from "../../../src/index.js";
import { SCHEMA_VERSION } from "../../../src/types.js";

const T = "default";
const U = "alice";

function makeMemory(id: string, content: string, entities?: string[]): Memory {
  const now = new Date().toISOString();
  return {
    id,
    layer: "personal_semantic",
    type: "user",
    scope: "global",
    content,
    entities,
    source: { authoritative: false, kind: "derived", origin: "llm-extract", chain_depth: 1 },
    arousal: { value: 0, signal_sources: [] },
    surprise: { value: 0, basis: "r" },
    ownership: { kind: "user" },
    created_at: now,
    last_accessed: now,
    access_count: 0,
    stability: 1,
    schema_version: SCHEMA_VERSION,
  } as unknown as Memory;
}

function makeProspective(id: string, cue: string): Prospective {
  return {
    id, tenant_id: T, user_id: U, scope: "global", domain_ids: [], cue,
    cue_vec: new Float32Array([1, 0, 0]), projection: `proj-${id}`, confidence: 0.6,
    evidence_refs: [], prediction_log: [], retrievability: 1, status: "crystallized",
    created_at: "2026-01-01T00:00:00.000Z", last_accessed: "2026-01-01T00:00:00.000Z",
  };
}

function search(s: SqliteStorage, q: string): string[] {
  return s.searchFts(T, U, q, ["personal_semantic"], undefined, 10).map((m) => m.id);
}

test("中文子词命中：搜「验收」找得到「交付验收标准」，原文不变", () => {
  const s = new SqliteStorage(":memory:");
  s.insert(T, U, makeMemory("m1", "交付验收标准：每个里程碑必须有书面签收"));
  s.insert(T, U, makeMemory("m2", "用户喜欢吃川菜和火锅"));
  assert.deepEqual(search(s, "验收"), ["m1"]);
  assert.deepEqual(search(s, "川菜"), ["m2"]);
  assert.deepEqual(search(s, "交付验收标准"), ["m1"]);
  assert.equal(s.get(T, U, "personal_semantic", "m1")?.content, "交付验收标准：每个里程碑必须有书面签收");
  s.close();
});

test("中文长词内部子词与相邻单字词都能命中", () => {
  const s = new SqliteStorage(":memory:");
  s.insert(T, U, makeMemory("m1", "本季度的财务报表已经发布"));
  s.insert(T, U, makeMemory("m2", "需要重新编译记忆内核"));
  assert.deepEqual(search(s, "报表"), ["m1"], "「财务报表」整词里的子词");
  assert.deepEqual(search(s, "内核"), ["m2"], "分词器把「内核」拆成两个单字");
  s.close();
});

test("中英混排：英文词、数字与中文词都能命中", () => {
  const s = new SqliteStorage(":memory:");
  s.insert(T, U, makeMemory("m1", "使用PostgreSQL做数据库迁移，版本v16"));
  s.insert(T, U, makeMemory("m2", "周五下午三点开会"));
  assert.deepEqual(search(s, "迁移"), ["m1"]);
  assert.deepEqual(search(s, "postgresql"), ["m1"]);
  assert.deepEqual(search(s, "数据库 v16"), ["m1"]);
  assert.deepEqual(search(s, "开会"), ["m2"]);
  s.close();
});

test("查询带标点与 MATCH 特殊字符不抛错", () => {
  const s = new SqliteStorage(":memory:");
  s.insert(T, U, makeMemory("m1", "交付验收标准"));
  assert.deepEqual(search(s, "“验收”，标准？\"(*)"), ["m1"]);
  assert.deepEqual(search(s, "，。！"), []);
  s.close();
});

test("实体 FTS：中文实体的子词可被 findByEntity 找到", () => {
  const s = new SqliteStorage(":memory:");
  s.insert(T, U, makeMemory("m1", "他负责这个项目", ["北京大学", "项目经理"]));
  s.insert(T, U, makeMemory("m2", "无关内容", ["上海交通大学"]));
  assert.deepEqual(s.findByEntity(T, U, "北京").map((m) => m.id), ["m1"]);
  assert.deepEqual(s.findByEntity(T, U, "经理").map((m) => m.id), ["m1"]);
  assert.deepEqual(s.findByEntity(T, U, "北京大学").map((m) => m.id), ["m1"], "整个实体按短语匹配，不连带「上海交通大学」");
  assert.deepEqual(s.findByEntity(T, U, "大学").map((m) => m.id).sort(), ["m1", "m2"]);
  s.close();
});

test("前瞻 cue FTS：向量缺席时中文 cue 子词可命中", () => {
  const s = new SqliteStorage(":memory:");
  s.insertProspective(T, U, makeProspective("p1", "周末不要提醒我工作的事"));
  s.insertProspective(T, U, makeProspective("p2", "每天早上喝咖啡"));
  const hits = s.searchProspectiveByCue(T, U, "提醒", null, 5).map((h) => h.prospective.id);
  assert.deepEqual(hits, ["p1"]);
  s.close();
});

function seedLegacyDb(path: string): void {
  // 先用当前代码建好表与主表数据，再把 FTS 还原成旧版（未分词）的样子，并抹掉升级标记
  const s = new SqliteStorage(path);
  s.insert(T, U, makeMemory("m1", "交付验收标准：每个里程碑必须有书面签收", ["北京大学"]));
  s.insertProspective(T, U, makeProspective("p1", "周末不要提醒我工作的事"));
  s.close();
  const db = new Database(path);
  db.exec(`DELETE FROM personal_semantic_fts; DELETE FROM nemos_entities_fts; DELETE FROM prospective_cue_fts;`);
  db.prepare(`INSERT INTO personal_semantic_fts (id, tenant_id, user_id, scope, content) VALUES (?,?,?,?,?)`)
    .run("m1", T, U, "global", "交付验收标准：每个里程碑必须有书面签收");
  db.prepare(`INSERT INTO nemos_entities_fts (record_id, layer, tenant_id, user_id, scope, entities) VALUES (?,?,?,?,?,?)`)
    .run("m1", "personal_semantic", T, U, "global", "北京大学");
  db.prepare(`INSERT INTO prospective_cue_fts (id, tenant_id, user_id, cue) VALUES (?,?,?,?)`)
    .run("p1", T, U, "周末不要提醒我工作的事");
  db.exec(`DROP TABLE IF EXISTS nemos_meta;`);
  db.close();
}

test("旧库升级：重启后旧数据能用中文子词搜到，且只重建一次", () => {
  const dir = mkdtempSync(join(tmpdir(), "nemos-cjk-"));
  const path = join(dir, "legacy.db");
  try {
    seedLegacyDb(path);

    const s = new SqliteStorage(path);
    assert.deepEqual(search(s, "验收"), ["m1"], "内容 FTS 已重建");
    assert.deepEqual(s.findByEntity(T, U, "北京").map((m) => m.id), ["m1"], "实体 FTS 已重建");
    assert.deepEqual(
      s.searchProspectiveByCue(T, U, "提醒", null, 5).map((h) => h.prospective.id),
      ["p1"],
      "cue FTS 已重建",
    );
    s.close();

    // 标记已落库：把 FTS 内容改成别的，再次打开不应被重建覆盖
    const db = new Database(path);
    db.exec(`DELETE FROM personal_semantic_fts;`);
    db.close();
    const again = new SqliteStorage(path);
    assert.deepEqual(search(again, "验收"), [], "已升级的库不应每次启动都重建");
    again.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
