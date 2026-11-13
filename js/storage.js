/*
 * デッキの保存（localStorage）
 * deck = { id, name, main: [{count, name}], side: [{count, name}], createdAt, updatedAt }
 */
(function (root) {
  'use strict';

  const DECKS_KEY = 'mtg-goldfish:decks:v1';
  const SELECTED_KEY = 'mtg-goldfish:selected-deck:v1';
  const PREFS_PREFIX = 'mtg-goldfish:pref:';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn('localStorage の読み込みに失敗しました', e);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function newId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  const DeckStore = {
    list() {
      const decks = read(DECKS_KEY, []);
      return Array.isArray(decks) ? decks : [];
    },

    get(id) {
      return this.list().find((d) => d.id === id) || null;
    },

    findByName(name) {
      const n = name.trim();
      return this.list().find((d) => d.name === n) || null;
    },

    /** 同名のデッキがあれば上書き、なければ新規作成 */
    save({ name, main, side }) {
      const decks = this.list();
      const now = new Date().toISOString();
      const trimmed = name.trim();
      let deck = decks.find((d) => d.name === trimmed);
      if (deck) {
        Object.assign(deck, { main, side, updatedAt: now });
      } else {
        deck = { id: newId(), name: trimmed, main, side, createdAt: now, updatedAt: now };
        decks.push(deck);
      }
      write(DECKS_KEY, decks);
      return deck;
    },

    remove(id) {
      write(DECKS_KEY, this.list().filter((d) => d.id !== id));
      if (this.getSelectedId() === id) localStorage.removeItem(SELECTED_KEY);
    },

    getSelectedId() {
      return read(SELECTED_KEY, null);
    },

    setSelectedId(id) {
      write(SELECTED_KEY, id);
    },
  };

  /** 画面の設定（並び順など） */
  const Prefs = {
    get(name, fallback) {
      return read(PREFS_PREFIX + name, fallback);
    },
    set(name, value) {
      try { write(PREFS_PREFIX + name, value); } catch (e) { /* 保存できなくても動作は続ける */ }
    },
  };

  root.MTG = Object.assign(root.MTG || {}, { DeckStore, Prefs });
})(window);
