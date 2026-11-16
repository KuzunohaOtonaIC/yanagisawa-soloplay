const test = require('node:test');
const assert = require('node:assert/strict');
const { presetDecks, defaultPreset, isPresetId, getPreset, presetSidePlans } = require('../js/presets.js');
const { countCards } = require('../js/parser.js');

test('組み込みデッキはすべて読み取りエラーなし、メイン60枚以上・サイド15枚', () => {
  const decks = presetDecks();
  assert.deepEqual(decks.map((d) => d.name), ['柳澤流呪術唱専', '柳澤流ホガーク(本人歌唱)', 'LO友の会会長作品']);
  decks.forEach((d) => {
    assert.deepEqual(d.errors, [], d.name);
    assert.ok(countCards(d.main) >= 60, `${d.name}: メイン ${countCards(d.main)}枚`);
    assert.equal(countCards(d.side), 15, d.name);
    assert.ok(isPresetId(d.id));
    assert.equal(getPreset(d.id), d);
  });
  assert.equal(countCards(getPreset('preset:jujutsu-shosen').main), 60);
  assert.equal(getPreset('preset:white-curse'), null); // 削除済み
  assert.equal(defaultPreset().name, '柳澤流呪術唱専');
  assert.equal(countCards(getPreset('preset:hogaak').main), 60);
  assert.equal(countCards(getPreset('preset:lo').main), 61);
  assert.ok(!isPresetId('d123'));
});

test('組み込みサイドプランの置き場所（今は空）', () => {
  presetDecks().forEach((d) => assert.ok(Array.isArray(d.sidePlans)));
  assert.deepEqual(presetSidePlans('柳澤流呪術唱専'), []);
  assert.deepEqual(presetSidePlans('存在しないデッキ'), []);
});
