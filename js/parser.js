/*
 * デッキリスト（MTGO形式）のパーサー
 *
 *   4 Ancient Tomb
 *   4 City of Traitors
 *   SIDEBOARD:
 *   2 Chalice of the Void
 *
 * - "4x Name" 表記も可
 * - Arena 形式の末尾 "(SET) 123" は取り除く
 * - 空行、"//" "#" で始まる行は無視
 * - 同じカードが複数行にある場合は枚数を合算
 */
(function (root) {
  'use strict';

  const CARD_LINE_RE = /^(\d+)\s*[xX]?\s+(.+?)\s*$/;
  const SET_SUFFIX_RE = /\s+\([A-Za-z0-9]{2,6}\)(?:\s+[A-Za-z0-9★-]+)?$/;
  const SIDEBOARD_RE = /^side\s?board\s*:?$/i;
  const MAIN_RE = /^(deck|main\s?deck)\s*:?$/i;

  function normalizeName(name) {
    return name.replace(/\s+/g, ' ').trim();
  }

  /** カード名の比較用キー（大文字小文字を区別しない） */
  function nameKey(name) {
    return normalizeName(name).toLowerCase();
  }

  function addCard(map, name, count) {
    const key = nameKey(name);
    const entry = map.get(key);
    if (entry) {
      entry.count += count;
    } else {
      map.set(key, { count, name });
    }
  }

  /**
   * @param {string} text
   * @returns {{main: {count:number,name:string}[], side: {count:number,name:string}[], errors: {line:number,text:string}[]}}
   */
  function parseDeckList(text) {
    const main = new Map();
    const side = new Map();
    const errors = [];
    let target = main;

    String(text || '').split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) return;
      if (SIDEBOARD_RE.test(line)) { target = side; return; }
      if (MAIN_RE.test(line)) { target = main; return; }

      const m = CARD_LINE_RE.exec(line);
      if (!m) {
        errors.push({ line: index + 1, text: raw });
        return;
      }
      const count = parseInt(m[1], 10);
      const name = normalizeName(m[2].replace(SET_SUFFIX_RE, ''));
      if (count <= 0 || !name) {
        errors.push({ line: index + 1, text: raw });
        return;
      }
      addCard(target, name, count);
    });

    return { main: [...main.values()], side: [...side.values()], errors };
  }

  function countCards(list) {
    return list.reduce((sum, e) => sum + e.count, 0);
  }

  /** 保存済みデッキを MTGO 形式のテキストに戻す */
  function deckToText(deck) {
    const lines = deck.main.map((e) => `${e.count} ${e.name}`);
    if (deck.side && deck.side.length) {
      lines.push('', 'SIDEBOARD:');
      deck.side.forEach((e) => lines.push(`${e.count} ${e.name}`));
    }
    return lines.join('\n');
  }

  const api = { parseDeckList, countCards, deckToText, nameKey, normalizeName };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
