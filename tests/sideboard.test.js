const test = require('node:test');
const assert = require('node:assert/strict');
const { createConfig, configCounts, moveOne, validateConfig, configDiff, isOriginal } = require('../js/sideboard.js');
const { parseDeckList } = require('../js/parser.js');
const { createGame, totalCards } = require('../js/game.js');

const deck = Object.assign(parseDeckList(`4 Force of Will
4 Brainstorm
1 Crypt Incursion
51 Island

SIDEBOARD:
3 Rest in Peace
1 Crypt Incursion
2 Pyroblast
`), { name: 'Test' });

test('元のリストから構成を作る（元のデッキは書き換えない）', () => {
  const c = createConfig(deck);
  assert.deepEqual(configCounts(c), { main: 60, side: 6 });
  moveOne(c, 'Force of Will', 'side');
  assert.equal(deck.main[0].count, 4);
  assert.deepEqual(configCounts(createConfig(deck)), { main: 60, side: 6 });
});

test('メイン ⇄ サイドへ1枚ずつ移す', () => {
  const c = createConfig(deck);
  assert.ok(moveOne(c, 'Rest in Peace', 'main'));
  assert.ok(moveOne(c, 'Rest in Peace', 'main'));
  assert.ok(moveOne(c, 'Force of Will', 'side'));
  assert.ok(moveOne(c, 'force of will', 'side')); // 大文字小文字は区別しない
  assert.deepEqual(configCounts(c), { main: 60, side: 6 });
  assert.equal(c.main.find((e) => e.name === 'Rest in Peace').count, 2);
  assert.equal(c.side.find((e) => e.name === 'Force of Will').count, 2);

  // メインとサイドの両方にあるカード
  assert.ok(moveOne(c, 'Crypt Incursion', 'main'));
  assert.equal(c.main.find((e) => e.name === 'Crypt Incursion').count, 2);
  assert.ok(!c.side.some((e) => e.name === 'Crypt Incursion')); // 0枚になったら一覧から消える

  assert.equal(moveOne(c, 'Crypt Incursion', 'main'), false); // サイドに残っていない
  assert.equal(moveOne(c, 'Lightning Bolt', 'side'), false); // メインにない
  assert.equal(moveOne(c, 'Island', 'library'), false); // 移し先が不正
});

test('枚数のルール：メイン60枚以上・サイド15枚以下（1対1でなくてよい）', () => {
  const c = createConfig(deck);
  assert.deepEqual(validateConfig(c), []);
  moveOne(c, 'Rest in Peace', 'main'); // メイン61・サイド5：OK
  assert.deepEqual(validateConfig(c), []);
  moveOne(c, 'Island', 'side');
  moveOne(c, 'Island', 'side'); // メイン59
  assert.match(validateConfig(c)[0], /メインが59枚です。60枚以上にしてください（あと1枚）/);

  const big = createConfig({ main: [{ count: 60, name: 'Island' }], side: [{ count: 15, name: 'Plains' }] });
  moveOne(big, 'Island', 'side'); // サイド16
  const problems = validateConfig(big);
  assert.equal(problems.length, 2);
  assert.match(problems[1], /サイドが16枚です。15枚以下にしてください（1枚多い）/);
});

test('元のリストとの差（IN・OUT）', () => {
  const c = createConfig(deck);
  assert.ok(isOriginal(deck, c));
  moveOne(c, 'Rest in Peace', 'main');
  moveOne(c, 'Rest in Peace', 'main');
  moveOne(c, 'Crypt Incursion', 'main');
  moveOne(c, 'Force of Will', 'side');
  moveOne(c, 'Force of Will', 'side');
  moveOne(c, 'Brainstorm', 'side');
  assert.deepEqual(configDiff(deck, c), {
    in: [{ count: 1, name: 'Crypt Incursion' }, { count: 2, name: 'Rest in Peace' }],
    out: [{ count: 2, name: 'Force of Will' }, { count: 1, name: 'Brainstorm' }],
  });
  assert.ok(!isOriginal(deck, c));
  // 戻せば差はなくなる
  moveOne(c, 'Rest in Peace', 'side'); moveOne(c, 'Rest in Peace', 'side'); moveOne(c, 'Crypt Incursion', 'side');
  moveOne(c, 'Force of Will', 'main'); moveOne(c, 'Force of Will', 'main'); moveOne(c, 'Brainstorm', 'main');
  assert.ok(isOriginal(deck, c));
});

test('サイド後の構成でゲームを作ると、メインの構成どおりのライブラリーになる', () => {
  const c = createConfig(deck);
  moveOne(c, 'Rest in Peace', 'main');
  moveOne(c, 'Rest in Peace', 'main');
  moveOne(c, 'Island', 'side');
  const g = createGame({ name: deck.name, main: c.main });
  const all = [...g.hand, ...g.library];
  assert.equal(totalCards(g), 61);
  assert.equal(all.filter((x) => x.name === 'Rest in Peace').length, 2);
  assert.equal(all.filter((x) => x.name === 'Island').length, 50);
  assert.equal(all.filter((x) => x.name === 'Pyroblast').length, 0);
});

const { configProblems } = require('../js/sideboard.js');

test('configProblems：言語に依存しない形で理由を返す', () => {
  const c = createConfig({ main: [{ count: 58, name: 'Island' }], side: [{ count: 17, name: 'Plains' }] });
  assert.deepEqual(configProblems(c), [
    { code: 'mainShort', main: 58, side: 17, n: 2 },
    { code: 'sideOver', main: 58, side: 17, n: 2 },
  ]);
  assert.deepEqual(configProblems(createConfig(deck)), []);
});
