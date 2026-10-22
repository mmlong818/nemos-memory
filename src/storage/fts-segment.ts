// storage/fts-segment.ts — FTS5 的中日文分词（写入端 + 查询端共用）
//
// FTS 虚表用 tokenize='unicode61'，它把一整段连续中文当成一个词，搜「验收」找不到「交付验收标准」。
// 这里用 Node 内置的 Intl.Segmenter 把 CJK 片段切成词、词间加空格再写入 FTS 列（主表原文不动），
// 查询端对查询串做同样的切分，再拼 MATCH 表达式。不引入任何依赖。
//
// 词典分词有「上下文不对称」问题：「财务报表」在正文里是一个词，单搜「报表」就对不上；
// 「记忆内核」被切成 记忆|内|核，单搜「内核」又是另一种切法。两端各补一手：
// - 写入端：≥3 字的词，其相邻二字组附在该片段末尾（财务报表分析 → 财务报表 分析 财务 务报 报表）；
//   放在末尾是为了不打断词与词的相邻关系，短语查询仍能工作
// - 查询端：连续的单字词合成短语（"内 核"）并附带合并形态（"内核"）；孤立单字（的/是/我）视为噪音，
//   只有整条查询没有任何其他词时才保留

/** 汉字 + 平假名/片假名（含长音符「ー」）。韩文本来就以空格分词，不在此列。 */
const CJK_RUN = /[\p{Script=Han}\p{scx=Hiragana}\p{scx=Katakana}]+/gu;
const CJK_OR_OTHER = /[\p{Script=Han}\p{scx=Hiragana}\p{scx=Katakana}]+|[^\p{Script=Han}\p{scx=Hiragana}\p{scx=Katakana}]+/gu;
const HAS_CJK = /[\p{Script=Han}\p{scx=Hiragana}\p{scx=Katakana}]/u;

let segmenter: Intl.Segmenter | null | undefined;

function getSegmenter(): Intl.Segmenter | null {
  if (segmenter === undefined) {
    try {
      segmenter = new Intl.Segmenter("zh", { granularity: "word" });
    } catch {
      segmenter = null; // 无 ICU 分词数据：退回不分词（等同 unicode61 旧行为）
    }
  }
  return segmenter;
}

/** 一段纯 CJK 文本 → 词列表（丢弃标点类片段） */
function cjkWords(run: string): string[] {
  const seg = getSegmenter();
  if (!seg) return [run];
  const words: string[] = [];
  for (const s of seg.segment(run)) {
    if (s.isWordLike !== false) words.push(s.segment);
  }
  return words;
}

function charsOf(word: string): string[] {
  return Array.from(word);
}

/** 写入 FTS 前的文本处理：CJK 片段切词并以空格分隔，非 CJK 部分原样保留。 */
export function segmentForFts(text: string): string {
  return text.replace(CJK_RUN, (run) => {
    const words = cjkWords(run);
    const bigrams: string[] = [];
    for (const word of words) {
      const chars = charsOf(word);
      for (let i = 0; chars.length >= 3 && i < chars.length - 1; i++) {
        bigrams.push(chars[i]! + chars[i + 1]!);
      }
    }
    return ` ${[...words, ...bigrams].join(" ")} `;
  });
}

/** 一个 CJK 片段 → MATCH 项；孤立单字放进 weak。 */
function collectCjkTerms(run: string, terms: string[], weak: string[]): void {
  let singles: string[] = [];
  const flush = (): void => {
    if (singles.length === 1) weak.push(`"${singles[0]}"`);
    else if (singles.length > 1) {
      terms.push(`"${singles.join(" ")}"`, `"${singles.join("")}"`);
    }
    singles = [];
  };
  for (const word of cjkWords(run)) {
    if (charsOf(word).length === 1) {
      singles.push(word);
      continue;
    }
    flush();
    terms.push(`"${word}"`);
  }
  flush();
}

/**
 * 把用户查询转成安全的 FTS5 MATCH 表达式（词间 OR）；无有效词返回空串。
 * 非 CJK 词沿用旧规则（去掉非字母数字下划线后加引号）；含 CJK 的先切词。
 * 产出的每一项都只含字母数字/CJK 与空格，包在双引号里，不会触发 MATCH 语法错误。
 */
export function sanitizeFtsQuery(q: string): string {
  const terms: string[] = [];
  const weak: string[] = [];
  for (const raw of q.split(/\s+/)) {
    if (!HAS_CJK.test(raw)) {
      const t = raw.replace(/[^\p{L}\p{N}_]/gu, "");
      if (t) terms.push(`"${t}"`);
      continue;
    }
    // 标点是词边界：先按非字母数字切开，再把 CJK 与非 CJK 部分分别处理
    for (const piece of raw.split(/[^\p{L}\p{N}_]+/u)) {
      for (const chunk of piece.match(CJK_OR_OTHER) ?? []) {
        if (HAS_CJK.test(chunk)) collectCjkTerms(chunk, terms, weak);
        else terms.push(`"${chunk}"`);
      }
    }
  }
  const picked = terms.length > 0 ? terms : weak;
  return [...new Set(picked)].join(" OR ");
}

/**
 * 实体查询：含 CJK 时把分词结果作为一个整体短语（"北京 大学"），要求词序相邻，
 * 和 InMemoryStorage 的实体精确匹配语义对齐，避免「北京大学」连带命中「上海交通大学」。
 * 不含 CJK 时沿用 sanitizeFtsQuery 的旧行为。
 */
export function entityPhraseQuery(entity: string): string {
  if (!HAS_CJK.test(entity)) return sanitizeFtsQuery(entity);
  const tokens: string[] = [];
  for (const piece of entity.split(/[^\p{L}\p{N}_]+/u)) {
    for (const chunk of piece.match(CJK_OR_OTHER) ?? []) {
      if (HAS_CJK.test(chunk)) tokens.push(...cjkWords(chunk));
      else tokens.push(chunk);
    }
  }
  return tokens.length > 0 ? `"${tokens.join(" ")}"` : "";
}
