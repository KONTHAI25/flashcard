// Run: node --test tests/vocab-c1c2.test.cjs
// Contract for the completed C1/C2 Thai–English pair dataset.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadTs(relativePath, dependencies = {}) {
  const filename = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

function part(name) {
  const file = `data/vocab/part-${name}.ts`;
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
  return loadTs(file)[`VOCAB_${name}`];
}

const THAI = /[\u0E00-\u0E7F]/;
const isThai = value => THAI.test(value);
const norm = value => value.normalize('NFKC').trim().toLowerCase();

test('part-07 is a pure, unique C1/C2 dataset with real Thai pairs', () => {
  const rows = part('07');
  assert.ok(rows.length >= 2050, `expected at least 2050 C1/C2 pairs, found ${rows.length}`);
  const c1 = rows.filter(row => row[2] === 'C1').length;
  const c2 = rows.filter(row => row[2] === 'C2').length;
  assert.ok(c1 >= 1100, `expected at least 1100 C1 rows, found ${c1}`);
  assert.ok(c2 >= 950, `expected at least 950 C2 rows, found ${c2}`);
  const seen = new Map();
  for (const [en, th, level] of rows) {
    assert.match(level, /^(C1|C2)$/, `${en} has non C1/C2 level ${level}`);
    assert.ok(typeof en === 'string' && en.trim() && typeof th === 'string' && th.trim(), `blank pair near ${JSON.stringify([en, th, level])}`);
    assert.ok(isThai(th), `${en} is missing a Thai meaning: ${JSON.stringify(th)}`);
    assert.ok(!/[<>]/.test(th), `${en} has unsafe markup in Thai meaning`);
    const key = norm(en);
    assert.ok(!seen.has(key), `duplicate English headword in part-07: ${en} (also ${seen.get(key)})`);
    seen.set(key, en);
  }
});

test('part-08 keeps the verified B1/B2 corrections that used to sit in part-07', () => {
  const corrections = new Map(part('08').map(([en, th, level]) => [norm(en), { th, level }]));
  assert.deepEqual(
    [...corrections.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([en, value]) => [en, value.level]),
    [['accuracy', 'B2'], ['admire', 'B1'], ['agenda', 'B2'], ['ambition', 'B1'], ['antique', 'B1'], ['arrogant', 'B2'], ['asset', 'B2']],
  );
  for (const [en, { th }] of corrections) assert.ok(isThai(th), `${en} correction lost its Thai meaning`);
});

test('the legacy curated A–C pairs survive the completion pass', () => {
  const rows = new Map(part('07').map(([en, th, level]) => [norm(en), { th, level }]));
  const corrections = new Map(part('08').map(([en, th, level]) => [norm(en), { th, level }]));
  const samples = [
    ['abrupt', 'C2'], ['acclaim', 'C1'], ['coalesce', 'C1'],
    ['abate', 'C2'], ['abdicate', 'C2'], ['congeal', 'C2'],
  ];
  for (const [word, level] of samples) {
    assert.ok(rows.has(word), `${word} disappeared from part-07`);
    assert.equal(rows.get(word).level, level, `${word} changed level`);
  }
  assert.ok(!rows.has('admire') && corrections.get('admire').level === 'B1');
  assert.ok(!rows.has('asset') && corrections.get('asset').level === 'B2');
});

test('every word in both committed source lists has a pair in the vocabulary', () => {
  const app = new Map();
  for (const name of ['01', '02', '03', '04', '05', '06', '07', '08']) {
    for (const [en, , level] of part(name)) app.set(norm(en), level);
  }
  for (const file of ['oxford-5000-c1-words.txt', 'octanove-c2-words.txt']) {
    const targetWords = readFileSync(path.join(root, 'data/vocab/sources', file), 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    assert.ok(targetWords.length > 0, `${file} is empty`);
    const missing = targetWords.filter(word => !app.has(norm(word)));
    assert.deepEqual(missing, [], `${file}: missing pairs for ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`);
  }
});
