/*
 * 組み込みデッキ（誰が開いても最初からデッキ一覧に出る。削除はできない）
 * 先頭のデッキが、初めて開いた人に表示される既定のデッキ
 * text は MTGO 形式。読み込み時に parser.js で解析する
 */
(function (root) {
  'use strict';

  const parseDeckList = typeof module !== 'undefined' && module.exports
    ? require('./parser.js').parseDeckList
    : root.MTG.parseDeckList;

  const PRESETS = [
    {
      id: 'preset:hogaak',
      nameEn: 'BU Hogaak (Yanagisawa Style)', // 英語のみ（業務用）での表示名
      name: "柳澤流ホガーク(本人歌唱)",
      text: `
3 Verdant Catacombs
2 Marsh Flats
2 Polluted Delta
2 Bloodstained Mire
4 Underground Sea
1 Undercity Sewers
1 Swamp
3 Wasteland
4 Hogaak, Arisen Necropolis
4 Moonshadow
4 Dark Matter Manipulator
4 Stitcher's Supplier
3 Orcish Bowmasters
2 Brazen Borrower
4 Brainstorm
4 Ponder
4 Daze
4 Force of Will
3 Thoughtseize
2 Fatal Push

Sideboard
3 Consign to Memory
3 Dauthi Voidwalker
2 Barrowgoyf
2 Massacre
1 Brazen Borrower
1 Fatal Push
1 Legion's End
1 Engineered Explosives
1 Force of Negation
`,
      // 組み込みサイドプラン（誰が開いても最初から入っている）。例：
      // { name: 'vsホガーク', in: [{ count: 2, name: 'Rest in Peace' }], out: [{ count: 2, name: 'Defense Grid' }] }
      sidePlans: [],
    },
    {
      id: 'preset:jujutsu-shosen',
      nameEn: 'Yanagisawa Curse Telling College', // 英語のみ（業務用）での表示名
      name: '柳澤流呪術唱専',
      text: `
4 Ancient Tomb
2 Atraxa, Grand Unifier
2 Brainsurge
4 Chalice of the Void
3 Chrome Mox
1 City of Traitors
1 Cruel Reality
1 Curse of Death's Hold
4 Curse of Misfortunes
4 Defense Grid
4 Flooded Strand
4 Herald of Amity
2 Island
4 Lotus Petal
4 Overwhelming Splendor
1 Plains
1 Raph & Mikey, Troublemakers
1 Savannah
2 Scroll Rack
1 Scrubland
4 Show and Tell
4 Sink into Stupor
1 Tundra
1 Urborg, Tomb of Yawgmoth

SIDEBOARD:
2 Disruptor Flute
2 Engineered Explosives
4 Force of Will
1 Propaganda
4 Rest in Peace
1 Sanctum Prelate
1 The Stone Brain
`,
      // 組み込みサイドプラン（誰が開いても最初から入っている）。例：
      // { name: 'vsホガーク', in: [{ count: 2, name: 'Rest in Peace' }], out: [{ count: 2, name: 'Defense Grid' }] }
      sidePlans: [],
    },
    {
      id: 'preset:lo',
      nameEn: 'Welcome LO Fan club', // 英語のみ（業務用）での表示名
      name: "LO友の会会長作品",
      text: `
4 Hedron Crab
4 Ruin Crab
3 Visions of Beyond
3 Extirpate
3 Fatal Push
3 Surgical Extraction
3 Drown in the Loch
1 Crypt Incursion
4 Archive Trap
1 Murderous Cut
1 Glimpse the Unthinkable
4 Fractured Sanity
3 Tasha's Hideous Laughter
1 Jace, the Perfected Mind
1 Darkslick Shores
3 Field of Ruin
2 Flooded Strand
1 Gloomlake Verge
3 Island
1 Mikokoro, Center of the Sea
1 Oboro, Palace in the Clouds
1 Otawara, Soaring City
4 Polluted Delta
1 Shelldock Isle
2 Swamp
2 Undercity Sewers
1 Watery Grave

Sideboard
1 Engineered Explosives
3 Consign to Memory
1 Illness in the Ranks
2 Soul-Guide Lantern
2 Long Goodbye
1 The Meathook Massacre
1 Crypt Incursion
2 Ensnaring Bridge
2 Baleful Mastery
`,
      // 組み込みサイドプラン（誰が開いても最初から入っている）。例：
      // { name: 'vsホガーク', in: [{ count: 2, name: 'Rest in Peace' }], out: [{ count: 2, name: 'Defense Grid' }] }
      sidePlans: [],
    },
  ];

  let cache = null;

  /** 組み込みデッキの一覧（保存済みデッキと同じ形 + preset: true） */
  function presetDecks() {
    if (!cache) {
      cache = PRESETS.map((p) => {
        const parsed = parseDeckList(p.text);
        return {
          id: p.id, name: p.name, nameEn: p.nameEn, main: parsed.main, side: parsed.side, preset: true, errors: parsed.errors,
          sidePlans: (p.sidePlans || []).map((plan) => ({ ...plan, id: `builtin:${p.id}:${plan.name}`, builtin: true })),
        };
      });
    }
    return cache;
  }

  /** 初めて開いた人に表示するデッキ（先頭の組み込みデッキ） */
  function defaultPreset() {
    return presetDecks()[0];
  }

  /** デッキ名に対応する組み込みサイドプラン（削除不可） */
  function presetSidePlans(deckName) {
    const deck = presetDecks().find((d) => d.name === deckName);
    return deck ? deck.sidePlans : [];
  }

  function isPresetId(id) {
    return typeof id === 'string' && id.startsWith('preset:');
  }

  function getPreset(id) {
    return presetDecks().find((d) => d.id === id) || null;
  }

  const api = { presetDecks, defaultPreset, isPresetId, getPreset, presetSidePlans };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
