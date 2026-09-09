// Run: node --test tests/editor-state.test.cjs
// Covers lib/editor-state.ts: lookup generation guards, answer/word binding,
// auto-replace protection, and the unified save-source resolver (F15).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/editor-state.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', source)(require, mod, mod.exports);
const { beginLookup, isLookupCurrent, answerMatchesWord, canAutoReplaceAnswer, resolveSaveSource } = mod.exports;

test('lookup generation advances and stays current only for the exact open word', () => {
  const first = beginLookup(0, '  cat ');
  assert.deepEqual(first, { generation: 1, word: 'cat' });
  const second = beginLookup(first.generation, 'dog');
  assert.equal(second.generation, 2);
  assert.ok(isLookupCurrent(second, 2, ' dog ', true));
  assert.ok(!isLookupCurrent(first, 2, 'cat', true));
  assert.ok(!isLookupCurrent(second, 2, 'cat', true));
  assert.ok(!isLookupCurrent(second, 2, 'dog', false));
});

test('answer binding requires the exact current word', () => {
  assert.ok(answerMatchesWord('cat', ' cat '));
  assert.ok(!answerMatchesWord('cat', 'dog'));
  assert.ok(!answerMatchesWord(null, 'cat'));
  assert.ok(!answerMatchesWord('', 'cat'));
});

test('auto-replace protects hand-entered answers', () => {
  // Untouched or empty answers may be replaced.
  assert.ok(canAutoReplaceAnswer(false, null, 'cat', ''));
  assert.ok(canAutoReplaceAnswer(false, 'cat', 'cat', 'แมว'));
  // A protected answer survives auto-fill; explicit lookup may still replace.
  assert.ok(!canAutoReplaceAnswer(true, 'cat', 'cat', 'แมว'));
  // An answer bound to a different word is stale and may be replaced.
  assert.ok(canAutoReplaceAnswer(true, 'dog', 'cat', 'แมว'));
  // Empty current answer is always replaceable.
  assert.ok(canAutoReplaceAnswer(true, 'cat', 'cat', '  '));
});

test('save source is shared by display and persistence (F15)', () => {
  const base = { answerEdited: false, editingBilingual: true, editingSource: 'oxford', originalSource: 'oxford' };
  assert.equal(resolveSaveSource({ ...base, usedLongdo: true }), 'longdo');
  // Hand-editing the Thai answer forces manual provenance (display must match save).
  assert.equal(resolveSaveSource({ ...base, usedLongdo: false, answerEdited: true }), 'manual');
  // Generic (non-bilingual) cards save as manual.
  assert.equal(resolveSaveSource({ usedLongdo: false, answerEdited: false, editingBilingual: false, editingSource: null }), 'manual');
  // Bilingual without edits preserves the original source.
  assert.equal(resolveSaveSource({ ...base, usedLongdo: false }), 'oxford');
  // No provenance known yields undefined (caller omits the field).
  assert.equal(resolveSaveSource({ usedLongdo: false, answerEdited: false, editingBilingual: true, editingSource: null, originalSource: null }), undefined);
});
