const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyType, sortEntries, groupByCategory } = require('../js/cards.js');

test('type_line からカード種類を判定する', () => {
  assert.equal(classifyType('Land'), 'land');
  assert.equal(classifyType('Basic Land — Mountain'), 'land');
  assert.equal(classifyType('Land Creature — Forest Dryad'), 'land');
  assert.equal(classifyType('Artifact Creature — Golem'), 'creature');
  assert.equal(classifyType('Legendary Planeswalker — Karn'), 'planeswalker');
  assert.equal(classifyType('Instant // Instant'), 'instant');
  assert.equal(classifyType('Enchantment — Saga // Enchantment Creature — Goblin Shaman'), 'enchantment');
  assert.equal(classifyType('Creature — Human Knight // Sorcery — Adventure'), 'creature');
  assert.equal(classifyType('Sorcery // Land'), 'sorcery');
  assert.equal(classifyType('Artifact'), 'artifact');
  assert.equal(classifyType('Kindred Instant — Goblin'), 'instant');
  assert.equal(classifyType('Conspiracy'), 'other');
  assert.equal(classifyType(''), 'unknown');
});

const info = {
  'Ancient Tomb': { name: 'Ancient Tomb', jaName: '古えの墳墓', category: 'land', cmc: 0 },
  'Chalice of the Void': { name: 'Chalice of the Void', jaName: '虚空の杯', category: 'artifact', cmc: 0 },
  'Goblin Rabblemaster': { name: 'Goblin Rabblemaster', jaName: 'ゴブリンの熟練扇動者', category: 'creature', cmc: 3 },
  'Magus of the Moon': { name: 'Magus of the Moon', jaName: '月の大魔術師', category: 'creature', cmc: 3 },
  'Simian Spirit Guide': { name: 'Simian Spirit Guide', jaName: '猿人の指導霊', category: 'creature', cmc: 3 },
  'Mox Diamond': { name: 'Mox Diamond', jaName: null, category: 'artifact', cmc: 0 },
};
const entries = Object.keys(info).concat(['Typo Card']).map((name) => ({ count: 1, name }));
const get = (n) => info[n] || null;
const names = (sorted) => sorted.map((x) => x.entry.name);

test('カード種類でソート（種類 → マナ総量 → 英語名）、取得できていないカードは最後', () => {
  const sorted = sortEntries(entries, 'type', get);
  assert.deepEqual(names(sorted), [
    'Goblin Rabblemaster', 'Magus of the Moon', 'Simian Spirit Guide',
    'Chalice of the Void', 'Mox Diamond', 'Ancient Tomb', 'Typo Card',
  ]);
  assert.deepEqual(groupByCategory(sorted).map((g) => [g.label, g.count]),
    [['クリーチャー', 3], ['アーティファクト', 2], ['土地', 1], ['種類不明', 1]]);
});

test('英語名でソート', () => {
  assert.deepEqual(names(sortEntries(entries, 'en', get)), [
    'Ancient Tomb', 'Chalice of the Void', 'Goblin Rabblemaster', 'Magus of the Moon',
    'Mox Diamond', 'Simian Spirit Guide', 'Typo Card',
  ]);
});

test('日本語名でソート（仮名は五十音順、日本語名がなければ英語名）', () => {
  const sorted = names(sortEntries(entries, 'ja', get));
  assert.ok(sorted.indexOf('Goblin Rabblemaster') < sorted.indexOf('Ancient Tomb')); // ゴ… は漢字より前
  assert.ok(sorted.indexOf('Mox Diamond') < sorted.indexOf('Goblin Rabblemaster')); // 英字は仮名より前
});
