const test = require('node:test');
const assert = require('node:assert/strict');
const { createCardService, lookupKey, frontFace, japaneseSearchQueries } = require('../js/scryfall.js');

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const CARDS = {
  'ancient tomb': { name: 'Ancient Tomb', type_line: 'Land', cmc: 0, oracle_id: 'o-tomb', ja: '古えの墳墓' },
  'fire': { name: 'Fire // Ice', type_line: 'Instant // Instant', cmc: 4, oracle_id: 'o-fire',
    card_faces: [{ name: 'Fire' }, { name: 'Ice' }], jaFaces: ['火', '氷'] },
  "lim-dul's vault": { name: "Lim-Dûl's Vault", type_line: 'Instant', cmc: 2, oracle_id: 'o-vault', ja: 'リム＝ドゥールの櫃' },
  'mox diamond': { name: 'Mox Diamond', type_line: 'Artifact', cmc: 0, oracle_id: 'o-mox' }, // 日本語版なし
};

function fakeScryfall() {
  const calls = [];
  const json = (status, body) => ({ status, ok: status < 400, json: async () => body });
  async function fetchImpl(url, init) {
    calls.push({ url, init });
    if (url.endsWith('/cards/collection')) {
      const ids = JSON.parse(init.body).identifiers;
      const data = [];
      const notFound = [];
      ids.forEach(({ name }) => {
        const c = CARDS[lookupKey(name)];
        if (c) data.push({ name: c.name, type_line: c.type_line, cmc: c.cmc, oracle_id: c.oracle_id, card_faces: c.card_faces,
          image_uris: { normal: `https://img/en/${c.oracle_id}.jpg` } });
        else notFound.push({ name });
      });
      return json(200, { data, not_found: notFound });
    }
    if (url.includes('/cards/search')) {
      const q = new URL(url).searchParams.get('q');
      // 本物の Scryfall と同じく、約1000文字を超える検索文は拒否する
      if (q.length > 1000) return json(400, { object: 'error', status: 400, details: 'Your search contains unclosed parentheses.' });
      const ids = [...q.matchAll(/oracleid:([\w-]+)/g)].map((m) => m[1])
        .concat([...q.matchAll(/!"([^"]+)"/g)].map((m) => (CARDS[lookupKey(m[1])] || {}).oracle_id));
      const data = Object.values(CARDS)
        .filter((c) => ids.includes(c.oracle_id) && (c.ja || c.jaFaces))
        .map((c) => ({
          name: c.name, lang: 'ja', oracle_id: c.oracle_id, printed_name: c.ja,
          image_status: c.oracle_id === 'o-vault' ? 'missing' : 'highres_scan',
          image_uris: { normal: `https://img/ja/${c.oracle_id}.jpg` },
          card_faces: c.jaFaces && c.jaFaces.map((p) => ({ printed_name: p })),
        }));
      if (!data.length) return json(404, { object: 'error', status: 404 });
      return json(200, { data, has_more: false });
    }
    throw new Error('unexpected url ' + url);
  }
  return { fetchImpl, calls };
}

test('frontFace / lookupKey', () => {
  assert.equal(frontFace('Fire // Ice'), 'Fire');
  assert.equal(frontFace('Fire/Ice'), 'Fire');
  assert.equal(lookupKey("Lim-Dûl's Vault"), lookupKey("lim-dul's  vault"));
});

test('種類と日本語名を取得し、キャッシュ済みのカードは問い合わせない', async () => {
  const storage = memoryStorage();
  const { fetchImpl, calls } = fakeScryfall();
  const service = createCardService({ fetchImpl, storage, delayMs: 0, networkRetryDelaysMs: [] });

  const names = ['Ancient Tomb', 'Fire // Ice', "Lim-Dul's Vault", 'Mox Diamond', 'Typo Cardd'];
  const result = await service.ensure(names);
  assert.deepEqual(result.notFound, ['Typo Cardd']);
  assert.equal(calls.length, 2); // collection 1回 + search 1回

  assert.deepEqual(
    [service.get('Ancient Tomb').jaName, service.get('Ancient Tomb').category],
    ['古えの墳墓', 'land']);
  assert.equal(service.get('Fire // Ice').jaName, '火 // 氷');
  assert.equal(service.get('Fire').name, 'Fire // Ice');
  assert.equal(service.get("Lim-Dul's Vault").jaName, 'リム＝ドゥールの櫃');
  assert.equal(service.get('Mox Diamond').jaName, null);
  assert.equal(service.get('Mox Diamond').category, 'artifact');
  assert.equal(service.get('Typo Cardd'), null);

  // 2回目は問い合わせなし
  await service.ensure(names);
  assert.equal(calls.length, 2);

  // ページを開き直しても（= 新しいサービス）キャッシュが使われる
  const again = createCardService({ fetchImpl, storage, delayMs: 0, networkRetryDelaysMs: [] });
  assert.equal(again.get('Ancient Tomb').jaName, '古えの墳墓');
  assert.deepEqual(again.missing(names), []);
  await again.ensure([...names, 'Ancient Tomb']);
  assert.equal(calls.length, 2);

  // 新しいカードだけ問い合わせる
  CARDS['blood moon'] = { name: 'Blood Moon', type_line: 'Enchantment', cmc: 3, oracle_id: 'o-moon', ja: '血染めの月' };
  await again.ensure([...names, 'Blood Moon']);
  assert.equal(calls.length, 4);
  assert.deepEqual(JSON.parse(calls[2].init.body).identifiers, [{ name: 'Blood Moon' }]);
  assert.equal(again.get('Blood Moon').jaName, '血染めの月');
});

test('見つからなかったカードは1日たつと問い合わせ直す', async () => {
  let t = 1_000_000;
  const { fetchImpl, calls } = fakeScryfall();
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [], now: () => t });
  await service.ensure(['Typo Cardd']);
  await service.ensure(['Typo Cardd']);
  assert.equal(calls.length, 1);
  t += 25 * 60 * 60 * 1000;
  await service.ensure(['Typo Cardd']);
  assert.equal(calls.length, 2);
});

test('日本語名の取得に失敗したらキャッシュせず、次回やり直す', async () => {
  const storage = memoryStorage();
  const fake = fakeScryfall();
  let fail = true;
  const fetchImpl = async (url, init) => {
    if (fail && url.includes('/cards/search')) return { status: 500, ok: false, json: async () => ({ details: 'boom' }) };
    return fake.fetchImpl(url, init);
  };
  const service = createCardService({ fetchImpl, storage, delayMs: 0, networkRetryDelaysMs: [] });
  await assert.rejects(service.ensure(['Ancient Tomb']), /500/);
  assert.equal(service.get('Ancient Tomb'), null);
  fail = false;
  await service.ensure(['Ancient Tomb']);
  assert.equal(service.get('Ancient Tomb').jaName, '古えの墳墓');
});

test('76枚以上は75枚ずつに分けて問い合わせる', async () => {
  const { fetchImpl, calls } = fakeScryfall();
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  const names = Array.from({ length: 80 }, (_, i) => `Card ${i}`);
  await service.ensure(names);
  const sizes = calls.filter((c) => c.url.endsWith('/collection')).map((c) => JSON.parse(c.init.body).identifiers.length);
  assert.deepEqual(sizes, [75, 5]);
});

test('画像URLを取得する（日本語版の画像がない・仮画像なら null）', async () => {
  const { fetchImpl } = fakeScryfall();
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  await service.ensure(['Ancient Tomb', "Lim-Dul's Vault", 'Mox Diamond']);
  assert.equal(service.get('Ancient Tomb').imageEn, 'https://img/en/o-tomb.jpg');
  assert.equal(service.get('Ancient Tomb').imageJa, 'https://img/ja/o-tomb.jpg');
  assert.equal(service.get("Lim-Dul's Vault").imageJa, null); // image_status: missing
  assert.equal(service.get('Mox Diamond').imageJa, null); // 日本語版なし
});

test('古い形式（画像なし）のキャッシュは一度だけ取得し直す', async () => {
  const storage = memoryStorage();
  storage.setItem('mtg-goldfish:cards:v1', JSON.stringify({
    'ancient tomb': { name: 'Ancient Tomb', jaName: '古えの墳墓', typeLine: 'Land', category: 'land', cmc: 0, oracleId: 'o-tomb', fetchedAt: 1 },
  }));
  const { fetchImpl, calls } = fakeScryfall();
  const service = createCardService({ fetchImpl, storage, delayMs: 0, networkRetryDelaysMs: [] });
  assert.equal(service.get('Ancient Tomb').jaName, '古えの墳墓'); // 取得し直すまでは古い情報で表示
  assert.deepEqual(service.missing(['Ancient Tomb']), ['Ancient Tomb']);
  await service.ensure(['Ancient Tomb']);
  assert.equal(service.get('Ancient Tomb').imageEn, 'https://img/en/o-tomb.jpg');
  await service.ensure(['Ancient Tomb']);
  assert.equal(calls.length, 2);
});

test('POST が通らない環境では1枚ずつ取得に切り替える', async () => {
  const fake = fakeScryfall();
  const urls = [];
  const fetchImpl = async (url, init) => {
    urls.push(url);
    if (init && init.method === 'POST') throw new TypeError('Failed to fetch');
    if (url.includes('/cards/named')) {
      const name = new URL(url).searchParams.get('exact');
      const c = CARDS[lookupKey(name)];
      if (!c) return { status: 404, ok: false, json: async () => ({ object: 'error', status: 404 }) };
      return { status: 200, ok: true, json: async () => ({ name: c.name, type_line: c.type_line, cmc: c.cmc, oracle_id: c.oracle_id, card_faces: c.card_faces }) };
    }
    return fake.fetchImpl(url, init);
  };
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  const result = await service.ensure(['Ancient Tomb', 'Fire // Ice', 'Typo Cardd']);
  assert.deepEqual(result.notFound, ['Typo Cardd']);
  assert.equal(service.get('Ancient Tomb').jaName, '古えの墳墓');
  assert.equal(service.get('Fire').typeLine, 'Instant // Instant');
  // 2回目以降は POST を試さない
  await service.ensure(['Blood Moon']);
  assert.equal(urls.filter((u) => u.endsWith('/collection')).length, 1);
});

test('接続できないときは分かりやすいエラーにする', async () => {
  const fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  await assert.rejects(service.ensure(['Ancient Tomb']), /Scryfall に接続できません（Failed to fetch）/);
});

test('応答がないときは打ち切る', async () => {
  const fetchImpl = (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, timeoutMs: 50, networkRetryDelaysMs: [] });
  await assert.rejects(service.ensure(['Ancient Tomb']), /応答がありません/);
});

test('接続チェック：どこで止まっているかを返す', async () => {
  const fake = fakeScryfall();
  const service = createCardService({ fetchImpl: fake.fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  // フェイクは /cards/named に対応していないので最初の項目は失敗、画像も確認できない
  const results = await service.diagnose(async () => {});
  assert.deepEqual(results.map((r) => [r.id, r.ok]), [['get', false], ['post', true], ['ja', true], ['image', false]]);
  const blocked = createCardService({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); }, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  assert.ok((await blocked.diagnose(async () => {})).every((r) => !r.ok));
});

test('接続エラー（隠れた回数制限）は待ってから再試行し、待ち時間を知らせる', async () => {
  const fake = fakeScryfall();
  let failures = 2;
  const fetchImpl = async (url, init) => {
    if (failures > 0) { failures--; throw new TypeError('Failed to fetch'); }
    return fake.fetchImpl(url, init);
  };
  const progress = [];
  const service = createCardService({ fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [5, 10] });
  await service.ensure(['Ancient Tomb'], (p) => progress.push(p));
  assert.equal(service.get('Ancient Tomb').jaName, '古えの墳墓');
  assert.deepEqual(progress.filter((p) => p.waiting != null).map((p) => p.waiting), [0, 0]); // 5ms, 10ms → 0秒表示
  // POST は再試行で通ったので、1枚ずつ取得には切り替わっていない
});

test('リクエストの間隔は既定で 500ms 以上空ける', async () => {
  const fake = fakeScryfall();
  const times = [];
  const fetchImpl = async (url, init) => { times.push(Date.now()); return fake.fetchImpl(url, init); };
  const service = createCardService({ fetchImpl, storage: memoryStorage(), networkRetryDelaysMs: [] });
  await service.ensure(['Ancient Tomb']);
  assert.equal(times.length, 2);
  assert.ok(times[1] - times[0] >= 490, `間隔 ${times[1] - times[0]}ms`);
});

test('日本語名の検索文は1000文字を超えないように分ける（種類の多いデッキ）', async () => {
  const fake = fakeScryfall();
  const many = Array.from({ length: 60 }, (_, i) => `Many Card ${i}`);
  many.forEach((n, i) => {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`; // 本物と同じ36文字
    CARDS[lookupKey(n)] = { name: n, type_line: 'Instant', cmc: 1, oracle_id: id, ja: `日本語${i}` };
  });
  const service = createCardService({ fetchImpl: fake.fetchImpl, storage: memoryStorage(), delayMs: 0, networkRetryDelaysMs: [] });
  await service.ensure(many);
  assert.ok(many.every((n, i) => service.get(n).jaName === `日本語${i}`));
  const searches = fake.calls.filter((c) => c.url.includes('/cards/search')).map((c) => new URL(c.url).searchParams.get('q'));
  assert.ok(searches.length >= 4);
  assert.ok(searches.every((q) => q.length <= 900));

  const ids = Array.from({ length: 50 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
  const queries = japaneseSearchQueries(ids);
  assert.equal(queries.reduce((n, x) => n + x.count, 0), 50);
  assert.ok(queries.every((x) => x.q.length <= 900));
});
