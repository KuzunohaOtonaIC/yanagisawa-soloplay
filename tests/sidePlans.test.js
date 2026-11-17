const test = require('node:test');
const assert = require('node:assert/strict');
const { planFromConfig, applyPlan, matchingPlan, exportPlansJSON, parsePlansJSON } = require('../js/sidePlans.js');
const { createConfig, moveOne, configCounts, isOriginal } = require('../js/sideboard.js');
const { parseDeckList } = require('../js/parser.js');

const deck = Object.assign(parseDeckList(`4 Defense Grid
4 Force of Will
52 Island

SIDEBOARD:
4 Rest in Peace
4 Force of Will
2 Pyroblast
`), { name: '柳澤流呪術唱専' });

function vsHogaak() {
  const c = createConfig(deck);
  moveOne(c, 'Rest in Peace', 'main'); moveOne(c, 'Rest in Peace', 'main');
  moveOne(c, 'Defense Grid', 'side'); moveOne(c, 'Defense Grid', 'side');
  return c;
}

test('入れ替えた構成をプラン（元のリストとの差分）にする', () => {
  const plan = planFromConfig(deck, vsHogaak(), 'vsホガーク');
  assert.deepEqual(plan, {
    name: 'vsホガーク',
    in: [{ count: 2, name: 'Rest in Peace' }],
    out: [{ count: 2, name: 'Defense Grid' }],
  });
});

test('プランを選ぶと元のリストから反映される（何度選んでも同じ）', () => {
  const plan = planFromConfig(deck, vsHogaak(), 'vsホガーク');
  const r1 = applyPlan(deck, plan);
  assert.deepEqual(r1.skipped, []);
  assert.deepEqual(configCounts(r1.config), { main: 60, side: 10 });
  assert.equal(r1.config.main.find((e) => e.name === 'Rest in Peace').count, 2);
  assert.equal(r1.config.main.find((e) => e.name === 'Defense Grid').count, 2);
  const r2 = applyPlan(deck, plan);
  assert.deepEqual(r2.config, r1.config);
  assert.ok(!isOriginal(deck, r1.config));
});

test('デッキリストが変わっていて動かせないカードは skipped に入る', () => {
  const plan = { name: 'x', in: [{ count: 6, name: 'Rest in Peace' }, { count: 1, name: 'Lightning Bolt' }], out: [{ count: 7, name: 'Island' }] };
  const { config, skipped } = applyPlan(deck, plan);
  assert.deepEqual(skipped, [
    { name: 'Rest in Peace', count: 2, to: 'main' }, // サイドに4枚しかない
    { name: 'Lightning Bolt', count: 1, to: 'main' }, // デッキにない
  ]);
  assert.equal(config.main.find((e) => e.name === 'Rest in Peace').count, 4);
});

test('今の構成と一致するプランを探す（手で変えたら一致しない）', () => {
  const plans = [
    { name: 'vsLO', in: [{ count: 2, name: 'Pyroblast' }], out: [{ count: 2, name: 'Island' }] },
    planFromConfig(deck, vsHogaak(), 'vsホガーク'),
  ];
  const c = vsHogaak();
  assert.equal(matchingPlan(deck, c, plans).name, 'vsホガーク');
  moveOne(c, 'Island', 'side');
  assert.equal(matchingPlan(deck, c, plans), null);
  moveOne(c, 'Island', 'main');
  assert.equal(matchingPlan(deck, c, plans).name, 'vsホガーク');
  assert.equal(matchingPlan(deck, createConfig(deck), plans), null); // 元のリスト
});

test('JSON に書き出して読み込むと元に戻る', () => {
  const plans = [planFromConfig(deck, vsHogaak(), 'vsホガーク'), { name: 'vsLO', in: [{ count: 2, name: 'Pyroblast' }], out: [{ count: 2, name: 'Island' }], id: 'x', builtin: true }];
  const text = exportPlansJSON(deck.name, plans);
  const data = JSON.parse(text);
  assert.equal(data.format, 'yanagisawa-soloplay-sideplans');
  assert.equal(data.version, 1);
  assert.ok(!('id' in data.plans[1]) && !('builtin' in data.plans[1])); // 中身だけを書き出す
  const parsed = parsePlansJSON('﻿' + text);
  assert.deepEqual(parsed.plans, plans.map((p) => ({ deck: deck.name, name: p.name, in: p.in, out: p.out })));
});

test('不正な JSON は分かりやすいエラーで拒否する', () => {
  assert.match(parsePlansJSON('{oops').error, /JSON として読み取れません/);
  assert.match(parsePlansJSON('{"plans": []}').error, /サイドプランのファイルではありません/);
  const base = { format: 'yanagisawa-soloplay-sideplans', version: 1 };
  assert.match(parsePlansJSON(JSON.stringify({ ...base, version: 2, plans: [] })).error, /version 2/);
  assert.match(parsePlansJSON(JSON.stringify({ ...base, plans: [{ name: 'a', in: [], out: [] }] })).error, /1件目：デッキ名/);
  assert.match(parsePlansJSON(JSON.stringify({ ...base, plans: [{ deck: 'd', in: [], out: [] }] })).error, /プラン名/);
  assert.match(parsePlansJSON(JSON.stringify({ ...base, plans: [{ deck: 'd', name: 'a', in: [{ count: 0, name: 'X' }], out: [] }] })).error, /in \/ out は/);
  assert.deepEqual(parsePlansJSON(JSON.stringify({ ...base, plans: [] })).plans, []);
});

test('不正な JSON のエラーには code が付く（画面側で言語に合わせて表示）', () => {
  assert.equal(parsePlansJSON('{oops').code, 'json');
  assert.equal(parsePlansJSON('{"plans": []}').code, 'format');
  const base = { format: 'yanagisawa-soloplay-sideplans', version: 1 };
  const r = parsePlansJSON(JSON.stringify({ ...base, plans: [{ deck: 'd', name: 'a', in: [{ count: 0, name: 'X' }], out: [] }] }));
  assert.equal(r.code, 'cards');
  assert.deepEqual(r.params, { i: 1, name: 'a' });
});
