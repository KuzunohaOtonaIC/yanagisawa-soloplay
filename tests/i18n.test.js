const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { I18N, t, setLang } = require('../js/i18n.js');

test('対応表：すべての項目に日本語と英語がある', () => {
  Object.entries(I18N).forEach(([key, v]) => {
    assert.ok(typeof v.ja === 'string' && v.ja.length > 0, `${key} の ja`);
    assert.ok(typeof v.en === 'string', `${key} の en`);
    assert.ok(v.en.length > 0, `${key} の en が空`);
    // 英語に日本語の文字が混ざっていない
    assert.ok(!/[぀-ヿ一-鿿]/.test(v.en), `${key} の en に日本語: ${v.en}`);
  });
});

test('t()：言語の切り替え・{…}の差し込み・英語がないときは日本語', () => {
  setLang('ja');
  assert.equal(t('decks.start'), '開始');
  assert.equal(t('sb.counts', { main: 60, side: 15 }), 'メイン 60 枚 ／ サイド 15 枚');
  setLang('en');
  assert.equal(t('decks.start'), 'Start');
  assert.equal(t('toast.drew', { name: 'Ancient Tomb' }), 'Drew Ancient Tomb');
  assert.equal(t('no.such.key'), 'no.such.key');
  I18N['test.only.ja'] = { ja: 'テスト', en: '' };
  assert.equal(t('test.only.ja'), 'テスト'); // en が空なら日本語
  delete I18N['test.only.ja'];
  setLang('ja');
});

test('index.html と app.js が使っている項目は、すべて対応表にある', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n(?:-title|-placeholder|-aria)?="([^"]+)"/g)) keys.add(m[1]);
  for (const m of app.matchAll(/\bt\('([\w.]+)'/g)) keys.add(m[1]);
  const missing = [...keys].filter((k) => !I18N[k] && !k.endsWith('.'));
  assert.deepEqual(missing, []);
  // 'type.' + id / 'moved.' + to / 'sb.problem.' + code / 'plan.err.' + code / 'diag.label.' + id などの組み立て
  ['creature', 'planeswalker', 'battle', 'instant', 'sorcery', 'artifact', 'enchantment', 'land', 'other', 'unknown'].forEach((id) => assert.ok(I18N['type.' + id], id));
  ['hand', 'battlefield', 'graveyard', 'exile', 'top', 'bottom'].forEach((to) => assert.ok(I18N['moved.' + to], to));
  ['mainShort', 'sideOver'].forEach((c) => assert.ok(I18N['sb.problem.' + c], c));
  ['json', 'format', 'version', 'plans', 'deck', 'name', 'cards'].forEach((c) => assert.ok(I18N['plan.err.' + c], c));
  ['get', 'post', 'ja', 'image'].forEach((id) => assert.ok(I18N['diag.label.' + id], id));
  ['network', 'timeout', 'http'].forEach((c) => assert.ok(I18N['err.' + c], c));
});
