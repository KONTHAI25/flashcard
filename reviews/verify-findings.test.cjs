// Post-fix offline probes. Run from the repository root: node reviews/verify-findings.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  function localRequire(name) {
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
    const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!target) throw new Error('Cannot resolve ' + name);
    return load(target);
  }
  vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename })(localRequire, module, module.exports);
  return module.exports;
}
async function main() {
  const { selectStudyCards, filterStudyCards } = load('lib/study-queue.ts');
  const now = 1000;
  const base = { id: 'b1', deckId: 'd', front: 'one', back: 'หนึ่ง', interval: 1, ease: 2.5, due: 2000, streak: 1, createdAt: 1, level: 'B1' };
  const cards = [base, { ...base, id: 'b2', level: 'B2', due: 999 }];
  const actual = selectStudyCards(filterStudyCards(cards, { deckIds: new Set(['d']), level: 'B1' }), 'continue', now);
  assert.deepEqual(actual.map(card => card.id), ['b1']);
  console.log('PASS: scoped Continue fallback includes the available B1 card.');

  const { parseLegacyBack } = load('lib/types.ts');
  assert.deepEqual(parseLegacyBack('คำ [A1]'), { text: 'คำ', level: 'A1' });
  assert.deepEqual(parseLegacyBack('คำ [B1]'), { text: 'คำ', level: 'B1' });
  console.log('PASS: legacy A1 and B1 suffixes migrate.');

  const rows = [1, 2, 3, 4, 5, 6].flatMap(n => Object.values(load('data/vocab/part-0' + n + '.ts')).find(Array.isArray));
  const unique = new Set(rows.map(row => JSON.stringify(row)));
  assert.equal(rows.length, 2911); assert.equal(unique.size, rows.length);
  console.log('PASS: all 2911 vocabulary tuples are unique.');

  const { validateCard } = load('lib/storage.ts');
  assert.throws(() => validateCard({ ...base, level: { unexpected: true } }), /Invalid CEFR level/);
  console.log('PASS: storage rejects malformed metadata before rendering.');

  const oldFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; return new Response('<table><tr><td>take off [phrv]</td><td>ถอดออก</td></tr></table>'); };
  try {
    const { GET } = load('app/api/translate/route.ts');
    const response = await GET({ nextUrl: new URL('http://localhost/api/translate?word=take%20off') });
    const body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.candidates[0].headword, 'take off'); assert.equal(calls, 1);
    console.log('PASS: synthetic phrase fixture retains take off. No live upstream request.');
  } finally { global.fetch = oldFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
