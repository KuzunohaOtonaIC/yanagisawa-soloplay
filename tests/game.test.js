const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, shuffle, expandDeck } = require('../js/game.js');

const deck = {
  name: 'Test',
  main: [
    { count: 4, name: 'Ancient Tomb' },
    { count: 56, name: 'Mountain' },
  ],
  side: [{ count: 15, name: 'Sideboard Card' }],
};

test('手札7枚・ライブラリー53枚、サイドは含まない', () => {
  const g = createGame(deck);
  assert.equal(g.hand.length, 7);
  assert.equal(g.library.length, 53);
  assert.equal(g.battlefield.length, 0);
  const all = [...g.hand, ...g.library];
  assert.equal(new Set(all.map((c) => c.iid)).size, 60);
  assert.equal(all.filter((c) => c.name === 'Ancient Tomb').length, 4);
  assert.ok(!all.some((c) => c.name === 'Sideboard Card'));
});

test('7枚未満のデッキは全部手札になる', () => {
  const g = createGame({ name: 'tiny', main: [{ count: 3, name: 'Island' }], side: [] });
  assert.equal(g.hand.length, 3);
  assert.equal(g.library.length, 0);
});

test('シャッフルは要素を保ち、位置の偏りがない', () => {
  const n = 5;
  const trials = 50000;
  const counts = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let t = 0; t < trials; t++) {
    const a = shuffle([0, 1, 2, 3, 4]);
    assert.deepEqual([...a].sort(), [0, 1, 2, 3, 4]);
    a.forEach((v, pos) => counts[v][pos]++);
  }
  const expected = trials / n;
  counts.flat().forEach((c) => assert.ok(Math.abs(c - expected) < expected * 0.05, `偏り: ${c}`));
});

test('expandDeck は枚数分のカードを作る', () => {
  assert.equal(expandDeck(deck.main).length, 60);
});

const { playFromHand, draw, tutor, nextTurn } = require('../js/game.js');

function total(g) {
  return g.hand.length + g.library.length + g.battlefield.length;
}

test('手札のカードを場に出す', () => {
  const g = createGame(deck);
  const target = g.hand[2];
  assert.equal(playFromHand(g, target.iid), target);
  assert.equal(g.hand.length, 6);
  assert.deepEqual(g.battlefield, [target]);
  assert.ok(!g.hand.includes(target));
  assert.equal(playFromHand(g, target.iid), null); // もう手札にない
  assert.equal(total(g), 60);
});

test('ドローはライブラリーの一番上を手札の最後に加える', () => {
  const g = createGame(deck);
  const top = g.library[0];
  const second = g.library[1];
  assert.equal(draw(g), top);
  assert.equal(g.hand[g.hand.length - 1], top);
  assert.equal(g.library[0], second);
  assert.equal(g.hand.length, 8);
  assert.equal(g.library.length, 52);
});

test('ライブラリーが空ならドローできない', () => {
  const g = createGame({ name: 'tiny', main: [{ count: 8, name: 'Island' }], side: [] });
  assert.ok(draw(g));
  assert.equal(draw(g), null);
  assert.equal(g.hand.length, 8);
});

test('ライブラリーから手札に加えるとライブラリーがシャッフルされる', () => {
  const g = createGame(deck);
  const target = g.library[30];
  const rest = g.library.filter((c) => c !== target).map((c) => c.iid);
  assert.equal(tutor(g, target.iid), target);
  assert.equal(g.hand[g.hand.length - 1], target);
  assert.equal(g.library.length, 52);
  const after = g.library.map((c) => c.iid);
  assert.deepEqual([...after].sort((a, b) => a - b), [...rest].sort((a, b) => a - b)); // 同じカード
  assert.equal(total(g), 60);
  assert.equal(tutor(g, target.iid), null);
});

test('シャッフル後の並びは毎回変わる（52枚が元の順のままになる確率は事実上0）', () => {
  let unchanged = 0;
  for (let i = 0; i < 20; i++) {
    const g = createGame(deck);
    const before = g.library.map((c) => c.iid).filter((id) => id !== g.library[0].iid);
    tutor(g, g.library[0].iid);
    if (JSON.stringify(before) === JSON.stringify(g.library.map((c) => c.iid))) unchanged++;
  }
  assert.equal(unchanged, 0);
});

test('次のターンでターン数が増えて1枚引く', () => {
  const g = createGame(deck);
  assert.equal(g.turn, 1);
  const top = g.library[0];
  assert.equal(nextTurn(g), top);
  assert.equal(g.turn, 2);
  assert.equal(g.hand.length, 8);
});

const {
  mulligan, keep, toggleBottom, confirmBottom, bottomCount, canMulligan,
  toggleTap, moveFromBattlefield, cloneGame, totalCards,
} = require('../js/game.js');

test('マリガン0回なら、そのままプレイ操作をすればキープ扱い', () => {
  const g = createGame(deck);
  assert.equal(g.phase, 'opening');
  assert.ok(canMulligan(g));
  draw(g);
  assert.equal(g.phase, 'play');
  assert.ok(!canMulligan(g));
  assert.equal(mulligan(g), false);
});

test('ロンドン・マリガン：7枚引き直し、キープ後に回数分をライブラリーの下へ', () => {
  const g = createGame(deck);
  assert.ok(mulligan(g));
  assert.ok(mulligan(g));
  assert.equal(g.mulligans, 2);
  assert.equal(g.hand.length, 7);
  assert.equal(g.library.length, 53);
  assert.equal(totalCards(g), 60);

  // キープ前はプレイ操作できない
  assert.equal(draw(g), null);
  assert.equal(playFromHand(g, g.hand[0].iid), null);

  assert.ok(keep(g));
  assert.equal(g.phase, 'bottom');
  assert.equal(bottomCount(g), 2);
  assert.equal(mulligan(g), false); // キープ後はマリガンできない
  assert.equal(draw(g), null);

  const [a, b, c] = g.hand;
  assert.ok(toggleBottom(g, b.iid));
  assert.ok(toggleBottom(g, c.iid));
  assert.equal(toggleBottom(g, a.iid), false); // 3枚目は選べない
  assert.ok(toggleBottom(g, c.iid)); // 選択を外す
  assert.ok(!confirmBottom(g)); // 1枚だけでは決定できない
  assert.ok(toggleBottom(g, a.iid));
  assert.ok(confirmBottom(g));

  assert.equal(g.phase, 'play');
  assert.equal(g.hand.length, 5);
  assert.deepEqual(g.library.slice(-2), [b, a]); // 選んだ順に一番下へ
  assert.equal(totalCards(g), 60);
});

test('マリガン1回でキープ', () => {
  const g = createGame(deck);
  mulligan(g);
  keep(g);
  const card = g.hand[3];
  toggleBottom(g, card.iid);
  confirmBottom(g);
  assert.equal(g.hand.length, 6);
  assert.equal(g.library[g.library.length - 1], card);
});

test('マリガンは7回まで（7回目は全部下に置く）', () => {
  const g = createGame(deck);
  for (let i = 0; i < 7; i++) assert.ok(mulligan(g));
  assert.equal(mulligan(g), false);
  keep(g);
  assert.equal(bottomCount(g), 7);
});

test('場のカードのタップ・墓地・手札・追放', () => {
  const g = createGame(deck);
  const [a, b, c] = g.hand;
  [a, b, c].forEach((x) => playFromHand(g, x.iid));
  assert.equal(toggleTap(g, a.iid).tapped, true);
  assert.equal(toggleTap(g, a.iid).tapped, false);
  toggleTap(g, a.iid);
  assert.equal(moveFromBattlefield(g, a.iid, 'graveyard'), a);
  assert.equal(a.tapped, undefined); // 場を離れたらタップ解除
  moveFromBattlefield(g, b.iid, 'exile');
  moveFromBattlefield(g, c.iid, 'hand');
  assert.deepEqual(g.graveyard, [a]);
  assert.deepEqual(g.exile, [b]);
  assert.equal(g.hand[g.hand.length - 1], c);
  assert.equal(g.battlefield.length, 0);
  assert.equal(moveFromBattlefield(g, c.iid, 'graveyard'), null); // 場にない
  assert.equal(moveFromBattlefield(g, c.iid, 'library'), null); // 不正な移動先
  assert.equal(totalCards(g), 60);
});

test('次のターンで場のカードがアンタップされる', () => {
  const g = createGame(deck);
  const a = g.hand[0];
  playFromHand(g, a.iid);
  toggleTap(g, a.iid);
  nextTurn(g);
  assert.equal(a.tapped, false);
});

test('cloneGame は独立したコピーを作る（元に戻す用）', () => {
  const g = createGame(deck);
  const snap = cloneGame(g);
  playFromHand(g, g.hand[0].iid);
  assert.equal(snap.hand.length, 7);
  assert.equal(snap.battlefield.length, 0);
  assert.equal(snap.phase, 'opening');
});

const { moveTo, findZone } = require('../js/game.js');

test('墓地・追放のカードを手札や場に戻す', () => {
  const g = createGame(deck);
  const [a, b] = g.hand;
  playFromHand(g, a.iid);
  playFromHand(g, b.iid);
  toggleTap(g, a.iid);
  moveFromBattlefield(g, a.iid, 'graveyard');
  moveFromBattlefield(g, b.iid, 'exile');

  assert.equal(moveTo(g, a.iid, 'battlefield'), a);
  assert.equal(findZone(g, a.iid), 'battlefield');
  assert.ok(!a.tapped); // 戻ってきたカードはアンタップ状態
  assert.equal(moveTo(g, b.iid, 'hand'), b);
  assert.equal(g.hand[g.hand.length - 1], b);
  assert.equal(g.graveyard.length + g.exile.length, 0);
  assert.equal(totalCards(g), 60);
});

test('カードをライブラリーの一番上・一番下に置く（シャッフルしない）', () => {
  const g = createGame(deck);
  const [a, b, c] = g.hand;
  const order = g.library.map((x) => x.iid);

  assert.equal(moveTo(g, a.iid, 'top'), a); // 手札 → 上
  assert.equal(g.library[0], a);
  assert.deepEqual(g.library.slice(1).map((x) => x.iid), order); // 残りの並びはそのまま

  playFromHand(g, b.iid);
  toggleTap(g, b.iid);
  moveTo(g, b.iid, 'bottom'); // 場 → 下
  assert.equal(g.library[g.library.length - 1], b);
  assert.equal(b.tapped, undefined);

  playFromHand(g, c.iid);
  moveFromBattlefield(g, c.iid, 'graveyard');
  moveTo(g, c.iid, 'top'); // 墓地 → 上
  assert.equal(g.library[0], c);
  assert.equal(draw(g), c); // 次のドローで引く

  // ライブラリーの中で：一番上を一番下へ（占術）
  const top = g.library[0];
  moveTo(g, top.iid, 'bottom');
  assert.equal(g.library[g.library.length - 1], top);
  // ライブラリーの途中のカードを一番上へ
  const mid = g.library[10];
  moveTo(g, mid.iid, 'top');
  assert.equal(g.library[0], mid);
  assert.equal(totalCards(g), 60);
});

test('moveTo の不正な移動は何もしない', () => {
  const g = createGame(deck);
  const a = g.hand[0];
  assert.equal(moveTo(g, a.iid, 'hand'), null); // 同じ場所
  assert.equal(moveTo(g, a.iid, 'library'), null); // 上か下を指定する
  assert.equal(moveTo(g, 99999, 'top'), null); // 存在しないカード
  mulligan(g);
  assert.equal(moveTo(g, g.hand[0].iid, 'top'), null); // キープ前は動かせない
  assert.equal(totalCards(g), 60);
});

const { reorderBattlefield } = require('../js/game.js');

test('場のカードの並べ替え', () => {
  const g = createGame(deck);
  const [a, b, c, d] = g.hand;
  [a, b, c, d].forEach((x) => playFromHand(g, x.iid));
  toggleTap(g, b.iid);
  const order = () => g.battlefield.map((x) => x.iid);

  assert.equal(reorderBattlefield(g, d.iid, a.iid), d); // d を a の前（一番左）へ
  assert.deepEqual(order(), [d.iid, a.iid, b.iid, c.iid]);
  assert.equal(reorderBattlefield(g, d.iid, null), d); // 一番右へ
  assert.deepEqual(order(), [a.iid, b.iid, c.iid, d.iid]);
  assert.equal(reorderBattlefield(g, a.iid, c.iid), a); // 右へ動かす：c の直前
  assert.deepEqual(order(), [b.iid, a.iid, c.iid, d.iid]);
  assert.equal(b.tapped, true); // タップ状態はそのまま

  assert.equal(reorderBattlefield(g, a.iid, c.iid), null); // すでにその位置
  assert.equal(reorderBattlefield(g, a.iid, a.iid), null); // 自分の前
  assert.equal(reorderBattlefield(g, 99999, a.iid), null); // 場にないカード
  assert.equal(reorderBattlefield(g, a.iid, 99999), null); // 落とし先が場にない
  assert.equal(totalCards(g), 60);
});

const { addCounter } = require('../js/game.js');

test('ゲーム中のサイドボード：渡せば持ち、手札に加えられる（通し番号はメインの続き）', () => {
  const g = createGame({ name: 'x', main: deck.main, sideboard: [{ count: 2, name: 'Wish Target' }] });
  assert.equal(g.sideboard.length, 2);
  assert.deepEqual(g.sideboard.map((c) => c.iid), [61, 62]);
  assert.equal(totalCards(g), 62);
  const card = moveTo(g, 61, 'hand');
  assert.equal(card.name, 'Wish Target');
  assert.equal(g.hand[g.hand.length - 1], card);
  assert.equal(g.sideboard.length, 1);
  assert.equal(findZone(g, 61), 'hand');
  assert.equal(totalCards(g), 62);
  // サイドボードは移動先にはならない、マリガンの対象でもない
  assert.equal(moveTo(g, g.hand[0].iid, 'sideboard'), null);
  const g2 = createGame({ name: 'x', main: deck.main, sideboard: [{ count: 1, name: 'Wish Target' }] });
  mulligan(g2);
  assert.equal(g2.sideboard.length, 1);
  assert.equal(g2.hand.length + g2.library.length, 60);
  // 渡さなければ空
  assert.deepEqual(createGame(deck).sideboard, []);
});

test('カウンター：増やす・減らす（0より下にはしない）、場を離れたら消える', () => {
  const g = createGame(deck);
  const a = g.hand[0];
  playFromHand(g, a.iid);
  assert.equal(addCounter(g, a.iid, 1), a);
  addCounter(g, a.iid, 1);
  assert.equal(a.counters, 2);
  addCounter(g, a.iid, -1);
  assert.equal(a.counters, 1);
  addCounter(g, a.iid, -1);
  assert.equal(a.counters, undefined);
  assert.equal(addCounter(g, a.iid, -1), null); // 0 のまま
  assert.equal(addCounter(g, g.hand[0].iid, 1), null); // 場にないカード
  addCounter(g, a.iid, 1); addCounter(g, a.iid, 1); toggleTap(g, a.iid);
  moveTo(g, a.iid, 'graveyard');
  assert.equal(a.counters, undefined);
  assert.equal(a.tapped, undefined);
  moveTo(g, a.iid, 'battlefield');
  assert.equal(a.counters, undefined); // 戻ってきてもリセットのまま
});
