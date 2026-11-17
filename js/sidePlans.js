/*
 * サイドプラン（マッチアップごとの入れ替え）。DOM に依存しない
 *
 * plan = { name, in: [{count, name}], out: [{count, name}] }   … 元のリストとの差分
 * プランはデッキ名にひもづける（別のブラウザで書き出し → 読み込みしても同じデッキに付くように）
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const { nameKey } = isNode ? require('./parser.js') : root.MTG;
  const { createConfig, moveOne, configDiff } = isNode ? require('./sideboard.js') : root.MTG;

  const FORMAT = 'yanagisawa-soloplay-sideplans';
  const VERSION = 1;

  /** 今の構成をプランにする（元のリストとの差分） */
  function planFromConfig(deck, config, name) {
    const d = configDiff(deck, config);
    return { name, in: d.in, out: d.out };
  }

  /**
   * プランを反映した構成を作る。いつも元のリストから始めるので、何度選んでも同じ結果になる
   * @returns {{config, skipped: {name, count, to}[]}} skipped … デッキリストが変わっていて動かせなかったカード
   */
  function applyPlan(deck, plan) {
    const config = createConfig(deck);
    const skipped = [];
    const run = (list, to) => (list || []).forEach((e) => {
      let missed = 0;
      for (let i = 0; i < e.count; i++) if (!moveOne(config, e.name, to)) missed++;
      if (missed) skipped.push({ name: e.name, count: missed, to });
    });
    run(plan.out, 'side');
    run(plan.in, 'main');
    return { config, skipped };
  }

  function deltaMap(inList, outList) {
    const m = new Map();
    (inList || []).forEach((e) => m.set(nameKey(e.name), (m.get(nameKey(e.name)) || 0) + e.count));
    (outList || []).forEach((e) => m.set(nameKey(e.name), (m.get(nameKey(e.name)) || 0) - e.count));
    [...m].forEach(([k, v]) => { if (v === 0) m.delete(k); });
    return m;
  }

  function sameDelta(a, b) {
    return a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
  }

  /** 今の構成と同じ入れ替えのプラン（なければ null） */
  function matchingPlan(deck, config, plans) {
    const d = configDiff(deck, config);
    const now = deltaMap(d.in, d.out);
    if (now.size === 0) return null;
    return plans.find((p) => sameDelta(deltaMap(p.in, p.out), now)) || null;
  }

  const cleanList = (list) => (list || []).map((e) => ({ count: e.count, name: e.name }));

  /** 書き出し用の JSON（今のデッキの分） */
  function exportPlansJSON(deckName, plans) {
    return JSON.stringify({
      format: FORMAT,
      version: VERSION,
      plans: plans.map((p) => ({ deck: deckName, name: p.name, in: cleanList(p.in), out: cleanList(p.out) })),
    }, null, 2) + '\n';
  }

  /**
   * 読み込んだ JSON を確かめる
   * @returns {{plans: {deck, name, in, out}[]} | {error: string}}
   */
  function parsePlansJSON(text) {
    let data;
    try {
      data = JSON.parse(String(text).replace(/^﻿/, ''));
    } catch (e) {
      return { error: 'JSON として読み取れませんでした。', code: 'json' };
    }
    if (!data || typeof data !== 'object' || data.format !== FORMAT) {
      return { error: 'このアプリで書き出したサイドプランのファイルではありません。', code: 'format' };
    }
    if (data.version !== VERSION) return { error: `対応していない形式です（version ${data.version}）。`, code: 'version', params: { version: data.version } };
    if (!Array.isArray(data.plans)) return { error: 'plans が見つかりません。', code: 'plans' };

    const isText = (v) => typeof v === 'string' && v.trim() !== '';
    const isCards = (list) => Array.isArray(list) && list.every((e) =>
      e && Number.isInteger(e.count) && e.count > 0 && isText(e.name));
    const plans = [];
    for (let i = 0; i < data.plans.length; i++) {
      const p = data.plans[i];
      const where = `${i + 1}件目`;
      if (!p || !isText(p.deck)) return { error: `${where}：デッキ名（deck）がありません。`, code: 'deck', params: { i: i + 1 } };
      if (!isText(p.name)) return { error: `${where}：プラン名（name）がありません。`, code: 'name', params: { i: i + 1 } };
      if (!isCards(p.in || []) || !isCards(p.out || [])) {
        return { error: `${where}（${p.name}）：in / out は [{"count": 枚数, "name": "カード名"}] の形にしてください。`, code: 'cards', params: { i: i + 1, name: p.name } };
      }
      plans.push({ deck: p.deck.trim(), name: p.name.trim(), in: cleanList(p.in), out: cleanList(p.out) });
    }
    return { plans };
  }

  const api = { SIDEPLAN_FORMAT: FORMAT, planFromConfig, applyPlan, matchingPlan, exportPlansJSON, parsePlansJSON };

  if (isNode) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
