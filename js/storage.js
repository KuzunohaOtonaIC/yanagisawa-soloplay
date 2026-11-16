/*
 * デッキの保存（localStorage）
 * deck = { id, name, main: [{count, name}], side: [{count, name}], createdAt, updatedAt }
 */
(function (root) {
  'use strict';

  const DECKS_KEY = 'mtg-goldfish:decks:v1';
  const SELECTED_KEY = 'mtg-goldfish:selected-deck:v1';
  const PREFS_PREFIX = 'mtg-goldfish:pref:';
  const SIDEPLANS_KEY = 'mtg-goldfish:sideplans:v1';

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

  /**
   * サイドプランの保存（デッキ名にひもづける）
   * plan = { id, deck, name, in: [{count, name}], out: [{count, name}], createdAt, updatedAt }
   */
  const SidePlanStore = {
    all() {
      const plans = read(SIDEPLANS_KEY, []);
      return Array.isArray(plans) ? plans : [];
    },

    list(deckName) {
      return this.all().filter((p) => p.deck === deckName).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    },

    find(deckName, name) {
      return this.all().find((p) => p.deck === deckName && p.name === name.trim()) || null;
    },

    /** 同じデッキ・同じ名前があれば上書き */
    save(deckName, plan) {
      const plans = this.all();
      const now = new Date().toISOString();
      const name = plan.name.trim();
      let saved = plans.find((p) => p.deck === deckName && p.name === name);
      if (saved) {
        Object.assign(saved, { in: plan.in, out: plan.out, updatedAt: now });
      } else {
        saved = { id: newId(), deck: deckName, name, in: plan.in, out: plan.out, createdAt: now, updatedAt: now };
        plans.push(saved);
      }
      write(SIDEPLANS_KEY, plans);
      return saved;
    },

    remove(id) {
      write(SIDEPLANS_KEY, this.all().filter((p) => p.id !== id));
    },

    /** JSON から読み込んだプランをまとめて保存。上書きした件数も返す */
    importMany(list) {
      let replaced = 0;
      list.forEach((p) => {
        if (this.find(p.deck, p.name)) replaced++;
        this.save(p.deck, p);
      });
      return { added: list.length - replaced, replaced };
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

  root.MTG = Object.assign(root.MTG || {}, { DeckStore, Prefs, SidePlanStore });
})(window);
