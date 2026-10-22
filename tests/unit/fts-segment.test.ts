// fts-segment.test.ts — FTS 中日文分词纯函数

import { test } from "node:test";
import assert from "node:assert/strict";
import { entityPhraseQuery, sanitizeFtsQuery, segmentForFts } from "../../src/storage/fts-segment.js";

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

test("segmentForFts：CJK 切词并空格分隔，非 CJK 原样保留", () => {
  assert.equal(squash(segmentForFts("交付验收标准")), "交付 验收 标准");
  assert.equal(squash(segmentForFts("Hello world 123")), "Hello world 123");
  assert.equal(squash(segmentForFts("使用PostgreSQL迁移")), "使用 PostgreSQL 迁移");
  assert.equal(segmentForFts(""), "");
});

test("segmentForFts：≥3 字的词附带二字组，且放在片段末尾不打断词序", () => {
  assert.equal(squash(segmentForFts("财务报表分析")), "财务报表 分析 财务 务报 报表");
});

test("segmentForFts：日文假名片段也被切开", () => {
  const out = squash(segmentForFts("東京に住んでいます"));
  assert.ok(out.split(" ").length > 1, out);
});

test("sanitizeFtsQuery：非 CJK 查询行为与旧版一致", () => {
  assert.equal(sanitizeFtsQuery("hello world"), '"hello" OR "world"');
  assert.equal(sanitizeFtsQuery('foo-bar "x" (y)*'), '"foobar" OR "x" OR "y"');
  assert.equal(sanitizeFtsQuery("   "), "");
  assert.equal(sanitizeFtsQuery("!!!"), "");
});

test("sanitizeFtsQuery：CJK 查询切词、去孤立单字、单字连续成短语", () => {
  assert.equal(sanitizeFtsQuery("项目的验收标准是什么"), '"项目" OR "验收" OR "标准" OR "什么"');
  assert.equal(sanitizeFtsQuery("内核"), '"内 核" OR "内核"');
  assert.equal(sanitizeFtsQuery("核"), '"核"', "整条查询只有孤立单字时保留");
  assert.equal(sanitizeFtsQuery("验收，标准"), '"验收" OR "标准"', "标点是词边界");
  assert.equal(sanitizeFtsQuery("PostgreSQL迁移"), '"PostgreSQL" OR "迁移"');
});

test("sanitizeFtsQuery：产出里不含会触发 MATCH 语法错误的裸字符", () => {
  const q = sanitizeFtsQuery('“验收”(标准)* AND NOT 交付:^-');
  assert.match(q, /^"[^"]+"( OR "[^"]+")*$/u);
});

test("entityPhraseQuery：CJK 实体成整体短语，非 CJK 沿用旧行为", () => {
  assert.equal(entityPhraseQuery("北京大学"), '"北京 大学"');
  assert.equal(entityPhraseQuery("John Smith"), '"John" OR "Smith"');
  assert.equal(entityPhraseQuery("，。"), "");
});
