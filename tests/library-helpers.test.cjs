// Run: node --test tests/library-helpers.test.cjs (uses the existing TypeScript dependency).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
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

const { errorMessage } = load('lib/errors.ts');
const { summarizeDecks, groupCardsByDeck, deckProgress, summaryRemaining } = load('lib/library.ts');
const { isRepeatActivation } = load('components/study-quiz/keyboard.ts');

const card = (patch = {}) => ({
  id: 'c', deckId: 'a', front: 'f', back: 'b',
  interval: 1, ease: 2.5, due: 0, streak: 0, createdAt: 0, ...patch,
});
const deck = id => ({ id, name: id, emoji: '📘', createdAt: 0 });

test('errorMessage prefers an Error message and falls back otherwise', () => {
  assert.equal(errorMessage(new Error('Quota exceeded'), 'fallback'), 'Quota exceeded');
  assert.equal(errorMessage('boom', 'fallback'), 'fallback');
  assert.equal(errorMessage(undefined, 'fallback'), 'fallback');
  assert.equal(errorMessage(new Error(''), 'fallback'), 'fallback');
});

test('groupCardsByDeck buckets cards once and preserves storage order', () => {
  const cards = [card({ id: '1', deckId: 'a' }), card({ id: '2', deckId: 'b' }), card({ id: '3', deckId: 'a' })];
  const groups = groupCardsByDeck(cards);
  assert.deepEqual(groups.get('a').map(c => c.id), ['1', '3']);
  assert.deepEqual(groups.get('b').map(c => c.id), ['2']);
  assert.equal(groups.get('missing'), undefined);
});

test('summarizeDecks agrees with deckProgress for every card state', () => {
  const now = 10_000;
  const cards = [
    card({ id: 'new', due: 0, createdAt: 0 }),
    card({ id: 'learning', due: 5_000, createdAt: 0 }),
    card({ id: 'learned-due', due: 1_000, createdAt: 0, streak: 2 }),
    card({ id: 'learned-later', due: 50_000, createdAt: 0, streak: 1 }),
    card({ id: 'orphan', deckId: 'gone' }),
  ];
  const [summary] = summarizeDecks([deck('a')], cards, now);
  const progress = deckProgress(cards.filter(c => c.deckId === 'a'));
  assert.equal(summary.total, progress.total);
  assert.equal(summary.learned, progress.learned);
  assert.equal(summaryRemaining(summary), progress.remaining);
  assert.equal(summary.reviewed, progress.learned + progress.remaining);
  assert.equal(summary.due, 3);
});

test('isRepeatActivation only flags held Enter/Space', () => {
  assert.equal(isRepeatActivation({ repeat: true, key: 'Enter' }), true);
  assert.equal(isRepeatActivation({ repeat: true, key: ' ' }), true);
  assert.equal(isRepeatActivation({ repeat: false, key: 'Enter' }), false);
  assert.equal(isRepeatActivation({ repeat: true, key: 'a' }), false);
});
