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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  function localRequire(name) {
    const base = name.startsWith('@/')
      ? path.join(root, name.slice(2))
      : path.resolve(path.dirname(filename), name);
    const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]
      .find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!target) return require(name);
    return load(path.relative(root, target));
  }
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })
    (localRequire, module, module.exports);
  return module.exports;
}

const { TranslationServer, parseLongdoHtml, decodeEntities, containsThaiScript } = load('lib/translate-server.ts');

function htmlFor(word, thai = `${word}-ไทย`) {
  return `<table><tr><td>${word} [v]</td><td>${thai}</td></tr></table>`;
}

function responseFor(word, thai) {
  return new Response(htmlFor(word, thai));
}

test('phrase parsing keeps the complete headword and safely decodes numeric entities', () => {
  const candidates = parseLongdoHtml(
    '<table><tr><td>take off [phrv]</td><td>&#3616;&#3634;&#3625;&#3634; &amp; test</td></tr></table>',
    'take off',
  );
  assert.equal(candidates[0].headword, 'take off');
  assert.equal(candidates[0].pos, 'phrv');
  assert.equal(candidates[0].thai, 'ภาษา & test');
  assert.doesNotThrow(() => decodeEntities('bad &#x110000; &#99999999; &#0;'));
  assert.equal(decodeEntities('&#65; &#x41;'), 'A A');
});

test('concurrent identical misses share one upstream request and expire from the negative cache', async () => {
  let now = 0;
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const server = new TranslationServer({
    now: () => now,
    negativeCacheTtlMs: 100,
    fetchImpl: async () => {
      calls += 1;
      await gate;
      return new Response('<table></table>');
    },
  });
  const first = server.lookup('missing');
  const second = server.lookup('MISSING');
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  const results = await Promise.all([first, second]);
  assert.equal(results[0].status, 502);
  assert.equal(results[1].data.error, results[0].data.error);
  assert.equal((await server.lookup('missing')).status, 502);
  assert.equal(calls, 1);
  now = 101;
  assert.equal((await server.lookup('missing')).status, 502);
  assert.equal(calls, 2);
});

test('different words are bounded by upstream concurrency and completed entries are capacity evicted', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const server = new TranslationServer({
    cacheMaxEntries: 2,
    maxUpstreamConcurrency: 1,
    fetchImpl: async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        await gate;
      }
      assert.equal(init.signal.aborted, false);
      return responseFor('one');
    },
  });
  const first = server.lookup('one');
  await Promise.resolve();
  const busy = await server.lookup('two');
  assert.equal(busy.status, 503);
  release();
  assert.equal((await first).status, 200);
  assert.equal((await server.lookup('two')).status, 200);
  assert.equal((await server.lookup('three')).status, 200);
  assert.equal(server.getCacheSize(), 2);
  assert.equal((await server.lookup('one')).status, 200);
  assert.equal(calls, 4);
});

test('cache entries expire at their TTL and request budget returns 429 with Retry-After', async () => {
  let now = 1_000;
  let calls = 0;
  const server = new TranslationServer({
    now: () => now,
    cacheTtlMs: 100,
    maxRequestsPerWindow: 2,
    requestWindowMs: 1_000,
    fetchImpl: async () => {
      calls += 1;
      return responseFor('word');
    },
  });
  assert.equal((await server.lookup('word')).status, 200);
  // Cache hits do not consume the shared request budget (F16): repeats stay 200.
  assert.equal((await server.lookup('word')).status, 200);
  assert.equal((await server.lookup('other')).status, 200);
  const limited = await server.lookup('third');
  assert.equal(limited.status, 429);
  assert.equal(limited.retryAfterSeconds, 1);
  // Cached entries still serve while the budget is exhausted.
  assert.equal((await server.lookup('word')).status, 200);
  now = 2_001;
  assert.equal((await server.lookup('word')).status, 200);
  assert.equal(calls, 3);
});

test('oversize upstream bodies fail with a manual-entry fallback and no cache entry', async () => {
  let calls = 0;
  const server = new TranslationServer({
    maxResponseBytes: 8,
    fetchImpl: async () => {
      calls += 1;
      return new Response('0123456789');
    },
  });
  const result = await server.lookup('large');
  assert.equal(result.status, 502);
  assert.match(result.data.error, /too large/i);
  assert.equal(server.getCacheSize(), 0);
  assert.equal((await server.lookup('large')).status, 502);
  assert.equal(calls, 2);
});

test('rejected headers, bodies, and upstream statuses abort and cancel the response', async () => {
  const cases = [
    {
      name: 'declared oversized body',
      options: { maxResponseBytes: 8 },
      response: () => new Response('ok', { headers: { 'content-length': '100' } }),
    },
    {
      name: 'received oversized body',
      options: { maxResponseBytes: 2 },
      response: () => new Response('too large'),
    },
    {
      name: 'non-ok upstream response',
      options: {},
      response: () => new Response('upstream failure', { status: 503 }),
    },
  ];
  for (const item of cases) {
    let signal;
    const server = new TranslationServer({
      ...item.options,
      fetchImpl: async (_url, init) => {
        signal = init.signal;
        return item.response();
      },
    });
    const result = await server.lookup(item.name);
    assert.equal(result.status, 502);
    assert.equal(signal.aborted, true, item.name);
  }
});

test('unique misses are blocked by the upstream rolling budget and recover after its window', async () => {
  let now = 0;
  let calls = 0;
  const server = new TranslationServer({
    now: () => now,
    upstreamWindowMs: 1_000,
    maxUpstreamPerWindow: 2,
    fetchImpl: async () => {
      calls += 1;
      return new Response('<table></table>');
    },
  });
  assert.equal((await server.lookup('miss-1')).status, 502);
  assert.equal((await server.lookup('miss-2')).status, 502);
  const blocked = await server.lookup('miss-3');
  assert.equal(blocked.status, 503);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.equal(calls, 2);
  now = 1_000;
  assert.equal((await server.lookup('miss-3')).status, 502);
  assert.equal(calls, 3);
});

test('fetch timeout covers a response body that never finishes', async () => {
  const hangingBody = {
    getReader() {
      return {
        read: () => new Promise(() => {}),
        cancel: async () => {},
      };
    },
  };
  const server = new TranslationServer({
    fetchTimeoutMs: 15,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: hangingBody,
      text: async () => '',
    }),
  });
  const started = Date.now();
  const result = await server.lookup('slow');
  assert.equal(result.status, 502);
  assert.match(result.data.error, /timed out/i);
  assert.ok(Date.now() - started < 500);
});

test('route exposes the bounded request budget as 429 with Retry-After', async () => {
  const oldFetch = global.fetch;
  const { GET } = load('app/api/translate/route.ts');
  global.fetch = async () => responseFor('word');
  try {
    // Distinct words are upstream misses that consume the shared budget;
    // cache hits do not (F16), so exhaust the budget with unique words.
    // Each request uses a distinct IP so the per-IP bucket never triggers
    // and the shared 120/min budget is what returns 429.
    for (let i = 0; i < 120; i += 1) {
      await GET({
        nextUrl: new URL(`http://localhost/api/translate?word=word-${i}`),
        headers: new Headers({ "x-forwarded-for": `10.0.0.${i % 250 + 1}` }),
      });
    }
    const limited = await GET({ nextUrl: new URL('http://localhost/api/translate?word=other'), headers: new Headers({ "x-forwarded-for": "10.9.9.9" }) });
    assert.equal(limited.status, 429);
    const retryAfter = Number(limited.headers.get('Retry-After'));
    assert.ok(retryAfter > 0 && retryAfter <= 60);
    const body = await limited.json();
    assert.equal(body.word_thai, 'other');
    assert.match(body.error, /budget/i);
  } finally {
    global.fetch = oldFetch;
  }
});

test('parser hardening: no entity double-decode and Thai sanity gate (F17)', async () => {
  assert.equal(decodeEntities('&amp;#65;'), '&#65;');
  assert.equal(decodeEntities('&#65;'), 'A');
  assert.ok(containsThaiScript('hello \u0E41\u0E21\u0E27'));
  assert.ok(!containsThaiScript('hello only'));
  const latinOnly = '<table><tr><td>cat [n]</td><td>just latin text</td></tr></table>';
  assert.deepEqual(parseLongdoHtml(latinOnly, 'cat'), [{ headword: 'cat', pos: 'n', thai: 'just latin text' }]);
  const server = new TranslationServer({
    fetchImpl: async () => new Response(latinOnly),
  });
  const miss = await server.lookup('cat');
  assert.equal(miss.status, 502);
  assert.match(miss.data.error, /Thai-script/);
});

test('cached responses are copies that callers cannot mutate (F17)', async () => {
  const server = new TranslationServer({
    fetchImpl: async () => responseFor('word'),
  });
  const first = await server.lookup('word');
  assert.equal(first.status, 200);
  first.data.word_thai = 'MUTATED';
  first.data.candidates.length = 0;
  const second = await server.lookup('word');
  assert.equal(second.data.word_thai, 'word-\u0E44\u0E17\u0E22');
  assert.equal(second.data.candidates.length, 1);
});
