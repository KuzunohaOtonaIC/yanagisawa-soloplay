const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDeckList, countCards, deckToText } = require('../js/parser.js');

test('MTGO形式のメインとサイドを読み込む', () => {
  const r = parseDeckList(`4 Ancient Tomb
4 City of Traitors
1 Fire // Ice

SIDEBOARD:
2 Leyline of the Void
`);
  assert.deepEqual(r.main, [
    { count: 4, name: 'Ancient Tomb' },
    { count: 4, name: 'City of Traitors' },
    { count: 1, name: 'Fire // Ice' },
  ]);
  assert.deepEqual(r.side, [{ count: 2, name: 'Leyline of the Void' }]);
  assert.deepEqual(r.errors, []);
});

test('Windows改行・4x表記・Arena形式の末尾・コメントに対応', () => {
  const r = parseDeckList('// comment\r\n4x Ancient Tomb\r\n2 Lightning Bolt (2XM) 129\r\nDeck\r\n1 Xenagos, the Reveler\r\nSideboard\r\n1 Pyroblast');
  assert.deepEqual(r.main, [
    { count: 4, name: 'Ancient Tomb' },
    { count: 2, name: 'Lightning Bolt' },
    { count: 1, name: 'Xenagos, the Reveler' },
  ]);
  assert.deepEqual(r.side, [{ count: 1, name: 'Pyroblast' }]);
});

test('同じカードは合算し、読めない行はエラーとして返す', () => {
  const r = parseDeckList('2 Ancient Tomb\nhello world\n2 ancient  tomb\n0 Island');
  assert.deepEqual(r.main, [{ count: 4, name: 'Ancient Tomb' }]);
  assert.deepEqual(r.errors.map((e) => e.line), [2, 4]);
});

test('deckToText で元の形式に戻せる', () => {
  const r = parseDeckList('4 Ancient Tomb\nSIDEBOARD:\n2 Leyline of the Void');
  const text = deckToText(r);
  assert.equal(text, '4 Ancient Tomb\n\nSIDEBOARD:\n2 Leyline of the Void');
  assert.deepEqual(parseDeckList(text).main, r.main);
  assert.equal(countCards(r.main), 4);
});
