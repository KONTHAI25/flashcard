const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = new Map();

function load(relative) {
  const filename = path.resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  function localRequire(name) {
    const base = path.resolve(path.dirname(filename), name);
    const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]
      .find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!target) return require(name);
    return load(path.relative(root, target));
  }
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })
    (localRequire, module, module.exports);
  return module.exports;
}

const { clearTranslateCache, fetchTranslate } = load('lib/translate.ts');

function success(word) {
  return new Response(JSON.stringify({
    word_eng: word,
    word_thai: 'ไทย',
    pos: 'n',
    source: 'longdo',
    candidates: [{ headword: word, pos: 'n', thai: 'ไทย' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('client helper deduplicates concurrent words and keeps the public result shape', async () => {
  const oldFetch = global.fetch;
  clearTranslateCache();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  global.fetch = async () => {
    calls += 1;
    await gate;
    return success('word');
  };
  try {
    const first = fetchTranslate(' word ');
    const second = fetchTranslate('WORD');
    await Promise.resolve();
    assert.equal(calls, 1);
    release();
    const [a, b] = await Promise.all([first, second]);
    assert.equal(a.word_thai, 'ไทย');
    assert.deepEqual(a, b);
  } finally {
    global.fetch = oldFetch;
    clearTranslateCache();
  }
});

test('client fallback remains manual-entry friendly and failed responses are retried', async () => {
  const oldFetch = global.fetch;
  clearTranslateCache();
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      word_eng: 'unknown',
      word_thai: 'unknown',
      pos: null,
      source: 'longdo',
      candidates: [],
      error: 'No EN-TH entry found',
    }), { status: 502 });
  };
  try {
    const first = await fetchTranslate('unknown');
    const second = await fetchTranslate('unknown');
    assert.equal(first.word_thai, 'unknown');
    assert.equal(second.word_thai, 'unknown');
    assert.equal(calls, 2);
  } finally {
    global.fetch = oldFetch;
    clearTranslateCache();
  }
});
