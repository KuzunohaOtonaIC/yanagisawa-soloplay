/*
 * ゲーム状態（DOM に依存しない）
 *
 * game = {
 *   deckName, turn,
 *   hand, library, battlefield, graveyard, exile: Card[],
 *   phase: 'opening' | 'bottom' | 'play',
 *   mulligans: number,          マリガンした回数
 *   bottomSelection: number[],  ロンドン・マリガンでライブラリーの下に置くカード（選んだ順）
 * }
 * Card = { iid: number, name: string, tapped?: boolean }   iid は同名カードを区別するための通し番号
 * library[0] がライブラリーの一番上
 *
 * 流れ:
 *   opening … 初手。マリガンできる。マリガン0回ならそのままプレイ操作をすればキープ扱い。
 *             マリガン1回以上ならキープ → bottom へ
 *   bottom  … マリガンした回数分のカードを手札からライブラリーの下へ
 *   play    … プレイ中
 */
(function (root) {
  'use strict';

  const HAND_SIZE = 7;
  /** sideboard はゲーム中のサイドボード（そこから手札に加えるカードがあるため）。マリガンなどの対象ではない */
  const ZONES = ['hand', 'library', 'battlefield', 'graveyard', 'exile', 'sideboard'];
  /** moveTo の移動先（top / bottom はライブラリーの一番上・一番下） */
  const MOVE_TARGETS = ['hand', 'battlefield', 'graveyard', 'exile', 'top', 'bottom'];

  /** 0 以上 n 未満の一様乱数（crypto があれば使う） */
  function randomInt(n) {
    const c = root.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const limit = Math.floor(0x100000000 / n) * n; // 剰余の偏りを避ける
      const buf = new Uint32Array(1);
      do { c.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  /** Fisher–Yates シャッフル（配列をその場で並べ替えて返す） */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** メインデッキを1枚ずつのカード配列に展開 */
  function expandDeck(main) {
    const cards = [];
    let iid = 0;
    main.forEach((entry) => {
      for (let i = 0; i < entry.count; i++) cards.push({ iid: ++iid, name: entry.name });
    });
    return cards;
  }

  function drawOpeningHand(game) {
    game.hand = game.library.splice(0, Math.min(HAND_SIZE, game.library.length));
  }

  /**
   * deck = { name, main, sideboard? }。sideboard を渡すと、ゲーム中にサイドボードのカードを手札に加えられる
   * （サイドボードのカードの通し番号はメインの続き）
   */
  function createGame(deck) {
    const main = expandDeck(deck.main);
    const sideboard = expandDeck(deck.sideboard || []).map((c) => ({ ...c, iid: c.iid + main.length }));
    const game = {
      deckName: deck.name,
      turn: 1,
      hand: [],
      library: shuffle(main),
      battlefield: [],
      graveyard: [],
      exile: [],
      sideboard,
      phase: 'opening',
      mulligans: 0,
      bottomSelection: [],
    };
    drawOpeningHand(game);
    return game;
  }

  /** 元に戻す用のコピー */
  function cloneGame(game) {
    return JSON.parse(JSON.stringify(game));
  }

  function totalCards(game) {
    return ZONES.reduce((sum, z) => sum + game[z].length, 0);
  }

  // ---------- マリガン ----------

  /** ライブラリーの下に置く枚数 */
  function bottomCount(game) {
    return Math.min(game.mulligans, game.hand.length);
  }

  function canMulligan(game) {
    return game.phase === 'opening' && game.mulligans < HAND_SIZE;
  }

  /** 手札をライブラリーに戻してシャッフルし、7枚引き直す */
  function mulligan(game) {
    if (!canMulligan(game)) return false;
    game.library.push(...game.hand);
    game.hand = [];
    shuffle(game.library);
    drawOpeningHand(game);
    game.mulligans += 1;
    return true;
  }

  /** キープ。マリガンしていればライブラリーの下に置くカードを選ぶ段階へ */
  function keep(game) {
    if (game.phase !== 'opening') return false;
    game.bottomSelection = [];
    game.phase = bottomCount(game) > 0 ? 'bottom' : 'play';
    return true;
  }

  /** ライブラリーの下に置くカードを選ぶ／選択を外す */
  function toggleBottom(game, iid) {
    if (game.phase !== 'bottom' || !game.hand.some((c) => c.iid === iid)) return false;
    const i = game.bottomSelection.indexOf(iid);
    if (i >= 0) {
      game.bottomSelection.splice(i, 1);
    } else {
      if (game.bottomSelection.length >= bottomCount(game)) return false;
      game.bottomSelection.push(iid);
    }
    return true;
  }

  /** 選んだカードを選んだ順にライブラリーの一番下へ置き、プレイ開始 */
  function confirmBottom(game) {
    if (game.phase !== 'bottom' || game.bottomSelection.length !== bottomCount(game)) return false;
    game.bottomSelection.forEach((iid) => {
      const i = game.hand.findIndex((c) => c.iid === iid);
      game.library.push(...game.hand.splice(i, 1));
    });
    game.bottomSelection = [];
    game.phase = 'play';
    return true;
  }

  /** プレイ操作ができるか。マリガン0回の初手ならキープ扱いにしてプレイ開始 */
  function beginPlay(game) {
    if (game.phase === 'opening' && game.mulligans === 0) game.phase = 'play';
    return game.phase === 'play';
  }

  // ---------- カードの移動 ----------

  /** from から iid のカードを取り除いて to の末尾に置く。見つからなければ null */
  function moveCard(from, to, iid) {
    const i = from.findIndex((c) => c.iid === iid);
    if (i < 0) return null;
    const [card] = from.splice(i, 1);
    to.push(card);
    return card;
  }

  /** 手札のカードを場に出す */
  function playFromHand(game, iid) {
    if (!beginPlay(game)) return null;
    return moveCard(game.hand, game.battlefield, iid);
  }

  /** ライブラリーの一番上を1枚引く。ライブラリーが空なら null */
  function draw(game) {
    if (!beginPlay(game) || game.library.length === 0) return null;
    const card = game.library.shift();
    game.hand.push(card);
    return card;
  }

  /** ライブラリーから指定のカードを手札に加え、ライブラリーをシャッフルする */
  function tutor(game, iid) {
    if (!beginPlay(game)) return null;
    const card = moveCard(game.library, game.hand, iid);
    if (card) shuffle(game.library);
    return card;
  }

  /** 次のターンへ進む：場のカードをすべてアンタップし、1枚引く */
  function nextTurn(game) {
    if (!beginPlay(game)) return null;
    game.turn += 1;
    game.battlefield.forEach((c) => { c.tapped = false; });
    return draw(game);
  }

  /** 場のカードをタップ／アンタップ */
  function toggleTap(game, iid) {
    const card = game.battlefield.find((c) => c.iid === iid);
    if (!card) return null;
    card.tapped = !card.tapped;
    return card;
  }

  /** iid のカードがある場所（見つからなければ null） */
  function findZone(game, iid) {
    return ZONES.find((z) => game[z].some((c) => c.iid === iid)) || null;
  }

  /**
   * カードをどこからでも移動する
   * to: 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'top'（ライブラリーの一番上） | 'bottom'（ライブラリーの一番下）
   * 場を離れたカードはタップ状態を解除。ライブラリーの中で上・下へ動かすこともできる（シャッフルはしない）
   */
  function moveTo(game, iid, to) {
    const from = findZone(game, iid);
    if (!from) return null;
    const toLibrary = to === 'top' || to === 'bottom';
    if (!MOVE_TARGETS.includes(to)) return null;
    const zone = toLibrary ? 'library' : to;
    if (zone === from && !toLibrary) return null;
    if (!beginPlay(game)) return null; // 移動できると分かってから（初手ならキープ扱い）

    const i = game[from].findIndex((c) => c.iid === iid);
    const [card] = game[from].splice(i, 1);
    if (from === 'battlefield') { delete card.tapped; delete card.counters; } // 場を離れたらタップとカウンターは消える
    if (to === 'top') game.library.unshift(card);
    else game[zone].push(card);
    return card;
  }

  /**
   * 場のカードの並べ替え：iid のカードを beforeIid のカードの直前へ（beforeIid が null なら一番右へ）
   * 並びが変わらなければ null
   */
  function reorderBattlefield(game, iid, beforeIid) {
    const list = game.battlefield;
    const from = list.findIndex((c) => c.iid === iid);
    if (from < 0 || iid === beforeIid) return null;
    if (beforeIid != null && !list.some((c) => c.iid === beforeIid)) return null;
    const before = list.map((c) => c.iid).join(',');
    const [card] = list.splice(from, 1);
    const to = beforeIid == null ? list.length : list.findIndex((c) => c.iid === beforeIid);
    list.splice(to, 0, card);
    if (list.map((c) => c.iid).join(',') === before) return null;
    return card;
  }

  /** 場のカードのカウンターを増やす／減らす（0 より下にはしない）。変わらなければ null */
  function addCounter(game, iid, delta) {
    const card = game.battlefield.find((c) => c.iid === iid);
    if (!card) return null;
    const next = Math.max(0, (card.counters || 0) + delta);
    if (next === (card.counters || 0)) return null;
    if (next === 0) delete card.counters;
    else card.counters = next;
    return card;
  }

  /** 場のカードを手札・墓地・追放へ移す（タップ状態は解除） */
  function moveFromBattlefield(game, iid, zone) {
    if (!['hand', 'graveyard', 'exile'].includes(zone) || findZone(game, iid) !== 'battlefield') return null;
    return moveTo(game, iid, zone);
  }

  const api = {
    HAND_SIZE, createGame, cloneGame, totalCards, shuffle, expandDeck, randomInt,
    bottomCount, canMulligan, mulligan, keep, toggleBottom, confirmBottom,
    playFromHand, draw, tutor, nextTurn, toggleTap, moveFromBattlefield, moveTo, findZone, reorderBattlefield, addCounter,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
