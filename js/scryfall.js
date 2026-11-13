/*
 * Scryfall API からカード情報（種類・日本語名・マナ総量）を取得し、localStorage にキャッシュする。
 *
 * 1. POST /cards/collection（最大75枚/回）で英語名から type_line・oracle_id を取得
 * 2. GET /cards/search?q=lang:ja (oracleid:… or …) で日本語版の printed_name を取得
 *
 * キャッシュ済みのカードは問い合わせない。見つからなかったカードも1日はキャッシュする。
 * リクエストの間隔は 100ms 以上空ける（Scryfall のレート制限への配慮）。
 */
(function (root) {
  'use strict';

  const classifyType = typeof module !== 'undefined' && module.exports
    ? require('./cards.js').classifyType
    : root.MTG.classifyType;

  const API = 'https://api.scryfall.com';
  const CACHE_KEY = 'mtg-goldfish:cards:v1';
  const COLLECTION_CHUNK = 75;
  /** 検索文の最大長。Scryfall は約1000文字を超える検索文を途中で切ってしまう（「括弧が閉じていない」エラーになる） */
  const MAX_QUERY_LENGTH = 900;
  const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;
  const MAX_RETRIES = 2;
  /** キャッシュの形式。これより古い形式のカードは取得し直す（v2 で画像を追加、v3 で日本語名を全部の版から探すように） */
  const SCHEMA = 3;

  /** 分割・両面カードは第1面の名前（"Fire // Ice" → "Fire"）。Scryfall はこの名前で検索できる */
  function frontFace(name) {
    return name.split(/\s*\/\/?\s*/)[0].trim();
  }

  /** キャッシュのキー：第1面・アクセント記号なし・小文字（"Lim-Dûl's Vault" = "lim-dul's vault"） */
  function lookupKey(name) {
    return frontFace(name)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function faces(card) {
    return Array.isArray(card.card_faces) ? card.card_faces : [];
  }

  function oracleIdOf(card) {
    return card.oracle_id || (faces(card)[0] && faces(card)[0].oracle_id) || null;
  }

  function japaneseNameOf(card) {
    if (card.printed_name) return card.printed_name;
    const names = faces(card).map((f) => f.printed_name).filter(Boolean);
    return names.length ? names.join(' // ') : null;
  }

  /** カード画像（両面カードは第1面）。画像がない・仮画像なら null */
  function imageOf(card) {
    if (card.image_status === 'missing' || card.image_status === 'placeholder') return null;
    const uris = card.image_uris || (faces(card)[0] && faces(card)[0].image_uris);
    return (uris && uris.normal) || null;
  }

  function toEntry(card, fetchedAt) {
    const typeLine = card.type_line || faces(card).map((f) => f.type_line).filter(Boolean).join(' // ');
    const cmc = typeof card.cmc === 'number' ? card.cmc : (faces(card)[0] && faces(card)[0].cmc) || 0;
    return {
      name: card.name,
      jaName: null,
      typeLine,
      category: classifyType(typeLine),
      cmc,
      oracleId: oracleIdOf(card),
      imageEn: imageOf(card),
      imageJa: null,
      v: SCHEMA,
      fetchedAt,
    };
  }

  function chunk(array, size) {
    const out = [];
    for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
    return out;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** 日本語版を探す検索文を、長さの上限を超えないように分けて作る */
  function japaneseSearchQueries(oracleIds, maxLength = MAX_QUERY_LENGTH) {
    const queries = [];
    let ids = [];
    const build = (list) => `lang:ja (${list.map((id) => 'oracleid:' + id).join(' or ')})`;
    oracleIds.forEach((id) => {
      if (ids.length && build([...ids, id]).length > maxLength) {
        queries.push({ q: build(ids), count: ids.length });
        ids = [];
      }
      ids.push(id);
    });
    if (ids.length) queries.push({ q: build(ids), count: ids.length });
    return queries;
  }

  /**
   * @param {{fetchImpl: Function, storage: Storage, delayMs?: number, now?: () => number}} options
   */
  /**
   * @param {object} options
   * @param {number} [options.delayMs] リクエストの間隔。Scryfall は検索系の API に回数制限があるため 500ms 空ける
   * @param {number[]} [options.networkRetryDelaysMs] 接続に失敗したときに待ってから再試行する時間。
   *   Scryfall の回数制限の応答（429）には CORS ヘッダーが付かず、ブラウザでは接続エラーに見えるため、
   *   接続エラーも待ってから再試行する（制限の解除まで 30 秒ほどかかることがある）
   */
  function createCardService({
    fetchImpl, storage, delayMs = 500, timeoutMs = 20000,
    networkRetryDelaysMs = [2000, 30000], now = () => Date.now(),
  }) {
    let cache = loadCache();
    let lastRequestAt = 0;
    let queue = Promise.resolve();
    let postBlocked = false;
    /** 再試行の待ち時間を画面に知らせる（fetchMissing の間だけ設定） */
    let onWait = null;

    function loadCache() {
      try {
        const data = JSON.parse(storage.getItem(CACHE_KEY));
        return data && typeof data === 'object' ? data : {};
      } catch (e) {
        return {};
      }
    }

    function saveCache() {
      try {
        storage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (e) {
        console.warn('カード情報のキャッシュを保存できませんでした', e);
      }
    }

    function isFresh(entry) {
      if (!entry) return false;
      if (entry.notFound) return now() - entry.fetchedAt < NOT_FOUND_TTL_MS;
      return entry.v === SCHEMA;
    }

    /** キャッシュからカード情報を返す（未取得・見つからなかったカードは null） */
    function get(name) {
      const entry = cache[lookupKey(name)];
      return entry && !entry.notFound ? entry : null;
    }

    /** まだ取得していないカード名（重複なし） */
    function missing(names) {
      const seen = new Set();
      return names.filter((n) => {
        const k = lookupKey(n);
        if (seen.has(k) || isFresh(cache[k])) return false;
        seen.add(k);
        return true;
      });
    }

    function clearCache() {
      cache = {};
      storage.removeItem(CACHE_KEY);
    }

    function cacheSize() {
      return Object.values(cache).filter((e) => !e.notFound).length;
    }

    async function request(url, init = {}, { retryDelays = networkRetryDelaysMs, attempt = 0 } = {}) {
      const wait = lastRequestAt + delayMs - now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = now();

      // 応答がないまま待ち続けないよう、一定時間で打ち切る
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller && setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(url, {
          ...init,
          headers: { Accept: 'application/json', ...(init.headers || {}) },
          signal: controller ? controller.signal : undefined,
        });
      } catch (e) {
        const timedOut = e && e.name === 'AbortError';
        if (attempt < retryDelays.length) {
          const ms = retryDelays[attempt];
          if (onWait) onWait(Math.round(ms / 1000));
          await sleep(ms);
          return request(url, init, { retryDelays, attempt: attempt + 1 });
        }
        const err = new Error(timedOut
          ? `Scryfall から応答がありません（${Math.round(timeoutMs / 1000)}秒）`
          : `Scryfall に接続できません（${e && e.message ? e.message : e}）`);
        err.network = true;
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (res.status === 429 && attempt < MAX_RETRIES) {
        await sleep(1000 * (attempt + 1));
        return request(url, init, { retryDelays, attempt: attempt + 1 });
      }
      const body = await res.json().catch(() => null);
      if (res.status === 404 && body && body.object === 'error') return null; // 検索結果が0件
      if (!res.ok) {
        throw new Error(`Scryfall エラー (${res.status})${body && body.details ? ': ' + body.details : ''}`);
      }
      return body;
    }

    /**
     * 英語名からカードを取得する。通常は POST /cards/collection でまとめて取得。
     * POST が通らない環境（ネットワークの中継などで止められる）では、
     * GET /cards/named?exact= で1枚ずつ取得する方法に自動で切り替える。
     */
    async function fetchCardsByName(names, onEach) {
      if (!postBlocked) {
        try {
          const body = await request(`${API}/cards/collection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifiers: names.map((name) => ({ name })) }),
          });
          return (body && body.data) || [];
        } catch (e) {
          if (!e.network) throw e;
          postBlocked = true; // 以降は1枚ずつ取得
          console.warn('POST /cards/collection が使えないため、1枚ずつ取得します', e);
        }
      }
      const cards = [];
      for (let i = 0; i < names.length; i++) {
        const card = await request(`${API}/cards/named?${new URLSearchParams({ exact: names[i] })}`);
        if (card) cards.push(card);
        if (onEach) onEach(i + 1);
      }
      return cards;
    }

    async function fetchMissing(names, onProgress) {
      const targets = new Map(); // key -> 問い合わせに使う名前
      missing(names).forEach((n) => targets.set(lookupKey(n), frontFace(n)));
      const keys = [...targets.keys()];
      const total = keys.length;
      const notFound = [];
      if (total === 0) return { fetched: 0, notFound };

      // 進み具合を画面に知らせる（再試行の待ち時間も）
      let current = { phase: 'type', done: 0, total };
      const track = (phase, done, of = total) => {
        current = { phase, done, total: of };
        if (onProgress) onProgress(current);
      };
      onWait = (seconds) => onProgress && onProgress({ ...current, waiting: seconds });
      track('type', 0);

      // 1. カード種類
      const found = new Map(); // key -> entry
      let done = 0;
      for (const part of chunk(keys, COLLECTION_CHUNK)) {
        const cards = await fetchCardsByName(part.map((k) => targets.get(k)), (n) => {
          track('type', done + n);
        });
        const byKey = new Map();
        cards.forEach((card) => {
          [card.name, ...faces(card).map((f) => f.name)].forEach((n) => n && byKey.set(lookupKey(n), card));
        });
        part.forEach((k) => {
          const card = byKey.get(k);
          if (card) {
            found.set(k, toEntry(card, now()));
          } else {
            notFound.push(targets.get(k));
            cache[k] = { notFound: true, fetchedAt: now() };
          }
        });
        done += part.length;
        track('type', done);
      }
      saveCache();

      // 2. 日本語名（日本語版が存在しないカードは jaName = null のまま）
      const byOracle = new Map();
      found.forEach((entry) => {
        if (!entry.oracleId) return;
        if (!byOracle.has(entry.oracleId)) byOracle.set(entry.oracleId, []);
        byOracle.get(entry.oracleId).push(entry);
      });
      const oracleIds = [...byOracle.keys()];
      done = 0;
      track('ja', 0, oracleIds.length);
      /** 日本語版を検索して、日本語名（と画像）を入れる。unique: 'cards' は代表の1版、'prints' は全部の版 */
      const searchJapanese = async (ids, unique, onChunk) => {
        for (const { q, count } of japaneseSearchQueries(ids)) {
          let url = `${API}/cards/search?${new URLSearchParams({ q, unique })}`;
          while (url) {
            const body = await request(url);
            if (!body) break;
            (body.data || []).forEach((card) => {
              const ja = japaneseNameOf(card);
              const image = imageOf(card);
              (byOracle.get(oracleIdOf(card)) || []).forEach((e) => {
                if (e.jaName) return; // すでに日本語名が取れている
                if (ja) e.jaName = ja;
                if (image && (ja || !e.imageJa)) e.imageJa = image;
              });
            });
            url = body.has_more ? body.next_page : null;
          }
          if (onChunk) onChunk(count);
        }
      };

      await searchJapanese(oracleIds, 'cards', (count) => {
        done += count;
        track('ja', done, oracleIds.length);
      });

      // 代表の版に日本語名がないカード（例: Shelldock Isle は名前の入っていない日本語版のシークレットレアが代表になる）は、
      // 全部の日本語版から日本語名のあるものを探す。日本語版が1つもないカードは結果0件で終わる
      const withoutName = oracleIds.filter((id) => byOracle.get(id).every((e) => !e.jaName));
      if (withoutName.length) await searchJapanese(withoutName, 'prints');

      // 日本語名まで取れたものだけキャッシュに入れる（途中で失敗したら次回やり直す）
      found.forEach((entry, k) => { cache[k] = entry; });
      saveCache();
      return { fetched: found.size, notFound };
    }

    /** 未取得のカード情報を取得してキャッシュする（同時に呼ばれても1件ずつ順番に処理） */
    function ensure(names, onProgress) {
      const run = () => fetchMissing(names, onProgress).finally(() => { onWait = null; });
      const p = queue.then(run, run);
      queue = p.catch(() => {});
      return p;
    }

    /**
     * 接続チェック。どこで止まっているかを調べる
     * @param {(url: string) => Promise<void>} loadImage 画像を読み込めたら resolve する関数
     * @returns {Promise<{id, label, ok, detail}[]>}
     */
    async function diagnose(loadImage) {
      const results = [];
      const noRetry = { retryDelays: [] };
      const step = async (id, label, fn) => {
        try {
          const detail = await fn();
          results.push({ id, label, ok: true, detail });
          return true;
        } catch (e) {
          results.push({ id, label, ok: false, detail: e && e.message ? e.message : String(e) });
          return false;
        }
      };

      let imageUrl = null;
      await step('get', 'Scryfall API に接続（カード1枚の取得）', async () => {
        const card = await request(`${API}/cards/named?exact=Ancient%20Tomb`, {}, noRetry);
        if (!card || card.name !== 'Ancient Tomb') throw new Error('想定外の応答です');
        imageUrl = imageOf(card);
        return `取得できました（${card.name}）`;
      });
      await step('post', 'まとめて取得（カード種類用）', async () => {
        const body = await request(`${API}/cards/collection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers: [{ name: 'Ancient Tomb' }] }),
        }, noRetry);
        if (!body || !body.data || !body.data.length) throw new Error('想定外の応答です');
        return '取得できました';
      });
      await step('ja', '日本語名の検索', async () => {
        const body = await request(`${API}/cards/search?${new URLSearchParams({ q: 'lang:ja !"Ancient Tomb"', unique: 'cards' })}`, {}, noRetry);
        const ja = body && body.data && body.data[0] && japaneseNameOf(body.data[0]);
        if (!ja) throw new Error('日本語名が見つかりませんでした');
        return `取得できました（${ja}）`;
      });
      await step('image', 'カード画像の読み込み（cards.scryfall.io）', async () => {
        if (!imageUrl) throw new Error('API に接続できないため、画像のアドレスが分かりません');
        await loadImage(imageUrl);
        return '読み込めました';
      });
      return results;
    }

    return { get, missing, ensure, clearCache, cacheSize, diagnose };
  }

  const api = { createCardService, lookupKey, frontFace, japaneseNameOf, imageOf, japaneseSearchQueries };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MTG = Object.assign(root.MTG || {}, api, {
      cardService: createCardService({ fetchImpl: root.fetch.bind(root), storage: root.localStorage }),
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
