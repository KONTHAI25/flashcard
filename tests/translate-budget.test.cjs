const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/translate-client-budget.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('module', 'exports', source)(mod, mod.exports);

test('client hints cannot grow the budget map beyond capacity; expired slots recover', () => {
  const take = mod.exports.createClientBudget({ maxClients: 2, limit: 2, windowMs: 1000 });
  assert.equal(take('a', 0), undefined);
  assert.equal(take('b', 0), undefined);
  assert.equal(take('c', 0), 1);
  assert.equal(take('a', 0), undefined);
  assert.equal(take('a', 0), 1);
  assert.equal(take('c', 1000), undefined);
});

test('oversized client hints share a bounded key instead of retaining arbitrary strings', () => {
  const take = mod.exports.createClientBudget({ limit: 1 });
  const prefix = 'x'.repeat(128);
  assert.equal(take(prefix + 'one', 0), undefined);
  assert.equal(take(prefix + 'two', 0), 60);
});
