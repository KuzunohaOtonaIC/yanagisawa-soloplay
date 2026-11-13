/* 画面の制御 */
(function () {
  'use strict';

  const MTG = window.MTG;
  const {
    parseDeckList, countCards, deckToText, DeckStore, Prefs, createGame,
    cardService, sortEntries, groupByCategory, categoryLabel, displayName, englishName,
  } = window.MTG;

  const $ = (id) => document.getElementById(id);
  const el = {
    deckView: $('deck-view'),
    gameView: $('game-view'),
    editorPanel: $('editor-panel'),
    fileInput: $('file-input'),
    deckName: $('deck-name'),
    deckText: $('deck-text'),
    saveBtn: $('save-btn'),
    clearBtn: $('clear-btn'),
    parseMessage: $('parse-message'),
    deckSelect: $('deck-select'),
    editBtn: $('edit-btn'),
    deleteBtn: $('delete-btn'),
    sortButtons: [...document.querySelectorAll('[data-sort]')],
    cardStatus: $('card-status'),
    deckDetail: $('deck-detail'),
    clearCacheBtn: $('clear-cache-btn'),
    startBtn: $('start-btn'),
    backBtn: $('back-btn'),
    restartBtn: $('restart-btn'),
    gameDeckName: $('game-deck-name'),
    hand: $('hand'),
    handCount: $('hand-count'),
    battlefield: $('battlefield'),
    battlefieldCount: $('battlefield-count'),
    library: $('library'),
    libraryCount: $('library-count'),
    turnCount: $('turn-count'),
    nextTurnBtn: $('next-turn-btn'),
    drawBtn: $('draw-btn'),
    drawLeft: $('draw-left'),
    gameToast: $('game-toast'),
    undoBtn: $('undo-btn'),
    mulliganBar: $('mulligan-bar'),
    mulliganText: $('mulligan-text'),
    mulliganBtn: $('mulligan-btn'),
    keepBtn: $('keep-btn'),
    bottomBtn: $('bottom-btn'),
    handHint: $('hand-hint'),
    graveyard: $('graveyard'),
    graveyardCount: $('graveyard-count'),
    exile: $('exile'),
    exileCount: $('exile-count'),
    cardPreview: $('card-preview'),
    imageMode: $('image-mode'),
    diagnoseBtn: $('diagnose-btn'),
    diagnoseResult: $('diagnose-result'),
  };

  let game = null;
  let sortMode = Prefs.get('sort', 'type');
  /** カード情報の取得状況: null | { deckId, phase, done, total } | { deckId, error } */
  let fetchState = null;

  /** 要素を作る小さなヘルパー（ユーザー入力は必ず文字列として入れる） */
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) Object.assign(node, props);
    children.flat().forEach((c) => {
      if (c != null && c !== false) node.append(c instanceof Node ? c : String(c));
    });
    return node;
  }

  function selectedDeck() {
    return el.deckSelect.value ? DeckStore.get(el.deckSelect.value) : null;
  }

  function deckCardNames(deck) {
    return [...deck.main, ...deck.side].map((e) => e.name);
  }

  // ---------- デッキの保存 ----------

  function showMessage(kind, title, lines) {
    el.parseMessage.className = 'message ' + kind;
    el.parseMessage.replaceChildren(h('div', null, title));
    if (lines && lines.length) {
      el.parseMessage.append(h('ul', null, lines.map((l) => h('li', null, l))));
    }
  }

  /**
   * テキストを解析して保存する
   * @returns {{status: 'saved'|'cancelled'|'empty', deck?, parsed}}
   */
  function saveDeckFromText(name, text) {
    const parsed = parseDeckList(text);
    if (parsed.main.length === 0) return { status: 'empty', parsed };
    if (DeckStore.findByName(name) && !confirm(`「${name}」はすでに保存されています。上書きしますか？`)) {
      return { status: 'cancelled', parsed };
    }
    const deck = DeckStore.save({ name, main: parsed.main, side: parsed.side });
    return { status: 'saved', deck, parsed };
  }

  function savedSummary(deck) {
    return `「${deck.name}」を保存しました（メイン ${countCards(deck.main)}枚 / サイド ${countCards(deck.side)}枚）。`;
  }

  function errorLines(parsed, prefix = '') {
    return parsed.errors.map((e) => `${prefix}${e.line}行目: ${e.text}`);
  }

  function onSave() {
    const name = el.deckName.value.trim();
    if (!name) {
      showMessage('warn', 'デッキ名を入力してください。');
      el.deckName.focus();
      return;
    }
    const result = saveDeckFromText(name, el.deckText.value);
    if (result.status === 'empty') {
      showMessage('warn', 'メインデッキのカードが読み取れませんでした。「4 Ancient Tomb」の形式で入力してください。',
        errorLines(result.parsed).slice(0, 10));
      return;
    }
    if (result.status === 'cancelled') return;

    renderDeckSelect(result.deck.id);
    if (result.parsed.errors.length) {
      showMessage('warn', savedSummary(result.deck) + ' 次の行は読み取れなかったため無視しました:', errorLines(result.parsed));
    } else {
      showMessage('ok', savedSummary(result.deck));
    }
  }

  // ---------- txt ファイルの読み込み ----------

  /** UTF-8（BOMあり/なし）、UTF-16、Shift_JIS のテキストを読む */
  async function readTextFile(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
    if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch (e) {
      return new TextDecoder('shift_jis').decode(buf);
    }
  }

  function deckNameFromFile(file) {
    return file.name.replace(/\.[^.]+$/, '').trim() || file.name;
  }

  async function loadFiles(fileList) {
    const files = [...fileList].filter((f) => /\.txt$/i.test(f.name) || f.type === 'text/plain');
    if (files.length === 0) {
      showMessage('warn', 'txt ファイルを選んでください。');
      return;
    }

    const okLines = [];
    const warnLines = [];
    let lastDeck = null;
    for (const file of files) {
      const name = deckNameFromFile(file);
      let text;
      try {
        text = await readTextFile(file);
      } catch (e) {
        warnLines.push(`${file.name}: 読み込めませんでした`);
        continue;
      }
      const result = saveDeckFromText(name, text);
      if (result.status === 'empty') {
        warnLines.push(`${file.name}: カードが読み取れませんでした`);
        continue;
      }
      if (result.status === 'cancelled') continue;

      lastDeck = result.deck;
      okLines.push(savedSummary(result.deck));
      warnLines.push(...errorLines(result.parsed, `${file.name} `).map((l) => l + '（無視しました）'));
      if (files.length === 1) {
        el.deckName.value = name;
        el.deckText.value = text.replace(/^﻿/, '');
      }
    }

    if (lastDeck) renderDeckSelect(lastDeck.id);
    if (warnLines.length) {
      showMessage('warn', okLines.join(' ') || '保存できたデッキはありません。', warnLines);
    } else if (okLines.length) {
      showMessage('ok', okLines.join(' '));
    }
  }

  // ---------- デッキ一覧 ----------

  function renderDeckSelect(selectId) {
    const decks = DeckStore.list().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    el.deckSelect.replaceChildren();
    if (decks.length === 0) {
      el.deckSelect.append(h('option', { value: '', textContent: '（保存済みデッキはありません）' }));
    } else {
      decks.forEach((d) => {
        el.deckSelect.append(h('option', { value: d.id, textContent: `${d.name}（${countCards(d.main)}枚）` }));
      });
      el.deckSelect.value = decks.some((d) => d.id === selectId) ? selectId : decks[0].id;
    }
    onDeckSelected();
  }

  function cardLine(item, showType) {
    const { entry, info } = item;
    const ja = info && info.jaName;
    return h('li', { title: info ? info.typeLine : '' },
      h('span', { className: 'qty' }, entry.count),
      h('span', { className: 'name' }, displayName(entry, info)),
      ja && h('span', { className: 'en' }, englishName(entry, info)),
      showType && h('span', { className: 'type-tag' }, categoryLabel(info && info.category)));
  }

  function renderCardSection(title, list) {
    if (!list.length) return [];
    const sorted = sortEntries(list, sortMode, (n) => cardService.get(n));
    const header = h('h4', null, title, ' ', h('span', { className: 'count' }, `(${countCards(list)})`));

    if (sortMode !== 'type') {
      return [header, h('ul', { className: 'deck-list' }, sorted.map((it) => cardLine(it, true)))];
    }
    return [
      header,
      ...groupByCategory(sorted).map((g) => h('div', { className: 'type-group' },
        h('h5', null, g.label, ' ', h('span', { className: 'count' }, `(${g.count})`)),
        h('ul', { className: 'deck-list' }, g.items.map((it) => cardLine(it, false))))),
    ];
  }

  function renderSortButtons() {
    el.sortButtons.forEach((b) => {
      const active = b.dataset.sort === sortMode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-checked', String(active));
    });
  }

  function renderCardStatus(deck) {
    el.cardStatus.replaceChildren();
    el.cardStatus.className = 'card-status';
    if (!deck) return;

    if (fetchState && fetchState.deckId === deck.id) {
      if (fetchState.error) {
        el.cardStatus.classList.add('warn');
        el.cardStatus.append(
          h('span', null, `カード情報を取得できませんでした（${fetchState.error}）。英語名で表示しています。 `),
          h('button', { type: 'button', className: 'link-btn', textContent: '再試行', onclick: () => loadCardInfo(deck) }),
          ' ',
          h('button', { type: 'button', className: 'link-btn', textContent: '原因を調べる（接続チェック）', onclick: runDiagnose }));
        return;
      }
      const label = fetchState.phase === 'ja' ? '日本語名' : 'カード種類';
      el.cardStatus.classList.add('busy');
      const progress = fetchState.total ? ` ${fetchState.done} / ${fetchState.total}` : '';
      el.cardStatus.textContent = `Scryfall から${label}を取得中…${progress}`;
      if (fetchState.waiting != null) {
        el.cardStatus.textContent += `（接続できなかったため、${fetchState.waiting}秒待って再試行しています。Scryfall の回数制限の可能性があります）`;
      }
      return;
    }

    // 問い合わせ済みなのに見つからなかったカード
    const unknown = deckCardNames(deck).filter((n) => !cardService.get(n) && cardService.missing([n]).length === 0);
    if (unknown.length) {
      el.cardStatus.classList.add('warn');
      el.cardStatus.textContent = `Scryfall で見つからなかったカード: ${unknown.join(', ')}（カード名の綴りを確認してください）`;
    }
  }

  function renderDeckDetail() {
    const deck = selectedDeck();
    renderCardStatus(deck);
    if (!deck) {
      el.deckDetail.replaceChildren(h('p', { className: 'empty' }, '左の欄からデッキを読み込んで保存してください。'));
      return;
    }
    el.deckDetail.replaceChildren(
      ...renderCardSection('メインデッキ', deck.main),
      ...renderCardSection('サイドボード', deck.side),
    );
  }

  function onDeckSelected() {
    const deck = selectedDeck();
    el.editBtn.disabled = !deck;
    el.deleteBtn.disabled = !deck;
    el.startBtn.disabled = !deck || countCards(deck.main) === 0;
    if (deck) DeckStore.setSelectedId(deck.id);
    renderDeckDetail();
    if (deck) loadCardInfo(deck);
  }

  /** 選択中のデッキで未取得のカード情報を Scryfall から取得 */
  function loadCardInfo(deck) {
    const names = deckCardNames(deck);
    if (cardService.missing(names).length === 0) return;
    if (fetchState && fetchState.deckId === deck.id && !fetchState.error) return; // 取得中

    fetchState = { deckId: deck.id, phase: 'type', done: 0, total: 0 };
    renderCardStatus(selectedDeck());

    cardService.ensure(names, (p) => {
      fetchState = { deckId: deck.id, ...p };
      if (selectedDeck() && selectedDeck().id === deck.id) renderCardStatus(deck);
    }).then(() => {
      if (fetchState && fetchState.deckId === deck.id) fetchState = null;
    }).catch((e) => {
      console.error(e);
      fetchState = { deckId: deck.id, error: e.message || String(e) };
    }).finally(() => {
      renderDeckDetail();
      if (game) renderGame();
    });
  }

  function onEdit() {
    const deck = selectedDeck();
    if (!deck) return;
    el.deckName.value = deck.name;
    el.deckText.value = deckToText(deck);
    el.parseMessage.replaceChildren();
    el.deckText.focus();
  }

  function onDelete() {
    const deck = selectedDeck();
    if (!deck || !confirm(`「${deck.name}」を削除しますか？`)) return;
    DeckStore.remove(deck.id);
    renderDeckSelect(null);
  }

  // ---------- 接続チェック ----------

  function loadImage(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => reject(new Error('応答がありません（15秒）')), timeoutMs);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('読み込めませんでした')); };
      img.src = url;
    });
  }

  function diagnoseAdvice(results) {
    const ok = Object.fromEntries(results.map((r) => [r.id, r.ok]));
    if (!ok.get && !ok.post && !ok.ja) {
      return [
        'Scryfall（api.scryfall.com）に接続できません。次のどれかが考えられます。',
        '・会社や学校などのネットワークで、このサイトへの接続が制限されている',
        '・パソコンの日付・時刻が実際とずれている（ずれていると暗号化通信の確認に失敗します）',
        '・セキュリティソフトやブラウザの拡張機能が通信を止めている',
        '別のネットワーク（スマホのテザリングなど）で試すと、ネットワークが原因かどうか切り分けられます。',
        'このアプリはカード情報なしでも英語名で動きます。',
      ];
    }
    if (!ok.image) {
      return [
        'カード情報は取得できますが、画像のサーバー（cards.scryfall.io）に接続できません。',
        'ネットワークの制限が考えられます。画像なしでも文字表示で使えます。',
      ];
    }
    if (!ok.post) {
      return ['一部の取得方法が使えない環境ですが、自動で別の方法に切り替えて取得します。「再試行」を押してください。'];
    }
    return ['接続は正常です。「カード情報のキャッシュを削除」を押すと取得し直します。'];
  }

  async function runDiagnose() {
    el.diagnoseBtn.disabled = true;
    el.diagnoseResult.hidden = false;
    el.diagnoseResult.className = 'diagnose';
    el.diagnoseResult.replaceChildren(h('p', null, '接続を確認しています…（最大1分ほど）'));
    try {
      const results = await cardService.diagnose(loadImage);
      const allOk = results.every((r) => r.ok);
      el.diagnoseResult.classList.add(allOk ? 'ok' : 'warn');
      el.diagnoseResult.replaceChildren(
        h('h4', null, '接続チェックの結果'),
        h('ul', { className: 'diagnose-list' }, results.map((r) =>
          h('li', { className: r.ok ? 'pass' : 'fail' },
            h('span', { className: 'mark' }, r.ok ? '✓' : '✗'),
            h('span', null, r.label, '：', r.detail)))),
        ...diagnoseAdvice(results).map((line) => h('p', null, line)),
        h('p', { className: 'env' }, `ブラウザ情報: ${navigator.userAgent}／開き方: ${location.protocol}／パソコンの時刻: ${new Date().toLocaleString('ja-JP')}`));
    } finally {
      el.diagnoseBtn.disabled = false;
    }
  }

  function onClearCache() {
    if (!confirm('Scryfall から取得したカード情報のキャッシュを削除して、取得し直しますか？')) return;
    cardService.clearCache();
    onDeckSelected();
  }

  // ---------- 一人回し画面 ----------

  const UNDO_LIMIT = 300;
  /** 手札がこの枚数を超えたらカードを小さく表示する（さらに MINI_HAND を超えたらもっと小さく） */
  const COMPACT_HAND = 12;
  const MINI_HAND = 24;
  /** 元に戻す用：操作前の状態（JSON 文字列）を積む */
  let history = [];
  /** 直前に動いたカード（目立たせる） */
  let highlight = null;
  let toastTimer = null;
  /** カード画像: 'none' | 'ja' | 'en'（開始時に決める） */
  let imageMode = 'none';

  function canAct() {
    return game.phase === 'play' || (game.phase === 'opening' && game.mulligans === 0);
  }

  function imageUrl(info) {
    if (!info || imageMode === 'none') return null;
    if (imageMode === 'ja') return info.imageJa || info.imageEn || null;
    return info.imageEn || null;
  }

  function cardTitle(card, info) {
    return info ? `${displayName(card, info)}\n${englishName(card, info)}\n${info.typeLine}` : card.name;
  }

  function textFace(card, info) {
    const ja = info && info.jaName;
    return [
      h('span', { className: 'card-name' }, displayName(card, info)),
      ja && h('span', { className: 'card-en' }, englishName(card, info)),
      info && h('span', { className: 'card-type' }, categoryLabel(info.category)),
    ].filter(Boolean);
  }

  /** カードの見た目：画像があれば画像、なければ（読み込みに失敗したら）文字 */
  function fillCard(node, card, info) {
    const url = imageUrl(info);
    if (!url) {
      node.append(...textFace(card, info));
      return;
    }
    node.classList.add('has-image');
    node.dataset.preview = url;
    const img = h('img', { src: url, alt: displayName(card, info), loading: 'lazy', draggable: false });
    img.addEventListener('error', () => {
      node.classList.remove('has-image');
      delete node.dataset.preview;
      img.replaceWith(...textFace(card, info));
    }, { once: true });
    node.prepend(img);
  }

  /** カードを移動するボタン（data-move で onMoveClick が処理する） */
  function moveButton(card, to, label, title, disabled = false) {
    const b = h('button', { type: 'button', className: 'move-btn', textContent: label, title, disabled });
    b.dataset.iid = card.iid;
    b.dataset.move = to;
    return b;
  }

  function libraryButtons(card, { top = true, bottom = true } = {}) {
    return [
      moveButton(card, 'top', '上へ', 'ライブラリーの一番上に置く', !top),
      moveButton(card, 'bottom', '下へ', 'ライブラリーの一番下に置く', !bottom),
    ];
  }

  /** 手札のカード（クリックで場に出す／マリガン時はライブラリーの下に置くカードを選ぶ） */
  function handTile(card) {
    const info = cardService.get(card.name);
    const bottomMode = game.phase === 'bottom';
    const acting = canAct();
    const clickable = bottomMode || acting;
    const what = bottomMode ? 'ライブラリーの下に置くカードとして選ぶ' : '場に出す';
    const node = h('button', {
      type: 'button',
      className: 'card' + (clickable ? ' clickable' : ''),
      title: cardTitle(card, info) + (clickable ? `\n（クリックで${what}）` : ''),
    });
    node.dataset.iid = card.iid;
    fillCard(node, card, info);
    const order = game.bottomSelection.indexOf(card.iid);
    if (order >= 0) {
      node.classList.add('selected');
      node.append(h('span', { className: 'order-badge' }, `下へ ${order + 1}`));
    }
    if (card.iid === highlight) node.classList.add('is-new');

    const actions = acting && !bottomMode
      ? h('div', { className: 'slot-actions' }, libraryButtons(card))
      : null;
    return h('div', { className: 'slot' }, h('div', { className: 'slot-card' }, node), actions);
  }

  /** 場のカード（クリックでタップ／アンタップ、下のボタンで移動） */
  function battlefieldSlot(card) {
    const info = cardService.get(card.name);
    const tile = h('button', {
      type: 'button',
      className: 'card clickable' + (card.tapped ? ' tapped' : ''),
      title: `${cardTitle(card, info)}\n（クリックで${card.tapped ? 'アンタップ' : 'タップ'}）`,
    });
    tile.dataset.iid = card.iid;
    tile.dataset.action = 'tap';
    fillCard(tile, card, info);
    if (card.iid === highlight) tile.classList.add('is-new');

    return h('div', { className: 'slot' + (card.tapped ? ' tapped' : '') },
      h('div', { className: 'slot-card' }, tile),
      h('div', { className: 'slot-actions' },
        moveButton(card, 'graveyard', '墓地', '墓地へ置く'),
        moveButton(card, 'hand', '手札', '手札に戻す'),
        moveButton(card, 'exile', '追放', '追放する')),
      h('div', { className: 'slot-actions' }, libraryButtons(card)));
  }

  /** 墓地・追放のカード（新しいものが上）。ボタンで手札・場・ライブラリーへ */
  function pileItem(card) {
    const info = cardService.get(card.name);
    const ja = info && info.jaName;
    const text = h('div', { className: 'pile-text' },
      h('span', { className: 'name' }, displayName(card, info)),
      ja && h('span', { className: 'en' }, englishName(card, info)));
    const url = imageUrl(info);
    if (url) text.dataset.preview = url;
    const li = h('li', { title: cardTitle(card, info) },
      text,
      h('div', { className: 'pile-actions' },
        moveButton(card, 'hand', '手札', '手札に加える'),
        moveButton(card, 'battlefield', '場', '場に出す'),
        libraryButtons(card)));
    if (card.iid === highlight) li.classList.add('is-new');
    return li;
  }

  /** ライブラリーのカード（クリックで手札に加えてシャッフル、右のボタンで一番上・一番下へ） */
  function libraryItem(card, index, library) {
    const info = cardService.get(card.name);
    const ja = info && info.jaName;
    const btn = h('button', { type: 'button', className: 'lib-card', title: '手札に加えてシャッフル' },
      h('span', { className: 'name' }, displayName(card, info)),
      ja && h('span', { className: 'en' }, englishName(card, info)));
    btn.dataset.iid = card.iid;
    const url = imageUrl(info);
    if (url) btn.dataset.preview = url;
    const li = h('li', null, h('div', { className: 'lib-row' }, btn,
      h('div', { className: 'lib-actions' },
        libraryButtons(card, { top: index > 0, bottom: index < library.length - 1 }))));
    if (card.iid === highlight) li.classList.add('is-new');
    return li;
  }

  function renderMulliganBar() {
    const { phase, mulligans } = game;
    const show = phase === 'opening' || phase === 'bottom';
    el.mulliganBar.hidden = !show;
    if (!show) return;

    el.mulliganBtn.hidden = phase !== 'opening';
    el.mulliganBtn.disabled = !MTG.canMulligan(game);
    el.mulliganBtn.textContent = mulligans ? 'もう一度マリガン' : 'マリガン';
    el.keepBtn.hidden = phase !== 'opening' || mulligans === 0;
    el.bottomBtn.hidden = phase !== 'bottom';

    if (phase === 'opening') {
      el.mulliganText.textContent = mulligans === 0
        ? '初手です。マリガンしない場合は、そのままプレイを始めてください（キープ扱いになります）。'
        : `マリガン ${mulligans} 回目の手札です。キープすると、手札から ${MTG.bottomCount(game)} 枚をライブラリーの下に置きます。`;
    } else {
      const n = MTG.bottomCount(game);
      const selected = game.bottomSelection.length;
      el.mulliganText.textContent =
        `ライブラリーの一番下に置くカードを手札から ${n} 枚選んでください（${selected} / ${n}）。選んだ順に下へ置きます。`;
      el.bottomBtn.disabled = selected !== n;
      el.bottomBtn.textContent = `決定（${n}枚を下へ）`;
    }
  }

  function renderPile(listEl, countEl, cards) {
    listEl.replaceChildren(...cards.slice().reverse().map(pileItem));
    if (cards.length === 0) listEl.append(h('li', { className: 'placeholder' }, '（なし）'));
    countEl.textContent = `(${cards.length})`;
  }

  function renderGame() {
    el.gameDeckName.textContent = game.deckName;
    el.turnCount.textContent = game.turn;
    renderMulliganBar();

    // ドローボタンは手札の一番右のカードの右に置く
    el.hand.replaceChildren(...game.hand.map(handTile), el.drawBtn);
    el.hand.classList.toggle('compact', game.hand.length > COMPACT_HAND);
    el.hand.classList.toggle('mini', game.hand.length > MINI_HAND);
    el.drawLeft.textContent = game.library.length ? `残り ${game.library.length} 枚` : 'ライブラリーなし';
    el.handCount.textContent = `(${game.hand.length})`;
    el.handHint.textContent = game.phase === 'bottom'
      ? 'クリックでライブラリーの下に置くカードを選ぶ（もう一度クリックで選択解除）'
      : canAct() ? 'クリックで場に出す。下のボタンでライブラリーの一番上／一番下へ' : 'キープするまで操作できません';

    el.battlefield.replaceChildren(...game.battlefield.map(battlefieldSlot));
    if (game.battlefield.length === 0) {
      el.battlefield.append(h('p', { className: 'placeholder' }, '（手札のカードをクリックすると、ここに出ます）'));
    }
    el.battlefieldCount.textContent = `(${game.battlefield.length})`;

    renderPile(el.graveyard, el.graveyardCount, game.graveyard);
    renderPile(el.exile, el.exileCount, game.exile);

    el.library.replaceChildren(...game.library.map(libraryItem));
    el.libraryCount.textContent = `(${game.library.length})`;

    const acting = canAct();
    el.drawBtn.disabled = !acting || game.library.length === 0;
    el.nextTurnBtn.disabled = !acting;
    el.library.classList.toggle('locked', !acting);
    el.undoBtn.disabled = history.length === 0;
  }

  /** 手札の最後（加わったカードとドローボタン）が見えるよう、手札の枠を一番下までスクロール */
  function revealHandEnd() {
    el.hand.scrollTop = el.hand.scrollHeight;
  }

  function showToast(text) {
    el.gameToast.textContent = text;
    el.gameToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.gameToast.classList.remove('show'), 2500);
  }

  function nameOf(card) {
    return displayName(card, cardService.get(card.name));
  }

  /** 状態を変える操作を実行する。成功したら元に戻せるよう、操作前の状態を記録 */
  function act(fn) {
    const before = JSON.stringify(game);
    const result = fn();
    if (result) {
      history.push(before);
      if (history.length > UNDO_LIMIT) history.shift();
    }
    return result;
  }

  function onUndo() {
    if (!game || history.length === 0) return;
    game = JSON.parse(history.pop());
    highlight = null;
    renderGame();
    showToast('元に戻しました');
  }

  function notReadyToast() {
    showToast(game.phase === 'bottom'
      ? '先にライブラリーの下に置くカードを選んで「決定」を押してください'
      : '「キープ」を押してから操作してください');
  }

  function onDraw() {
    if (!game) return;
    if (!canAct()) return notReadyToast();
    const card = act(() => MTG.draw(game));
    if (!card) return showToast('ライブラリーにカードがありません');
    highlight = card.iid;
    renderGame();
    revealHandEnd();
    showToast(`${nameOf(card)} を引きました`);
  }

  function onNextTurn() {
    if (!game) return;
    if (!canAct()) return notReadyToast();
    const before = JSON.stringify(game);
    const card = MTG.nextTurn(game);
    history.push(before);
    highlight = card ? card.iid : null;
    renderGame();
    revealHandEnd();
    showToast(card ? `ターン${game.turn}：アンタップして ${nameOf(card)} を引きました`
      : `ターン${game.turn}：ライブラリーにカードがありません`);
  }

  function onMulligan() {
    if (!game || !act(() => MTG.mulligan(game))) return;
    highlight = null;
    renderGame();
    showToast(`マリガンしました（${game.mulligans}回目）`);
  }

  function onKeep() {
    if (!game || !act(() => MTG.keep(game))) return;
    renderGame();
  }

  function onConfirmBottom() {
    if (!game) return;
    const n = MTG.bottomCount(game);
    if (!act(() => MTG.confirmBottom(game))) return;
    renderGame();
    showToast(`${n}枚をライブラリーの下に置きました。プレイを始めてください`);
  }

  function onHandClick(e) {
    if (e.target.closest('[data-move]')) return;
    const btn = e.target.closest('[data-iid]');
    if (!btn || !game) return;
    const iid = Number(btn.dataset.iid);
    if (game.phase === 'bottom') {
      // 選択の切り替えは元に戻す対象にしない（もう一度クリックで外せる）
      if (!MTG.toggleBottom(game, iid)) {
        showToast(`選べるのは ${MTG.bottomCount(game)} 枚までです`);
        return;
      }
      renderGame();
      return;
    }
    if (!canAct()) return notReadyToast();
    const card = act(() => MTG.playFromHand(game, iid));
    if (!card) return;
    highlight = card.iid;
    renderGame();
  }

  function onBattlefieldClick(e) {
    const btn = e.target.closest('[data-action="tap"]');
    if (!btn || !game) return;
    if (act(() => MTG.toggleTap(game, Number(btn.dataset.iid)))) renderGame();
  }

  const MOVE_MESSAGE = {
    hand: 'を手札に加えました',
    battlefield: 'を場に出しました',
    graveyard: 'を墓地に置きました',
    exile: 'を追放しました',
    top: 'をライブラリーの一番上に置きました',
    bottom: 'をライブラリーの一番下に置きました',
  };

  /** 「墓地」「手札」「場」「上へ」「下へ」などの移動ボタン */
  function onMoveClick(e) {
    const btn = e.target.closest('[data-move]');
    if (!btn || !game || btn.disabled) return;
    if (!canAct()) return notReadyToast();
    const to = btn.dataset.move;
    const card = act(() => MTG.moveTo(game, Number(btn.dataset.iid), to));
    if (!card) return;
    highlight = card.iid;
    hidePreview();
    renderGame();
    if (to === 'hand') revealHandEnd();
    if (to === 'top') el.library.scrollTop = 0;
    if (to === 'bottom') el.library.scrollTop = el.library.scrollHeight;
    showToast(`${nameOf(card)} ${MOVE_MESSAGE[to]}`);
  }

  function onLibraryClick(e) {
    if (e.target.closest('[data-move]')) return;
    const btn = e.target.closest('[data-iid]');
    if (!btn || !game) return;
    if (!canAct()) return notReadyToast();
    const card = act(() => MTG.tutor(game, Number(btn.dataset.iid)));
    if (!card) return;
    highlight = card.iid;
    hidePreview();
    renderGame();
    el.library.scrollTop = 0; // 並びが変わったので一番上（次に引くカード）を見せる
    revealHandEnd();
    showToast(`${nameOf(card)} を手札に加え、ライブラリーをシャッフルしました`);
  }

  function onKeyDown(e) {
    if (el.gameView.hidden || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      onUndo();
    } else if (key === 'd' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onDraw();
    }
  }

  // ---------- 画像の拡大表示（マウスを乗せたとき） ----------

  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  const previewImg = el.cardPreview.querySelector('img');
  let previewTarget = null;

  function hidePreview() {
    previewTarget = null;
    el.cardPreview.classList.remove('show');
  }

  function onPreviewOver(e) {
    if (!canHover || imageMode === 'none') return;
    const target = e.target.closest('[data-preview]');
    if (!target) return hidePreview();
    if (target === previewTarget) return;
    previewTarget = target;
    previewImg.src = target.dataset.preview;

    const r = target.getBoundingClientRect();
    const w = 250;
    const hgt = 349;
    const gap = 12;
    const left = r.right + gap + w <= window.innerWidth ? r.right + gap : Math.max(8, r.left - gap - w);
    const top = Math.min(Math.max(8, r.top), window.innerHeight - hgt - 8);
    el.cardPreview.style.left = `${left}px`;
    el.cardPreview.style.top = `${top}px`;
    el.cardPreview.classList.add('show');
  }

  // ---------- 開始・終了 ----------

  function startGame() {
    const deck = selectedDeck();
    if (!deck) return;
    imageMode = el.imageMode.value;
    game = createGame(deck);
    history = [];
    highlight = null;
    hidePreview();
    el.gameToast.classList.remove('show');
    el.library.scrollTop = 0;
    renderGame();
    el.deckView.hidden = true;
    el.gameView.hidden = false;
    window.scrollTo(0, 0);
  }

  function backToDecks() {
    game = null;
    history = [];
    hidePreview();
    el.gameView.hidden = true;
    el.deckView.hidden = false;
  }

  // ---------- 初期化 ----------

  el.saveBtn.addEventListener('click', onSave);
  el.clearBtn.addEventListener('click', () => {
    el.deckName.value = '';
    el.deckText.value = '';
    el.parseMessage.replaceChildren();
  });
  el.fileInput.addEventListener('change', async () => {
    await loadFiles(el.fileInput.files);
    el.fileInput.value = ''; // 同じファイルをもう一度選べるように
  });

  // ドラッグ＆ドロップ（パネルの外に落としてもブラウザがファイルを開かないようにする）
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());
  el.editorPanel.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.editorPanel.classList.add('dragging');
  });
  el.editorPanel.addEventListener('dragleave', (e) => {
    if (!el.editorPanel.contains(e.relatedTarget)) el.editorPanel.classList.remove('dragging');
  });
  el.editorPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    el.editorPanel.classList.remove('dragging');
    if (e.dataTransfer && e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
  });

  el.deckSelect.addEventListener('change', onDeckSelected);
  el.editBtn.addEventListener('click', onEdit);
  el.deleteBtn.addEventListener('click', onDelete);
  el.sortButtons.forEach((b) => b.addEventListener('click', () => {
    sortMode = b.dataset.sort;
    Prefs.set('sort', sortMode);
    renderSortButtons();
    renderDeckDetail();
  }));
  el.clearCacheBtn.addEventListener('click', onClearCache);
  el.diagnoseBtn.addEventListener('click', runDiagnose);
  el.startBtn.addEventListener('click', startGame);
  el.restartBtn.addEventListener('click', startGame);
  el.backBtn.addEventListener('click', backToDecks);
  el.hand.addEventListener('click', onHandClick);
  el.library.addEventListener('click', onLibraryClick);
  el.drawBtn.addEventListener('click', onDraw);
  el.nextTurnBtn.addEventListener('click', onNextTurn);
  el.undoBtn.addEventListener('click', onUndo);
  el.mulliganBtn.addEventListener('click', onMulligan);
  el.keepBtn.addEventListener('click', onKeep);
  el.bottomBtn.addEventListener('click', onConfirmBottom);
  el.battlefield.addEventListener('click', onBattlefieldClick);
  el.gameView.addEventListener('click', onMoveClick);
  el.gameView.addEventListener('mouseover', onPreviewOver);
  el.gameView.addEventListener('mouseleave', hidePreview);
  window.addEventListener('scroll', hidePreview, { passive: true });
  el.library.addEventListener('scroll', hidePreview, { passive: true });

  el.imageMode.value = ['none', 'ja', 'en'].includes(Prefs.get('imageMode', 'ja')) ? Prefs.get('imageMode', 'ja') : 'ja';
  el.imageMode.addEventListener('change', () => Prefs.set('imageMode', el.imageMode.value));
  document.addEventListener('keydown', onKeyDown);

  renderSortButtons();
  renderDeckSelect(DeckStore.getSelectedId());
})();
