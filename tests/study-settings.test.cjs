// Run: node --test tests/study-settings.test.cjs
// TDD contract for lib/study-settings.ts (compiled with the project TypeScript).
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

const types = load('lib/types.ts');
const settings = load('lib/study-settings.ts', { './types': types });

const card = (patch = {}) => ({
  id: 'one', deckId: 'deck', front: 'provide', back: 'จัดหาให้',
  interval: 1, ease: 2.5, due: 0, streak: 0, createdAt: 0, ...patch,
});

test('shuffleCards is deterministic with a supplied random and never mutates its input', () => {
  const input = [1, 2, 3, 4, 5];
  const copy = [...input];
  const random = () => 0.42;
  const first = settings.shuffleCards(input, random);
  const second = settings.shuffleCards(input, random);
  assert.deepEqual(first, second);
  assert.deepEqual(input, copy, 'source order must stay untouched');
  assert.deepEqual([...first].sort((a, b) => a - b), input);
  assert.notDeepEqual(first, input, 'a constant non-zero random must reorder this input');
});

test('studyFace swaps English and Thai without touching card records', () => {
  const original = card({ back: 'จัดหาให้ [B1]' });
  const forward = settings.studyFace(original, false);
  assert.deepEqual(
    { prompt: forward.prompt, answer: forward.answer, promptLabel: forward.promptLabel, answerLabel: forward.answerLabel },
    { prompt: 'provide', answer: 'จัดหาให้', promptLabel: 'English', answerLabel: 'Thai' },
  );
  const swapped = settings.studyFace(original, true);
  assert.deepEqual(
    { prompt: swapped.prompt, answer: swapped.answer, promptLabel: swapped.promptLabel, answerLabel: swapped.answerLabel },
    { prompt: 'จัดหาให้', answer: 'provide', promptLabel: 'Thai', answerLabel: 'English' },
  );
  assert.equal(original.back, 'จัดหาให้ [B1]');
  assert.equal(forward.answer, 'จัดหาให้', 'legacy [B1] suffix must be hidden');
});

test('applyStudySettings shuffles only when requested and keeps every card once', () => {
  const cards = [card({ id: 'a' }), card({ id: 'b', front: 'apply', back: 'สมัคร' }), card({ id: 'c', front: 'achieve', back: 'บรรลุ' })];
  const untouched = settings.applyStudySettings(cards, { shuffle: false, swap: false }, () => 0.9);
  assert.deepEqual(untouched.map(c => c.id), ['a', 'b', 'c']);
  const shuffled = settings.applyStudySettings(cards, { shuffle: true, swap: false }, () => 0.9);
  assert.equal(shuffled.length, cards.length);
  assert.deepEqual([...shuffled.map(c => c.id)].sort(), ['a', 'b', 'c']);
  assert.notEqual(shuffled, cards, 'a new array must be returned');
});

test('defaults expose both settings as off and accept explicit settings', () => {
  assert.deepEqual(settings.DEFAULT_STUDY_SETTINGS, { shuffle: false, swap: false });
});
