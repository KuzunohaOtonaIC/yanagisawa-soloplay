/*
 * カード情報の分類・ソート（DOM にも通信にも依存しない）
 * info = { name, jaName, typeLine, category, cmc }   … Scryfall から取得した情報（scryfall.js）
 */
(function (root) {
  'use strict';

  /** 表示・ソートの順序 */
  const CATEGORIES = [
    { id: 'creature', label: 'クリーチャー', match: 'Creature' },
    { id: 'planeswalker', label: 'プレインズウォーカー', match: 'Planeswalker' },
    { id: 'battle', label: 'バトル', match: 'Battle' },
    { id: 'instant', label: 'インスタント', match: 'Instant' },
    { id: 'sorcery', label: 'ソーサリー', match: 'Sorcery' },
    { id: 'artifact', label: 'アーティファクト', match: 'Artifact' },
    { id: 'enchantment', label: 'エンチャント', match: 'Enchantment' },
    { id: 'land', label: '土地', match: 'Land' },
    { id: 'other', label: 'その他' },
    { id: 'unknown', label: '種類不明' },
  ];
  const ORDER = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
  const LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

  /** 判定の優先順位（「アーティファクト・クリーチャー」はクリーチャー、「土地・クリーチャー」は土地 など） */
  const PRIORITY = ['land', 'creature', 'planeswalker', 'battle', 'instant', 'sorcery', 'artifact', 'enchantment'];

  /**
   * type_line からカード種類を判定する。両面・分割・出来事カードは第1面で判定。
   *   "Artifact Creature — Golem" → creature
   *   "Enchantment — Saga // Enchantment Creature — Goblin Shaman" → enchantment
   */
  function classifyType(typeLine) {
    if (!typeLine) return 'unknown';
    const front = typeLine.split(' // ')[0];
    const types = front.split(/\s+[—-]\s+/)[0].split(/\s+/);
    const found = PRIORITY.find((id) => types.includes(CATEGORIES[ORDER[id]].match));
    return found || 'other';
  }

  function categoryLabel(id) {
    return LABEL[id] || LABEL.unknown;
  }

  function displayName(entry, info) {
    return (info && info.jaName) || (info && info.name) || entry.name;
  }

  function englishName(entry, info) {
    return (info && info.name) || entry.name;
  }

  function categoryOf(info) {
    return (info && info.category) || 'unknown';
  }

  const collatorJa = new Intl.Collator('ja');
  const collatorEn = new Intl.Collator('en', { sensitivity: 'base' });

  const COMPARATORS = {
    // 種類 → マナ総量 → 英語名
    type: (a, b) =>
      ORDER[categoryOf(a.info)] - ORDER[categoryOf(b.info)] ||
      ((a.info && a.info.cmc) || 0) - ((b.info && b.info.cmc) || 0) ||
      collatorEn.compare(englishName(a.entry, a.info), englishName(b.entry, b.info)),
    // 日本語名（日本語名がないカードは英語名）
    ja: (a, b) =>
      collatorJa.compare(displayName(a.entry, a.info), displayName(b.entry, b.info)) ||
      collatorEn.compare(englishName(a.entry, a.info), englishName(b.entry, b.info)),
    // 英語名
    en: (a, b) => collatorEn.compare(englishName(a.entry, a.info), englishName(b.entry, b.info)),
  };

  /**
   * @param {{count:number,name:string}[]} entries
   * @param {'type'|'ja'|'en'} mode
   * @param {(name:string) => object|null} getInfo
   * @returns {{entry, info}[]}
   */
  function sortEntries(entries, mode, getInfo) {
    const cmp = COMPARATORS[mode] || COMPARATORS.type;
    return entries.map((entry) => ({ entry, info: getInfo(entry.name) })).sort(cmp);
  }

  /** ソート済みの配列を種類ごとにまとめる */
  function groupByCategory(sorted) {
    const groups = [];
    sorted.forEach((item) => {
      const id = categoryOf(item.info);
      let g = groups[groups.length - 1];
      if (!g || g.category !== id) {
        g = { category: id, label: categoryLabel(id), items: [], count: 0 };
        groups.push(g);
      }
      g.items.push(item);
      g.count += item.entry.count;
    });
    return groups;
  }

  const api = { CATEGORIES, classifyType, categoryLabel, displayName, englishName, sortEntries, groupByCategory };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
