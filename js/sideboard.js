/*
 * サイドボーディング（DOM に依存しない）
 *
 * config = { main: [{count, name}], side: [{count, name}] }   … その対戦での今の構成
 * 元のデッキ（deck.main / deck.side）は書き換えず、構成だけをその対戦の間持つ。
 * 入れ替えは1対1でなくてよい（メイン60枚以上・サイド15枚以下だけを守る）
 */
(function (root) {
  'use strict';

  const nameKey = typeof module !== 'undefined' && module.exports
    ? require('./parser.js').nameKey
    : root.MTG.nameKey;

  const MIN_MAIN = 60;
  const MAX_SIDE = 15;

  function cloneList(list) {
    return (list || []).map((e) => ({ count: e.count, name: e.name }));
  }

  /** 元のリストから構成を作る */
  function createConfig(deck) {
    return { main: cloneList(deck.main), side: cloneList(deck.side) };
  }

  function countList(list) {
    return list.reduce((sum, e) => sum + e.count, 0);
  }

  function configCounts(config) {
    return { main: countList(config.main), side: countList(config.side) };
  }

  function findEntry(list, name) {
    const k = nameKey(name);
    return list.find((e) => nameKey(e.name) === k) || null;
  }

  /** カードを1枚、メイン → サイド（to = 'side'）またはサイド → メイン（to = 'main'）へ移す */
  function moveOne(config, name, to) {
    if (to !== 'main' && to !== 'side') return false;
    const from = to === 'side' ? config.main : config.side;
    const dest = to === 'side' ? config.side : config.main;
    const src = findEntry(from, name);
    if (!src || src.count <= 0) return false;
    src.count -= 1;
    if (src.count === 0) from.splice(from.indexOf(src), 1);
    const d = findEntry(dest, name);
    if (d) d.count += 1;
    else dest.push({ count: 1, name: src.name });
    return true;
  }

  /** 枚数のルールを満たしていなければ、その理由（なければ空の配列） */
  function validateConfig(config) {
    const { main, side } = configCounts(config);
    const problems = [];
    if (main < MIN_MAIN) problems.push(`メインが${main}枚です。${MIN_MAIN}枚以上にしてください（あと${MIN_MAIN - main}枚）。`);
    if (side > MAX_SIDE) problems.push(`サイドが${side}枚です。${MAX_SIDE}枚以下にしてください（${side - MAX_SIDE}枚多い）。`);
    return problems;
  }

  /**
   * 元のリストとの差。メインに入れたカード（IN）と、メインから抜いたカード（OUT）
   * @returns {{in: {count, name}[], out: {count, name}[]}}
   */
  function configDiff(deck, config) {
    const names = new Map(); // key -> 表示名（元のリストの順）
    [...deck.main, ...(deck.side || []), ...config.main, ...config.side].forEach((e) => {
      const k = nameKey(e.name);
      if (!names.has(k)) names.set(k, e.name);
    });
    const countOf = (list, name) => (findEntry(list, name) || { count: 0 }).count;
    const diff = { in: [], out: [] };
    names.forEach((name) => {
      const delta = countOf(config.main, name) - countOf(deck.main, name);
      if (delta > 0) diff.in.push({ count: delta, name });
      if (delta < 0) diff.out.push({ count: -delta, name });
    });
    return diff;
  }

  function isOriginal(deck, config) {
    const d = configDiff(deck, config);
    return d.in.length === 0 && d.out.length === 0;
  }

  const api = { MIN_MAIN, MAX_SIDE, createConfig, configCounts, moveOne, validateConfig, configDiff, isOriginal };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
