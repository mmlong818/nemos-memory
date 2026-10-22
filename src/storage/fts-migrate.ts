// storage/fts-migrate.ts — FTS 分词方案升级：用主表原文重建 FTS 内容（幂等，只跑一次）
//
// 旧库的 FTS 行是 unicode61 时代写入的未分词文本。nemos_meta 记录 FTS 文本处理方案的版本，
// 版本不符就在一个 IMMEDIATE 事务里重建并写入新版本，之后每次启动只读一行标记。
// 并发打开同一个库时，后到者拿到写锁后会重新读标记，已升级则直接跳过。

import type Database from "better-sqlite3";
import { LAYERS } from "../types.js";
import { segmentForFts } from "./fts-segment.js";

/** 改动 segmentForFts 的输出形态时递增，会触发全量重建。 */
export const FTS_TEXT_VERSION = "cjk-seg-1";
const META_KEY = "fts_text_version";
const PAGE = 1000;

interface ContentRow {
  rowid: number;
  id: string;
  tenant_id: string;
  user_id: string;
  scope: string;
  content: string;
}

interface EntityRow {
  record_id: string;
  layer: string;
  tenant_id: string;
  user_id: string;
  scope: string;
  entities: string;
}

interface CueRow {
  rowid: number;
  id: string;
  tenant_id: string;
  user_id: string;
  cue: string;
}

/** 按 rowid 分页读，避免大库一次性载入内存，也避开「迭代中写同一连接」的限制。 */
function forEachPage<R extends { rowid: number }>(
  db: Database.Database,
  sql: string,
  each: (row: R) => void,
): void {
  const stmt = db.prepare(sql);
  let last = 0;
  for (;;) {
    const rows = stmt.all(last, PAGE) as R[];
    for (const row of rows) each(row);
    if (rows.length < PAGE) return;
    last = rows[rows.length - 1]!.rowid;
  }
}

function rebuildContentFts(db: Database.Database): void {
  for (const layer of LAYERS) {
    db.exec(`DELETE FROM ${layer}_fts`);
    const ins = db.prepare(
      `INSERT INTO ${layer}_fts (id, tenant_id, user_id, scope, content) VALUES (?,?,?,?,?)`,
    );
    forEachPage<ContentRow>(
      db,
      `SELECT rowid, id, tenant_id, user_id, scope, content FROM ${layer}
       WHERE rowid > ? ORDER BY rowid LIMIT ?`,
      (r) => ins.run(r.id, r.tenant_id, r.user_id, r.scope, segmentForFts(r.content)),
    );
  }
}

/**
 * 实体 FTS 没有对应主表列（archival 的实体是事后只写进 FTS 的），所以以现有 FTS 行为源。
 * 这要求只在「FTS 仍是旧版未分词文本」时跑一次，由版本标记 + IMMEDIATE 事务保证。
 */
function rebuildEntityFts(db: Database.Database): void {
  const rows = db
    .prepare(`SELECT record_id, layer, tenant_id, user_id, scope, entities FROM nemos_entities_fts`)
    .all() as EntityRow[];
  db.exec(`DELETE FROM nemos_entities_fts`);
  const ins = db.prepare(
    `INSERT INTO nemos_entities_fts (record_id, layer, tenant_id, user_id, scope, entities)
     VALUES (?,?,?,?,?,?)`,
  );
  for (const r of rows) {
    ins.run(r.record_id, r.layer, r.tenant_id, r.user_id, r.scope, segmentForFts(r.entities));
  }
}

function rebuildCueFts(db: Database.Database): void {
  db.exec(`DELETE FROM prospective_cue_fts`);
  const ins = db.prepare(
    `INSERT INTO prospective_cue_fts (id, tenant_id, user_id, cue) VALUES (?,?,?,?)`,
  );
  forEachPage<CueRow>(
    db,
    `SELECT rowid, id, tenant_id, user_id, cue FROM prospective
     WHERE rowid > ? ORDER BY rowid LIMIT ?`,
    (r) => ins.run(r.id, r.tenant_id, r.user_id, segmentForFts(r.cue)),
  );
}

/** 在所有 FTS 虚表建好之后调用。 */
export function rebuildFtsIfNeeded(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS nemos_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  db.transaction(() => {
    const row = db.prepare(`SELECT value FROM nemos_meta WHERE key = ?`).get(META_KEY) as
      | { value: string }
      | undefined;
    if (row?.value === FTS_TEXT_VERSION) return;
    rebuildContentFts(db);
    rebuildEntityFts(db);
    rebuildCueFts(db);
    db.prepare(`INSERT OR REPLACE INTO nemos_meta (key, value) VALUES (?, ?)`).run(
      META_KEY,
      FTS_TEXT_VERSION,
    );
  }).immediate();
}
