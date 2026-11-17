/* 画面の制御 */
(function () {
  'use strict';

  const MTG = window.MTG;
  const {
    parseDeckList, countCards, deckToText, DeckStore, Prefs, createGame,
    cardService, sortEntries, groupByCategory, displayName: displayNameJa, englishName, t,
  } = window.MTG;

  /** 英語のみ（業務用）か */
  const isEn = () => MTG.getLang() === 'en';
  /** 表示するカード名：英語のみ（業務用）では英語名、それ以外は日本語名（なければ英語名） */
  function displayName(entry, info) {
    return isEn() ? englishName(entry, info) : displayNameJa(entry, info);
  }
  /** カードの種類の表示名 */
  function categoryLabel(id) {
    return t('type.' + (id || 'unknown'));
  }
  /** デッキの表示名（組み込みデッキは英語のみ（業務用）で英語名） */
  function deckLabel(deck) {
    return isEn() && deck.nameEn ? deck.nameEn : deck.name;
  }
  /** 並び順（英語のみ（業務用）では「日本語名」は使わない） */
  function effectiveSort() {
    return isEn() && sortMode === 'ja' ? 'en' : sortMode;
  }
  /** Scryfall などのエラーを今の言語の文にする */
  function errorText(e) {
    if (e && e.code && MTG.I18N['err.' + e.code]) return t('err.' + e.code, e.params);
    return (e && e.message) || String(e);
  }

  const $ = (id) => document.getElementById(id);
  const el = {
    deckView: $('deck-view'),
    gameView: $('game-view'),
    editorPanel: $('editor-panel'),
    fileInput: $('file-input'),
    deckName: $('deck-name'),
    deckText: $('deck-text'),
    expandBtn: $('expand-btn'),
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
    gameNumber: $('game-number'),
    nextGameBtn: $('next-game-btn'),
    nextGameMenu: $('next-game-menu'),
    nextStartBtn: $('next-start-btn'),
    nextKeepBtn: $('next-keep-btn'),
    nextResetBtn: $('next-reset-btn'),
    sbStartBtn: $('sb-start-btn'),
    sbMainTotal: $('sb-main-total'),
    sbSideTotal: $('sb-side-total'),
    sbProblems: $('sb-problems'),
    sbDiff: $('sb-diff'),
    sbMain: $('sb-main'),
    sbMainCount: $('sb-main-count'),
    sideCount: $('side-count'),
    deckCounts: $('deck-counts'),
    sideHint: $('side-hint'),
    sideToggle: $('side-toggle'),
    sideBody: $('side-body'),
    sideDiff: $('side-diff'),
    sideList: $('side-list'),
    sidePlanName: $('side-plan-name'),
    sbPlanSelect: $('sb-plan-select'),
    sbPlanSaveBtn: $('sb-plan-save-btn'),
    sbPlanDeleteBtn: $('sb-plan-delete-btn'),
    sbPlanExportBtn: $('sb-plan-export-btn'),
    sbPlanImport: $('sb-plan-import'),
    sbPlanForm: $('sb-plan-form'),
    sbPlanName: $('sb-plan-name'),
    sbPlanCancel: $('sb-plan-cancel'),
    sbPlanMsg: $('sb-plan-msg'),
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
    const id = el.deckSelect.value;
    if (!id) return null;
    return MTG.isPresetId(id) ? MTG.getPreset(id) : DeckStore.get(id);
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
    if (DeckStore.findByName(name) && !confirm(t('editor.confirmOverwrite', { name }))) {
      return { status: 'cancelled', parsed };
    }
    const deck = DeckStore.save({ name, main: parsed.main, side: parsed.side });
    return { status: 'saved', deck, parsed };
  }

  function savedSummary(deck) {
    return t('editor.saved', { name: deck.name, main: countCards(deck.main), side: countCards(deck.side) });
  }

  function errorLines(parsed, prefix = '') {
    return parsed.errors.map((e) => prefix + t('editor.parseLine', { line: e.line, text: e.text }));
  }

  function onSave() {
    const name = el.deckName.value.trim();
    if (!name) {
      showMessage('warn', t('editor.needName'));
      el.deckName.focus();
      return;
    }
    const result = saveDeckFromText(name, el.deckText.value);
    if (result.status === 'empty') {
      showMessage('warn', t('editor.noCards'),
        errorLines(result.parsed).slice(0, 10));
      return;
    }
    if (result.status === 'cancelled') return;

    renderDeckSelect(result.deck.id);
    if (result.parsed.errors.length) {
      showMessage('warn', savedSummary(result.deck) + t('editor.ignoredLines'), errorLines(result.parsed));
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
      showMessage('warn', t('editor.chooseTxt'));
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
        warnLines.push(t('editor.fileUnreadable', { file: file.name }));
        continue;
      }
      const result = saveDeckFromText(name, text);
      if (result.status === 'empty') {
        warnLines.push(t('editor.fileNoCards', { file: file.name }));
        continue;
      }
      if (result.status === 'cancelled') continue;

      lastDeck = result.deck;
      okLines.push(savedSummary(result.deck));
      warnLines.push(...errorLines(result.parsed, `${file.name} `).map((l) => l + t('editor.ignored')));
      if (files.length === 1) {
        el.deckName.value = name;
        el.deckText.value = text.replace(/^﻿/, '');
      }
    }

    if (lastDeck) renderDeckSelect(lastDeck.id);
    if (warnLines.length) {
      showMessage('warn', okLines.join(' ') || t('editor.nothingSaved'), warnLines);
    } else if (okLines.length) {
      showMessage('ok', okLines.join(' '));
    }
  }

  // ---------- デッキ一覧 ----------

  /** デッキ一覧：「組み込みデッキ」と「保存したデッキ」に分けて表示 */
  function renderDeckSelect(selectId) {
    const presets = MTG.presetDecks();
    const saved = DeckStore.list().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const option = (d) => h('option', { value: d.id, textContent: t('decks.option', { name: deckLabel(d), n: countCards(d.main) }) });

    el.deckSelect.replaceChildren(
      h('optgroup', { label: t('decks.groupPreset') }, presets.map(option)),
      h('optgroup', { label: t('decks.groupSaved') },
        saved.length ? saved.map(option) : h('option', { value: '', disabled: true, textContent: t('decks.none') })),
    );
    const all = [...presets, ...saved];
    el.deckSelect.value = all.some((d) => d.id === selectId) ? selectId : fallbackDeckId(saved);
    onDeckSelected();
  }

  /**
   * 覚えていたデッキが見つからないとき（初めて開いた・削除した・組み込みデッキが入れ替わった）に開くデッキ：
   * 最後に保存した自分のデッキ。自分のデッキがなければ既定の組み込みデッキ
   */
  function fallbackDeckId(saved) {
    const latest = saved.slice().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
    return latest ? latest.id : MTG.defaultPreset().id;
  }

  function cardLine(item, showType) {
    const { entry, info } = item;
    const ja = !isEn() && info && info.jaName;
    return h('li', { title: info ? info.typeLine : '' },
      h('span', { className: 'qty' }, entry.count),
      h('span', { className: 'name' }, displayName(entry, info)),
      ja && h('span', { className: 'en' }, englishName(entry, info)),
      showType && h('span', { className: 'type-tag' }, categoryLabel(info && info.category)));
  }

  function renderCardSection(title, list) {
    if (!list.length) return [];
    const sorted = sortEntries(list, effectiveSort(), (n) => cardService.get(n));
    const header = h('h4', null, title, ' ', h('span', { className: 'count' }, `(${countCards(list)})`));

    if (sortMode !== 'type') {
      return [header, h('ul', { className: 'deck-list' }, sorted.map((it) => cardLine(it, true)))];
    }
    return [
      header,
      ...groupByCategory(sorted).map((g) => h('div', { className: 'type-group' },
        h('h5', null, categoryLabel(g.category), ' ', h('span', { className: 'count' }, `(${g.count})`)),
        h('ul', { className: 'deck-list' }, g.items.map((it) => cardLine(it, false))))),
    ];
  }

  function renderSortButtons() {
    el.sortButtons.forEach((b) => {
      b.hidden = isEn() && b.dataset.sort === 'ja'; // 英語のみ（業務用）では「日本語名」を出さない
      const active = b.dataset.sort === effectiveSort();
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
          h('span', null, t('fetch.failed', { error: errorText(fetchState.error) })),
          h('button', { type: 'button', className: 'link-btn', textContent: t('fetch.retry'), onclick: () => loadCardInfo(deck) }),
          ' ',
          h('button', { type: 'button', className: 'link-btn', textContent: t('fetch.diagnose'), onclick: runDiagnose }));
        return;
      }
      const label = fetchState.phase === 'ja' ? t('fetch.phaseJa') : t('fetch.phaseType');
      el.cardStatus.classList.add('busy');
      const progress = fetchState.total ? ` ${fetchState.done} / ${fetchState.total}` : '';
      el.cardStatus.textContent = t('fetch.loading', { label, progress });
      if (fetchState.waiting != null) {
        el.cardStatus.textContent += t('fetch.waiting', { sec: fetchState.waiting });
      }
      return;
    }

    // 問い合わせ済みなのに見つからなかったカード
    const unknown = deckCardNames(deck).filter((n) => !cardService.get(n) && cardService.missing([n]).length === 0);
    if (unknown.length) {
      el.cardStatus.classList.add('warn');
      el.cardStatus.textContent = t('fetch.notFound', { names: unknown.join(', ') });
    }
  }

  function renderDeckDetail() {
    const deck = selectedDeck();
    renderCardStatus(deck);
    if (!deck) {
      el.deckDetail.replaceChildren(h('p', { className: 'empty' }, t('decks.empty')));
      return;
    }
    el.deckDetail.replaceChildren(
      ...(deck.preset ? [h('p', { className: 'preset-note' }, t('decks.presetNote'))] : []),
      ...renderCardSection(t('decks.main'), deck.main),
      ...renderCardSection(t('decks.side'), deck.side),
    );
  }

  function onDeckSelected() {
    const deck = selectedDeck();
    el.editBtn.disabled = !deck;
    el.deleteBtn.disabled = !deck || !!deck.preset;
    el.deleteBtn.title = deck && deck.preset ? t('decks.cannotDeletePreset') : '';
    el.startBtn.disabled = !deck || countCards(deck.main) === 0;
    if (deck) DeckStore.setSelectedId(deck.id);
    renderDeckDetail();
    if (deck) loadCardInfo(deck);
  }

  /** 選択中のデッキで未取得のカード情報を Scryfall から取得 */
  /** 画像（初版）を裏で取得する。待たずに一覧やゲームを使える。取れたら描き直す */
  let imagesLoading = null;
  function loadImages(deck) {
    if (el.imageMode.value === 'work') return; // 英語のみ（業務用）では画像を使わない
    const names = deckCardNames(deck);
    if (cardService.missingImages(names).length === 0 || imagesLoading === deck.id) return;
    imagesLoading = deck.id;
    cardService.ensureImages(names).then(() => {
      if (game) renderGame();
      if (match) (sideboarding ? renderSideboarding() : renderSideboardZone());
    }).catch((e) => console.warn('画像の取得に失敗しました（文字で表示します）', e))
      .finally(() => { if (imagesLoading === deck.id) imagesLoading = null; });
  }

  function loadCardInfo(deck) {
    const names = deckCardNames(deck);
    if (cardService.missing(names).length === 0) {
      loadImages(deck);
      return;
    }
    if (fetchState && fetchState.deckId === deck.id && !fetchState.error) return; // 取得中

    fetchState = { deckId: deck.id, phase: 'type', done: 0, total: 0 };
    renderCardStatus(selectedDeck());

    cardService.ensure(names, (p) => {
      fetchState = { deckId: deck.id, ...p };
      if (selectedDeck() && selectedDeck().id === deck.id) renderCardStatus(deck);
    }).then(() => {
      if (fetchState && fetchState.deckId === deck.id) fetchState = null;
      loadImages(deck);
    }).catch((e) => {
      console.error(e);
      fetchState = { deckId: deck.id, error: e };
    }).finally(() => {
      renderDeckDetail();
      if (game) renderGame();
      if (match) (sideboarding ? renderSideboarding() : renderSideboardZone());
    });
  }

  /** デッキリストの入力欄を広げる／狭める */
  function setDeckTextExpanded(expanded) {
    el.deckText.classList.toggle('expanded', expanded);
    el.deckText.style.height = ''; // 手で大きさを変えていても、ボタンの大きさに戻す
    el.expandBtn.textContent = expanded ? t('editor.collapse') : t('editor.expand');
    el.expandBtn.setAttribute('aria-expanded', String(expanded));
  }

  function onEdit() {
    const deck = selectedDeck();
    if (!deck) return;
    setDeckTextExpanded(true); // 編集するときは広げて全体を見せる
    el.deckName.value = deck.name;
    el.deckText.value = deckToText(deck);
    el.parseMessage.replaceChildren();
    el.deckText.focus();
  }

  function onDelete() {
    const deck = selectedDeck();
    if (!deck || deck.preset || !confirm(t('decks.confirmDelete', { name: deck.name }))) return;
    DeckStore.remove(deck.id);
    renderDeckSelect(null);
  }

  // ---------- 接続チェック ----------

  function loadImage(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => reject(Object.assign(new Error('応答がありません（15秒）'), { code: 'imgTimeout' })), timeoutMs);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); reject(Object.assign(new Error('読み込めませんでした'), { code: 'imgError' })); };
      img.src = url;
    });
  }

  function diagnoseAdvice(results) {
    const ok = Object.fromEntries(results.map((r) => [r.id, r.ok]));
    if (!ok.get && !ok.post && !ok.ja) {
      return ['diag.adviceBlocked1', 'diag.adviceBlocked2', 'diag.adviceBlocked3', 'diag.adviceBlocked4', 'diag.adviceBlocked5', 'diag.adviceBlocked6'].map((k) => t(k));
    }
    if (!ok.image) {
      return [t('diag.adviceImage1'), t('diag.adviceImage2')];
    }
    if (!ok.post) {
      return [t('diag.advicePost')];
    }
    return [t('diag.adviceOk')];
  }

  /** 接続チェックの各項目の結果の文 */
  function diagnoseDetail(r) {
    if (r.ok) {
      if (r.id === 'image') return t('diag.okImage');
      if (r.id === 'ja' && isEn()) return t('diag.ok'); // 英語のみ（業務用）では日本語名を出さない
      return r.value ? t('diag.okValue', { value: r.value }) : t('diag.ok');
    }
    const code = r.error && r.error.code;
    if (code && MTG.I18N['diag.' + code]) return t('diag.' + code);
    return r.error ? errorText(r.error) : r.detail;
  }

  async function runDiagnose() {
    el.diagnoseBtn.disabled = true;
    el.diagnoseResult.hidden = false;
    el.diagnoseResult.className = 'diagnose';
    el.diagnoseResult.replaceChildren(h('p', null, t('diag.checking')));
    try {
      const results = await cardService.diagnose(loadImage);
      const allOk = results.every((r) => r.ok);
      el.diagnoseResult.classList.add(allOk ? 'ok' : 'warn');
      el.diagnoseResult.replaceChildren(
        h('h4', null, t('diag.title')),
        h('ul', { className: 'diagnose-list' }, results.map((r) =>
          h('li', { className: r.ok ? 'pass' : 'fail' },
            h('span', { className: 'mark' }, r.ok ? '✓' : '✗'),
            h('span', null, t('diag.label.' + r.id), isEn() ? ': ' : '：', diagnoseDetail(r))))),
        ...diagnoseAdvice(results).map((line) => h('p', null, line)),
        h('p', { className: 'env' }, t('diag.env', { ua: navigator.userAgent, protocol: location.protocol, time: new Date().toLocaleString(isEn() ? 'en-US' : 'ja-JP') })));
    } finally {
      el.diagnoseBtn.disabled = false;
    }
  }

  function onClearCache() {
    if (!confirm(t('decks.confirmClearCache'))) return;
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
  /**
   * ドローボタンの位置：続けて引いている間は動かさない。
   * 値は「ボタンより左にある手札の枚数」。null なら手札の一番右。
   * 手札のカードがどこかへ動いたら null に戻す（＝ボタンが手札の一番右へ移る）
   */
  let drawAnchor = null;
  let toastTimer = null;
  /** カード画像: 'none' | 'ja' | 'en'（開始時に決める） */
  let imageMode = 'none';

  function canAct() {
    return game.phase === 'play' || (game.phase === 'opening' && game.mulligans === 0);
  }

  /** 表示する画像（拡大表示用の normal の URL）。カードの表示には MTG.smallImage で小さい画像を使う */
  function imageUrl(info) {
    return MTG.pickImage(info, imageMode);
  }

  function cardTitle(card, info) {
    if (!info) return card.name;
    return isEn() ? `${englishName(card, info)}\n${info.typeLine}` : `${displayName(card, info)}\n${englishName(card, info)}\n${info.typeLine}`;
  }

  function textFace(card, info) {
    const ja = !isEn() && info && info.jaName;
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
    const img = h('img', { src: MTG.smallImage(url), alt: displayName(card, info), loading: 'lazy', draggable: false });
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
      moveButton(card, 'top', t('move.top'), t('move.topTitle'), !top),
      moveButton(card, 'bottom', t('move.bottom'), t('move.bottomTitle'), !bottom),
    ];
  }

  /** 手札のカード（クリックで場に出す／マリガン時はライブラリーの下に置くカードを選ぶ） */
  function handTile(card) {
    const info = cardService.get(card.name);
    const bottomMode = game.phase === 'bottom';
    const acting = canAct();
    const clickable = bottomMode || acting;
    const what = bottomMode ? t('hand.clickBottom') : t('hand.clickPlay');
    const node = h('button', {
      type: 'button',
      className: 'card' + (clickable ? ' clickable' : ''),
      title: cardTitle(card, info) + (clickable ? '\n' + t('hand.clickTo', { what }) : ''),
    });
    node.dataset.iid = card.iid;
    fillCard(node, card, info);
    const order = game.bottomSelection.indexOf(card.iid);
    if (order >= 0) {
      node.classList.add('selected');
      node.append(h('span', { className: 'order-badge' }, t('hand.bottomBadge', { n: order + 1 })));
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
      title: `${cardTitle(card, info)}\n${card.tapped ? t('battlefield.clickUntap') : t('battlefield.clickTap')}`,
    });
    tile.dataset.iid = card.iid;
    tile.dataset.action = 'tap';
    fillCard(tile, card, info);
    if (card.iid === highlight) tile.classList.add('is-new');

    const slot = h('div', { className: 'slot' + (card.tapped ? ' tapped' : ''), draggable: true },
      h('div', { className: 'slot-card' }, tile),
      h('div', { className: 'slot-actions' },
        moveButton(card, 'graveyard', t('move.graveyard'), t('move.graveyardTitle')),
        moveButton(card, 'hand', t('move.hand'), t('move.handReturnTitle')),
        moveButton(card, 'exile', t('move.exile'), t('move.exileTitle'))),
      h('div', { className: 'slot-actions' }, libraryButtons(card)));
    slot.dataset.iid = card.iid;
    return slot;
  }

  /** 墓地・追放のカード（新しいものが上）。ボタンで手札・場・ライブラリーへ */
  function pileItem(card) {
    const info = cardService.get(card.name);
    const ja = !isEn() && info && info.jaName;
    const text = h('div', { className: 'pile-text' },
      h('span', { className: 'name' }, displayName(card, info)),
      ja && h('span', { className: 'en' }, englishName(card, info)));
    const url = imageUrl(info);
    if (url) text.dataset.preview = url;
    const li = h('li', { title: cardTitle(card, info) },
      text,
      h('div', { className: 'pile-actions' },
        moveButton(card, 'hand', t('move.hand'), t('move.handTitle')),
        moveButton(card, 'battlefield', t('move.battlefield'), t('move.battlefieldTitle')),
        libraryButtons(card)));
    if (card.iid === highlight) li.classList.add('is-new');
    return li;
  }

  /** ライブラリーのカード（クリックで手札に加えてシャッフル、右のボタンで一番上・一番下へ） */
  function libraryItem(card, index, library) {
    const info = cardService.get(card.name);
    const ja = !isEn() && info && info.jaName;
    const btn = h('button', { type: 'button', className: 'lib-card', title: t('library.tutor') },
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
    el.mulliganBtn.textContent = mulligans ? t('mull.again') : t('mull.mulligan');
    el.keepBtn.hidden = phase !== 'opening' || mulligans === 0;
    el.bottomBtn.hidden = phase !== 'bottom';

    if (phase === 'opening') {
      el.mulliganText.textContent = mulligans === 0
        ? t('mull.opening')
        : t('mull.after', { m: mulligans, n: MTG.bottomCount(game) });
    } else {
      const n = MTG.bottomCount(game);
      const selected = game.bottomSelection.length;
      el.mulliganText.textContent =
        t('mull.choose', { n, selected });
      el.bottomBtn.disabled = selected !== n;
      el.bottomBtn.textContent = t('mull.confirmN', { n });
    }
  }

  function renderPile(listEl, countEl, cards) {
    listEl.replaceChildren(...cards.slice().reverse().map(pileItem));
    if (cards.length === 0) listEl.append(h('li', { className: 'placeholder' }, t('zone.none')));
    countEl.textContent = `(${cards.length})`;
  }

  function renderGame() {
    el.gameDeckName.textContent = match ? deckLabel(match.deck) : game.deckName;
    el.gameNumber.textContent = match ? t('game.number', { n: match.gameNumber }) : '';
    el.turnCount.textContent = game.turn;
    renderMulliganBar();

    // ドローボタンは手札の一番右のカードの右に置く
    // ドローボタンは手札の一番右。ただし続けて引いている間はその場にとどめ、引いたカードはボタンの右に並べる
    if (drawAnchor != null && drawAnchor >= game.hand.length) drawAnchor = null;
    const tiles = game.hand.map(handTile);
    if (drawAnchor == null) el.hand.replaceChildren(...tiles, el.drawBtn);
    else el.hand.replaceChildren(...tiles.slice(0, drawAnchor), el.drawBtn, ...tiles.slice(drawAnchor));
    // カードの大きさも、続けて引いている間は変えない（ボタンの位置がずれないように）
    const sizeCount = drawAnchor == null ? game.hand.length : drawAnchor;
    el.hand.classList.toggle('compact', sizeCount > COMPACT_HAND);
    el.hand.classList.toggle('mini', sizeCount > MINI_HAND);
    el.drawLeft.textContent = game.library.length ? t('draw.left', { n: game.library.length }) : t('draw.empty');
    el.handCount.textContent = `(${game.hand.length})`;
    el.handHint.textContent = game.phase === 'bottom'
      ? t('hand.hintBottom')
      : canAct() ? t('hand.hintPlay') : t('hand.hintLocked');

    el.battlefield.replaceChildren(...game.battlefield.map(battlefieldSlot));
    if (game.battlefield.length === 0) {
      el.battlefield.append(h('p', { className: 'placeholder' }, t('battlefield.empty')));
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
    if (drawAnchor != null) return; // 続けて引いている間はスクロールしない（ボタンの位置を保つ）
    el.hand.scrollTop = el.hand.scrollHeight;
  }

  /** 手札のカードがどこかへ動いた：ドローボタンを手札の一番右へ戻す */
  function releaseDrawAnchor() {
    drawAnchor = null;
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
    showToast(t('toast.undo'));
  }

  function notReadyToast() {
    showToast(game.phase === 'bottom'
      ? t('toast.needBottom')
      : t('toast.needKeep'));
  }

  function onDraw() {
    if (!game) return;
    if (!canAct()) return notReadyToast();
    const handBefore = game.hand.length;
    const card = act(() => MTG.draw(game));
    if (!card) return showToast(t('toast.libraryEmpty'));
    if (drawAnchor == null) drawAnchor = handBefore;
    highlight = card.iid;
    renderGame();
    showToast(t('toast.drew', { name: nameOf(card) }));
  }

  function onNextTurn() {
    if (!game) return;
    if (!canAct()) return notReadyToast();
    const before = JSON.stringify(game);
    const handBefore = game.hand.length;
    const card = MTG.nextTurn(game);
    history.push(before);
    if (card && drawAnchor == null) drawAnchor = handBefore;
    highlight = card ? card.iid : null;
    renderGame();
    showToast(card ? t('toast.nextTurnDrew', { turn: game.turn, name: nameOf(card) })
      : t('toast.nextTurnEmpty', { turn: game.turn }));
  }

  function onMulligan() {
    if (!game || !act(() => MTG.mulligan(game))) return;
    releaseDrawAnchor();
    highlight = null;
    renderGame();
    showToast(t('toast.mulliganed', { n: game.mulligans }));
  }

  function onKeep() {
    if (!game || !act(() => MTG.keep(game))) return;
    renderGame();
  }

  function onConfirmBottom() {
    if (!game) return;
    const n = MTG.bottomCount(game);
    if (!act(() => MTG.confirmBottom(game))) return;
    releaseDrawAnchor();
    renderGame();
    showToast(t('toast.bottomDone', { n }));
  }

  function onHandClick(e) {
    if (e.target.closest('[data-move]')) return;
    const btn = e.target.closest('[data-iid]');
    if (!btn || !game) return;
    const iid = Number(btn.dataset.iid);
    if (game.phase === 'bottom') {
      // 選択の切り替えは元に戻す対象にしない（もう一度クリックで外せる）
      if (!MTG.toggleBottom(game, iid)) {
        showToast(t('toast.bottomMax', { n: MTG.bottomCount(game) }));
        return;
      }
      renderGame();
      return;
    }
    if (!canAct()) return notReadyToast();
    const card = act(() => MTG.playFromHand(game, iid));
    if (!card) return;
    releaseDrawAnchor();
    highlight = card.iid;
    renderGame();
  }

  // ---------- 場のカードのドラッグで並べ替え ----------

  let dragIid = null;

  function clearDropMarks() {
    el.battlefield.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
  }

  /** ドラッグ中の位置から、どのカードの前に入れるか（null なら一番右）と、目印を付ける場所を求める */
  function dropTarget(e) {
    const slots = [...el.battlefield.querySelectorAll('.slot')].filter((n) => Number(n.dataset.iid) !== dragIid);
    const over = e.target.closest('.slot');
    if (over && Number(over.dataset.iid) !== dragIid) {
      const r = over.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      const i = slots.indexOf(over);
      const next = after ? slots[i + 1] : over;
      return { beforeIid: next ? Number(next.dataset.iid) : null, mark: over, side: after ? 'after' : 'before' };
    }
    if (over) return null; // 自分の上
    const last = slots[slots.length - 1];
    return last ? { beforeIid: null, mark: last, side: 'after' } : null;
  }

  function onDragStart(e) {
    const slot = e.target.closest && e.target.closest('.slot');
    if (!slot || !game) return;
    dragIid = Number(slot.dataset.iid);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragIid));
    hidePreview();
    requestAnimationFrame(() => slot.classList.add('dragging'));
  }

  function onDragOver(e) {
    if (dragIid == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropMarks();
    const t = dropTarget(e);
    if (t) t.mark.classList.add(t.side === 'after' ? 'drop-after' : 'drop-before');
  }

  function onDrop(e) {
    if (dragIid == null) return;
    e.preventDefault();
    const t = dropTarget(e);
    const iid = dragIid;
    onDragEnd();
    if (!t) return;
    if (act(() => MTG.reorderBattlefield(game, iid, t.beforeIid))) renderGame();
  }

  function onDragEnd() {
    dragIid = null;
    clearDropMarks();
    el.battlefield.querySelectorAll('.dragging').forEach((n) => n.classList.remove('dragging'));
  }

  function onBattlefieldClick(e) {
    const btn = e.target.closest('[data-action="tap"]');
    if (!btn || !game) return;
    if (act(() => MTG.toggleTap(game, Number(btn.dataset.iid)))) renderGame();
  }


  /** 「墓地」「手札」「場」「上へ」「下へ」などの移動ボタン */
  function onMoveClick(e) {
    const btn = e.target.closest('[data-move]');
    if (!btn || !game || btn.disabled) return;
    if (!canAct()) return notReadyToast();
    const to = btn.dataset.move;
    const from = MTG.findZone(game, Number(btn.dataset.iid));
    const card = act(() => MTG.moveTo(game, Number(btn.dataset.iid), to));
    if (!card) return;
    if (from === 'hand') releaseDrawAnchor();
    highlight = card.iid;
    hidePreview();
    renderGame();
    if (to === 'hand') revealHandEnd();
    if (to === 'top') el.library.scrollTop = 0;
    if (to === 'bottom') el.library.scrollTop = el.library.scrollHeight;
    showToast(t('moved.' + to, { name: nameOf(card) }));
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
    showToast(t('toast.tutored', { name: nameOf(card) }));
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

  // ---------- サイドボーディング ----------

  /** その対戦の状態：元のデッキ・今の構成（メイン／サイド）・何戦目か */
  let match = null;
  /** サイドボーディング中（ゲーム開始前）か */
  let sideboarding = false;

  function countDelta(list, original, name) {
    const k = MTG.nameKey(name);
    const n = (l) => l.filter((e) => MTG.nameKey(e.name) === k).reduce((s, e) => s + e.count, 0);
    return n(list) - n(original);
  }

  /** サイドボーディングの一覧の1行（クリックで反対側へ1枚） */
  function sbLine(item, zone) {
    const { entry, info } = item;
    const ja = !isEn() && info && info.jaName;
    const original = zone === 'main' ? match.deck.main : (match.deck.side || []);
    const delta = countDelta(zone === 'main' ? match.config.main : match.config.side, original, entry.name);
    const to = zone === 'main' ? 'side' : 'main';
    const deltaBadge = delta !== 0 && h('span', { className: 'delta ' + (delta > 0 ? 'plus' : 'minus') }, delta > 0 ? `+${delta}` : `−${-delta}`);

    // カード画像を表示する設定なら、画像のカードを並べる（枚数と増減は画像の上に重ねる）
    if (showsImages()) {
      const tile = h('button', {
        type: 'button',
        className: 'card sb-card sb-tile' + (sideboarding ? ' clickable' : ' locked'),
        title: info ? cardTitle(entry, info) : entry.name,
      });
      fillCard(tile, entry, info);
      tile.append(h('span', { className: 'sb-qty' }, `×${entry.count}`));
      if (deltaBadge) tile.append(deltaBadge);
      tile.dataset.name = entry.name;
      tile.dataset.to = to;
      return tile;
    }

    const btn = h('button', {
      type: 'button',
      className: 'sb-card' + (sideboarding ? '' : ' locked'),
      title: info ? cardTitle(entry, info) : entry.name,
    },
      h('span', { className: 'qty' }, entry.count),
      h('span', { className: 'name' }, displayName(entry, info)),
      ja && h('span', { className: 'en' }, englishName(entry, info)),
      deltaBadge);
    btn.dataset.name = entry.name;
    btn.dataset.to = to;
    const url = imageUrl(info);
    if (url) btn.dataset.preview = url;
    return btn;
  }

  function sbList(container, list, zone) {
    if (list.length === 0) {
      container.replaceChildren(h('p', { className: 'placeholder' }, zone === 'main' ? t('sb.emptyMain') : t('sb.emptySide')));
      return;
    }
    const sorted = sortEntries(list, effectiveSort(), (n) => cardService.get(n));
    const groups = sortMode === 'type' ? groupByCategory(sorted) : [{ label: null, items: sorted }];
    container.replaceChildren(...groups.map((g) => h('div', { className: 'sb-group' },
      g.label && h('h5', null, categoryLabel(g.category), ' ', h('span', { className: 'count' }, `(${g.count})`)),
      h('div', { className: 'sb-items' + (showsImages() ? ' tiles' : '') }, g.items.map((it) => sbLine(it, zone))))));
  }

  /** カード画像を表示する設定か（英語のみ（業務用）では表示しない） */
  function showsImages() {
    return imageMode === 'ja' || imageMode === 'en';
  }

  function diffView(container) {
    const d = MTG.configDiff(match.deck, match.config);
    if (d.in.length === 0 && d.out.length === 0) {
      container.replaceChildren(h('p', { className: 'sb-nodiff' }, t('sb.noDiff')));
      return;
    }
    const names = (list) => list.map((e) => `${displayName(e, cardService.get(e.name))} ×${e.count}`).join(t('sb.listSep'));
    const total = (list) => list.reduce((s, e) => s + e.count, 0);
    container.replaceChildren(...[
      d.in.length && h('p', { className: 'sb-in' }, h('strong', null, t('sb.in', { n: total(d.in) })), ' ', names(d.in)),
      d.out.length && h('p', { className: 'sb-out' }, h('strong', null, t('sb.out', { n: total(d.out) })), ' ', names(d.out)),
    ].filter(Boolean));
  }

  /** 画面の一番下のサイドボード（いつも表示。メイン・サイドの枚数もここに出す） */
  function renderSideboardZone() {
    if (!match) return;
    const counts = MTG.configCounts(match.config);
    el.sideCount.textContent = `(${counts.side})`;
    el.deckCounts.textContent = t('sb.counts', counts);
    el.sideHint.textContent = sideboarding ? t('sb.toMain') : t('sb.locked');
    const { value, plan } = currentPlan();
    el.sidePlanName.textContent = plan ? t('plan.current', { name: plan.name }) : value === '__custom' ? t('plan.currentCustom') : '';
    sbList(el.sideList, match.config.side, 'side');
    if (!sideboarding) diffView(el.sideDiff);

    const collapsed = !sideboarding && sideCollapsed;
    el.sideBody.hidden = collapsed;
    el.sideToggle.textContent = collapsed ? t('sb.expand') : t('sb.collapse');
    el.sideToggle.setAttribute('aria-expanded', String(!collapsed));
  }

  function renderSideboarding() {
    if (!match) return;
    const counts = MTG.configCounts(match.config);
    const problems = MTG.configProblems(match.config).map((p) => t('sb.problem.' + p.code, p));
    el.gameDeckName.textContent = deckLabel(match.deck);
    el.gameNumber.textContent = t('game.number', { n: match.gameNumber });
    el.sbMainTotal.textContent = counts.main;
    el.sbSideTotal.textContent = counts.side;
    el.sbMainTotal.classList.toggle('bad', counts.main < MTG.MIN_MAIN);
    el.sbSideTotal.classList.toggle('bad', counts.side > MTG.MAX_SIDE);
    el.sbMainCount.textContent = `(${counts.main})`;
    el.sbProblems.replaceChildren(...problems.map((p) => h('li', null, p)));
    el.sbStartBtn.disabled = problems.length > 0;
    el.sbStartBtn.title = problems.length ? problems.join('\n') : '';
    diffView(el.sbDiff);
    renderPlanControls();
    sbList(el.sbMain, match.config.main, 'main');
    renderSideboardZone();
  }

  function onSideboardClick(e) {
    const btn = e.target.closest('.sb-card');
    if (!btn || !match) return;
    if (!sideboarding) {
      showToast(t('sb.lockedToast'));
      return;
    }
    if (MTG.moveOne(match.config, btn.dataset.name, btn.dataset.to)) {
      hidePreview();
      setPlanMessage('');
      renderSideboarding();
    }
  }


  // ---------- サイドプラン（マッチアップごとの入れ替え） ----------

  /** このデッキのプラン：組み込みプラン → 保存したプラン */
  function plansFor(deck) {
    return [...MTG.presetSidePlans(deck.name), ...MTG.SidePlanStore.list(deck.name)];
  }

  /** 今の構成に当たるプラン。value は選択欄の値（'' = 元のリスト、'__custom' = 手で入れ替えた） */
  function currentPlan() {
    if (MTG.isOriginal(match.deck, match.config)) return { value: '', plan: null };
    const plan = MTG.matchingPlan(match.deck, match.config, plansFor(match.deck));
    return plan ? { value: plan.id, plan } : { value: '__custom', plan: null };
  }

  function setPlanMessage(text, kind = '') {
    el.sbPlanMsg.textContent = text || '';
    el.sbPlanMsg.className = 'sb-plan-msg' + (kind ? ' ' + kind : '');
  }

  function renderPlanControls() {
    const plans = plansFor(match.deck);
    const builtin = plans.filter((p) => p.builtin);
    const saved = plans.filter((p) => !p.builtin);
    const opt = (p) => h('option', { value: p.id, textContent: p.name });
    const { value, plan } = currentPlan();
    el.sbPlanSelect.replaceChildren(...[
      h('option', { value: '', textContent: t('plan.original') }),
      value === '__custom' && h('option', { value: '__custom', textContent: t('plan.custom') }),
      builtin.length && h('optgroup', { label: t('plan.groupBuiltin') }, builtin.map(opt)),
      h('optgroup', { label: t('plan.groupSaved') },
        saved.length ? saved.map(opt) : h('option', { value: '__none', disabled: true, textContent: t('plan.none') })),
    ].filter(Boolean));
    el.sbPlanSelect.value = value;

    const problems = MTG.validateConfig(match.config);
    el.sbPlanSaveBtn.disabled = problems.length > 0 || value === '';
    el.sbPlanSaveBtn.title = value === '' ? t('plan.saveNeedSwap')
      : problems.length ? t('plan.saveNeedRules') : t('plan.saveTitle');
    el.sbPlanDeleteBtn.disabled = !plan || plan.builtin;
    el.sbPlanDeleteBtn.title = plan && plan.builtin ? t('plan.cannotDeleteBuiltin') : '';
    el.sbPlanExportBtn.disabled = plans.length === 0;
  }

  function onPlanSelect() {
    const value = el.sbPlanSelect.value;
    if (value === '__custom' || value === '__none') return;
    if (value === '') {
      match.config = MTG.createConfig(match.deck);
      setPlanMessage(t('plan.reset'));
    } else {
      const plan = plansFor(match.deck).find((p) => p.id === value);
      if (!plan) return;
      const { config, skipped } = MTG.applyPlan(match.deck, plan);
      match.config = config;
      if (skipped.length) {
        const list = skipped.map((x) => t('plan.skippedItem', { name: displayName(x, cardService.get(x.name)), n: x.count, why: x.to === 'main' ? t('plan.notInSide') : t('plan.notInMain') })).join(t('sb.listSep'));
        setPlanMessage(t('plan.appliedSkipped', { name: plan.name, list }), 'warn');
      } else {
        setPlanMessage(t('plan.applied', { name: plan.name }));
      }
    }
    closePlanForm();
    renderSideboarding();
  }

  function openPlanForm() {
    const { plan } = currentPlan();
    el.sbPlanForm.hidden = false;
    el.sbPlanName.value = plan && !plan.builtin ? plan.name : '';
    el.sbPlanName.focus();
  }

  function closePlanForm() {
    el.sbPlanForm.hidden = true;
  }

  function onPlanSave(e) {
    e.preventDefault();
    const name = el.sbPlanName.value.trim();
    if (!name) {
      setPlanMessage(t('plan.needName'), 'warn');
      el.sbPlanName.focus();
      return;
    }
    if (MTG.validateConfig(match.config).length) return;
    if (MTG.presetSidePlans(match.deck.name).some((p) => p.name === name)) {
      setPlanMessage(t('plan.builtinName', { name }), 'warn');
      return;
    }
    if (MTG.SidePlanStore.find(match.deck.name, name) && !confirm(t('plan.confirmOverwrite', { name }))) return;
    MTG.SidePlanStore.save(match.deck.name, MTG.planFromConfig(match.deck, match.config, name));
    closePlanForm();
    setPlanMessage(t('plan.saved', { name }));
    renderSideboarding();
  }

  function onPlanDelete() {
    const { plan } = currentPlan();
    if (!plan || plan.builtin || !confirm(t('plan.confirmDelete', { name: plan.name }))) return;
    MTG.SidePlanStore.remove(plan.id);
    setPlanMessage(t('plan.deleted', { name: plan.name }));
    renderSideboarding();
  }

  function onPlanExport() {
    const plans = plansFor(match.deck);
    if (!plans.length) return;
    const blob = new Blob([MTG.exportPlansJSON(match.deck.name, plans)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: t('plan.fileName', { name: deckLabel(match.deck).replace(/[\\/:*?"<>|]/g, '_') }) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setPlanMessage(t('plan.exported', { n: plans.length }));
  }

  async function onPlanImport() {
    const file = el.sbPlanImport.files[0];
    el.sbPlanImport.value = ''; // 同じファイルをもう一度選べるように
    if (!file) return;
    let text;
    try {
      text = await readTextFile(file);
    } catch (e) {
      setPlanMessage(t('plan.fileUnreadable'), 'warn');
      return;
    }
    const result = MTG.parsePlansJSON(text);
    if (result.error) {
      setPlanMessage(t('plan.importFailed', { error: result.code ? t('plan.err.' + result.code, result.params) : result.error }), 'warn');
      return;
    }
    if (!result.plans.length) {
      setPlanMessage(t('plan.importEmpty'), 'warn');
      return;
    }
    const dup = result.plans.filter((p) => MTG.SidePlanStore.find(p.deck, p.name)).length;
    if (dup && !confirm(t('plan.confirmImportOverwrite', { n: dup }))) return;
    const { added, replaced } = MTG.SidePlanStore.importMany(result.plans);
    const here = result.plans.filter((p) => p.deck === match.deck.name).length;
    const other = result.plans.length - here;
    setPlanMessage(t('plan.imported', { total: added + replaced, added, replaced })
      + (other ? t('plan.importedOther', { n: other }) : ''));
    renderSideboarding();
  }

  /** サイドボーディング画面に入る（ゲーム開始前） */
  function enterSideboarding() {
    game = null;
    setPlanMessage('');
    closePlanForm();
    history = [];
    sideboarding = true;
    hidePreview();
    closeNextGameMenu();
    el.gameToast.classList.remove('show');
    el.gameView.classList.add('sideboarding');
    renderSideboarding();
    el.deckView.hidden = true;
    el.gameView.hidden = false;
    window.scrollTo(0, 0);
  }

  /** デッキ画面の「開始」：第1ゲームのサイドボーディングへ */
  function startMatch() {
    const deck = selectedDeck();
    if (!deck) return;
    imageMode = el.imageMode.value;
    match = { deck, config: MTG.createConfig(deck), gameNumber: 1 };
    enterSideboarding();
  }

  /** 「ゲーム開始」：今のメインをシャッフルして7枚引く。ここから先は入れ替えできない */
  function startGame() {
    if (!match || MTG.validateConfig(match.config).length) return;
    game = createGame({ name: match.deck.name, main: match.config.main });
    sideboarding = false;
    history = []; // 「元に戻す」でサイドボーディングに戻れないように
    releaseDrawAnchor();
    highlight = null;
    hidePreview();
    el.gameView.classList.remove('sideboarding');
    el.library.scrollTop = 0;
    renderGame();
    renderSideboardZone();
    window.scrollTo(0, 0);
  }

  /** 「次のゲーム」：サイド後の構成を引き継ぐ（keep）か、元のリストに戻す */
  /**
   * 「次のゲーム」
   *   'start'  … 現在の構成を引き継いで、サイドボーディングを通さずにすぐ開始
   *   'adjust' … 現在の構成のまま、サイドボーディング画面へ
   *   'reset'  … 元のリストに戻して、サイドボーディング画面へ
   */
  function nextGame(mode) {
    if (!match) return;
    if (mode === 'reset') match.config = MTG.createConfig(match.deck);
    match.gameNumber += 1;
    closeNextGameMenu();
    if (mode === 'start' && MTG.validateConfig(match.config).length === 0) {
      startGame();
      showToast(t('game.started', { n: match.gameNumber }));
      return;
    }
    enterSideboarding();
  }

  function closeNextGameMenu() {
    el.nextGameMenu.hidden = true;
    el.nextGameBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleNextGameMenu() {
    const open = el.nextGameMenu.hidden;
    el.nextGameMenu.hidden = !open;
    el.nextGameBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      // 入れ替えをしていないときは、そのことを2行目に添える
      const label = t('game.nextStart');
      if (MTG.isOriginal(match.deck, match.config)) {
        el.nextStartBtn.replaceChildren(label, h('br'), h('small', { className: 'menu-note' }, t('game.nextStartNote')));
      } else {
        el.nextStartBtn.replaceChildren(label);
      }
    }
  }

  let sideCollapsed = !!Prefs.get('sideCollapsed', false);

  function toggleSide() {
    sideCollapsed = !sideCollapsed;
    Prefs.set('sideCollapsed', sideCollapsed);
    renderSideboardZone();
  }

  function backToDecks() {
    game = null;
    match = null;
    sideboarding = false;
    history = [];
    closeNextGameMenu();
    el.gameView.classList.remove('sideboarding');
    hidePreview();
    el.gameView.hidden = true;
    el.deckView.hidden = false;
  }

  // ---------- 初期化 ----------

  el.saveBtn.addEventListener('click', onSave);
  el.expandBtn.addEventListener('click', () => setDeckTextExpanded(!el.deckText.classList.contains('expanded')));
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
  el.startBtn.addEventListener('click', startMatch);
  el.sbStartBtn.addEventListener('click', startGame);
  el.sbMain.addEventListener('click', onSideboardClick);
  el.sideList.addEventListener('click', onSideboardClick);
  el.sideToggle.addEventListener('click', toggleSide);
  el.sbPlanSelect.addEventListener('change', onPlanSelect);
  el.sbPlanSaveBtn.addEventListener('click', openPlanForm);
  el.sbPlanForm.addEventListener('submit', onPlanSave);
  el.sbPlanCancel.addEventListener('click', closePlanForm);
  el.sbPlanDeleteBtn.addEventListener('click', onPlanDelete);
  el.sbPlanExportBtn.addEventListener('click', onPlanExport);
  el.sbPlanImport.addEventListener('change', onPlanImport);
  el.nextGameBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNextGameMenu(); });
  el.nextStartBtn.addEventListener('click', () => nextGame('start'));
  el.nextKeepBtn.addEventListener('click', () => nextGame('adjust'));
  el.nextResetBtn.addEventListener('click', () => nextGame('reset'));
  document.addEventListener('click', (e) => {
    if (!el.nextGameMenu.hidden && !e.target.closest('.next-game')) closeNextGameMenu();
  });
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
  el.battlefield.addEventListener('dragstart', onDragStart);
  el.battlefield.addEventListener('dragover', onDragOver);
  el.battlefield.addEventListener('dragleave', (e) => {
    if (!el.battlefield.contains(e.relatedTarget)) clearDropMarks();
  });
  el.battlefield.addEventListener('drop', onDrop);
  el.battlefield.addEventListener('dragend', onDragEnd);
  el.gameView.addEventListener('click', onMoveClick);
  el.gameView.addEventListener('mouseover', onPreviewOver);
  el.gameView.addEventListener('mouseleave', hidePreview);
  window.addEventListener('scroll', hidePreview, { passive: true });
  el.library.addEventListener('scroll', hidePreview, { passive: true });

  // カード画像の設定。以前の「表示しない（文字だけ）」は、いきなり英語にならないよう「表示する（日本語版を優先）」に移す
  const savedImageMode = Prefs.get('imageMode', 'ja');
  el.imageMode.value = ['ja', 'en', 'work'].includes(savedImageMode) ? savedImageMode : 'ja';
  if (savedImageMode !== el.imageMode.value) Prefs.set('imageMode', el.imageMode.value);
  el.imageMode.addEventListener('change', () => {
    Prefs.set('imageMode', el.imageMode.value);
    const lang = el.imageMode.value === 'work' ? 'en' : 'ja';
    if (lang !== MTG.getLang()) {
      MTG.setLang(lang);
      refreshLanguage();
    }
    const deck = selectedDeck();
    if (deck) loadImages(deck);
  });

  /** 言語を切り替えたあと、画面全体の文言を描き直す（切り替えられるのはデッキ画面） */
  function refreshLanguage() {
    MTG.applyI18n();
    setDeckTextExpanded(el.deckText.classList.contains('expanded'));
    el.parseMessage.replaceChildren();
    el.diagnoseResult.hidden = true;
    renderSortButtons();
    renderDeckSelect(el.deckSelect.value);
  }
  document.addEventListener('keydown', onKeyDown);

  MTG.setLang(el.imageMode.value === 'work' ? 'en' : 'ja');
  MTG.applyI18n();
  setDeckTextExpanded(false);
  renderSortButtons();
  renderDeckSelect(DeckStore.getSelectedId());
  document.documentElement.classList.add('i18n-ready'); // 言語を決めてから画面を見せる
})();
