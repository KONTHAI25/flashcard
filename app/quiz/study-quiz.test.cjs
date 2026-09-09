// Run: node --test app/quiz/study-quiz.test.cjs (uses the existing TypeScript dependency).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '../..', relativePath);
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

const srs = load('lib/srs.ts');
const types = load('lib/types.ts');
const { buildQuiz, distinctAnswerCount, displayAnswer } = load('app/quiz/quiz.ts', { '../../lib/types': types });
const { shouldIgnoreShortcut } = load('components/study-quiz/keyboard.ts');
const DAY = 86_400_000;
const card = (patch = {}) => ({
  id: 'one', deckId: 'deck', front: 'Prompt', back: 'Answer',
  interval: 1, ease: 2.5, due: 0, streak: 0, createdAt: 0, ...patch,
});
const cards = ['Paris', 'London', 'Rome', 'Berlin', ' PARIS ', 'London'].map((back, i) =>
  card({ id: String(i), front: `Prompt ${i}`, back }));

test('all legacy levels use one display normalization without changing schedules', () => {
  for (const level of types.CEFR_LEVELS) {
    const original = card({ back: `คำ [${level}]`, interval: 30, streak: 5 });
    const normalized = types.normalizeCard(original);
    assert.equal(displayAnswer(original), 'คำ');
    assert.deepEqual(normalized, { ...original, back: 'คำ', level });
    assert.equal(original.back, `คำ [${level}]`);
    assert.equal(types.isBilingualCard(original), true);
  }
  assert.equal(types.isBilingualCard(card({ source: 'manual', level: 'B1' })), false);
  assert.equal(types.isBilingualCard(card({ wordEng: 'cat', wordThai: 'แมว' })), true);
});

test('CEFR scope is applied before Continue fallback and to refreshed missed IDs', () => {
  const known = card({ id: 'b1', level: 'B1', due: 2000, streak: 3 });
  const pending = card({ id: 'b2', level: 'B2', due: 999 });
  const scope = { deckIds: new Set(['deck']), deckId: 'deck', level: 'B1' };
  const queue = selectStudyCards(filterStudyCards([known, pending], scope), 'continue', 1000);
  assert.deepEqual(queue.map(c => c.id), ['b1']);
  const moved = { ...known, level: 'C2' };
  const otherDeck = { ...known, id: 'other', deckId: 'outside' };
  assert.deepEqual(filterStudyCards([moved, otherDeck], { ...scope, cardIds: new Set(['b1', 'other']) }), []);
  assert.deepEqual(filterStudyCards([card({ back: 'คำ [A1]' })], { ...scope, level: 'A1' }).map(c => c.id), ['one']);
});

test('review grades retain the existing SM-2-lite schedule without mutating the card', () => {
  const original = card({ interval: 8, streak: 4 });
  const again = srs.reviewCard(original, 0, 1000);
  assert.deepEqual([again.interval, again.ease, again.streak, again.due], [1, 2.3, 0, 1000 + DAY]);
  const good = srs.reviewCard(original, 1, 1000);
  assert.deepEqual([good.interval, good.streak, good.due], [20, 5, 1000 + 20 * DAY]);
  const easy = srs.reviewCard(original, 2, 1000);
  assert.deepEqual([easy.interval, easy.ease, easy.streak], [26, 2.65, 5]);
  assert.equal(original.interval, 8);
  assert.equal(original.streak, 4);
});

test('new cards, ease limits, malformed schedules and invalid grades', () => {
  assert.equal(srs.reviewCard(card({ interval: 0 }), 1, 0).interval, 1);
  assert.equal(srs.reviewCard(card({ interval: 0 }), 2, 0).interval, 4);
  assert.equal(srs.reviewCard(card({ ease: 1.3 }), 0, 0).ease, 1.3);
  assert.equal(srs.reviewCard(card({ ease: 3 }), 2, 0).ease, 3);
  const recovered = srs.reviewCard(card({ interval: NaN, ease: Infinity, streak: -4 }), 1, 0);
  assert.deepEqual([recovered.interval, recovered.ease, recovered.streak, recovered.due], [1, 2.5, 1, DAY]);
  assert.throws(() => srs.reviewCard(card(), 3), RangeError);
  assert.throws(() => srs.reviewCard(card(), NaN), RangeError);
});

test('due boundary and future labels do not display zero minutes', t => {
  t.mock.method(Date, 'now', () => 1000);
  assert.equal(srs.isDue(card({ due: 1000 })), true);
  assert.equal(srs.isDue(card({ due: 1001 })), false);
  assert.equal(srs.nextReviewLabel(card({ due: 1000 })), 'now');
  assert.equal(srs.nextReviewLabel(card({ due: 1001 })), '1m');
  assert.equal(srs.nextReviewLabel(card({ due: 1000 + 60 * 60_000 })), '1h');
  assert.equal(srs.nextReviewLabel(card({ due: 1000 + DAY })), '1d');
  assert.equal([card({ due: 1000 }), card({ due: 1001 })].filter(srs.isDue).length, 1);
});

test('missed-card retries use the persisted schedule and preserve concurrent content edits', () => {
  let current = card({ interval: 20, streak: 8 });
  const patches = [];
  const { saveReview } = load('components/study-quiz/saveReview.ts', {
    '@/lib/store': {
      updateCardReview: (id, quality) => {
        const { interval, ease, due, streak } = srs.reviewCard(current, quality);
        patches.push({ interval, ease, due, streak });
        current = { ...current, interval, ease, due, streak };
        return current;
      },
    },
  });
  saveReview(current.id, 0);
  current = { ...current, front: 'Edited elsewhere', back: 'New definition' };
  saveReview(current.id, 1);
  assert.equal(current.interval, 2);
  assert.equal(current.streak, 1);
  assert.equal(current.ease, 2.3);
  assert.equal(current.front, 'Edited elsewhere');
  assert.equal(current.back, 'New definition');
  assert.deepEqual(Object.keys(patches[0]).sort(), ['due', 'ease', 'interval', 'streak']);
});

test('reviewing a deleted card does not recreate it', () => {
  const { saveReview } = load('components/study-quiz/saveReview.ts', {
    '@/lib/store': { updateCardReview: () => null },
  });
  assert.equal(saveReview('deleted', 1), null);
});

test('persistence failure is propagated so the session can retain the current question', () => {
  const { saveReview } = load('components/study-quiz/saveReview.ts', {
    '@/lib/store': { updateCardReview: () => { throw new Error('storage unavailable'); } },
  });
  assert.throws(() => saveReview('one', 1), /storage unavailable/);
});

test('quiz options are unique, retain the right answer and never mutate source cards', () => {
  const before = structuredClone(cards);
  for (const random of [() => 0, () => 0.5, () => 0.999999]) {
    const questions = buildQuiz(cards, random);
    assert.equal(questions.length, cards.length);
    assert.deepEqual(new Set(questions.map(q => q.card.id)), new Set(cards.map(c => c.id)));
    for (const q of questions) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options.map(o => o.trim().toLowerCase())).size, 4);
      assert.equal(q.options[q.correctIdx], q.card.back);
    }
  }
  assert.deepEqual(cards, before);
});

test('quiz eligibility counts distinct nonblank answers rather than card count', () => {
  assert.equal(distinctAnswerCount(cards), 4);
  assert.deepEqual(buildQuiz(cards.slice(0, 3)), []);
  assert.deepEqual(buildQuiz(Array.from({ length: 8 }, (_, i) => card({ id: String(i) }))), []);
  assert.deepEqual(buildQuiz([...cards.slice(0, 3), card({ back: '  ' })]), []);
  assert.deepEqual(buildQuiz([...cards.slice(0, 3), card({ front: '', back: 'Berlin' })]), []);
});

test('quiz normalization handles Unicode compatibility forms and repeated whitespace', () => {
  assert.equal(distinctAnswerCount([card({ back: 'Ａ B' }), card({ back: ' a   b ' })]), 1);
});

test('alternate definitions of the same prompt never appear as wrong choices', () => {
  const input = [...cards.slice(0, 4), card({ id: 'alternate', front: ' Prompt 0 ', back: 'Alternative' })];
  const questions = buildQuiz(input, () => 0.5);
  for (const q of questions.filter(q => q.card.front.trim() === 'Prompt 0')) {
    assert.ok(!q.options.includes(q.card.back === 'Paris' ? 'Alternative' : 'Paris'));
  }
  assert.deepEqual(buildQuiz(input.map(c => ({ ...c, front: 'Same prompt' }))), []);
});

test('global keyboard shortcuts ignore repeats, composition and modifier combinations', () => {
  assert.equal(shouldIgnoreShortcut({}), false);
  for (const property of ['defaultPrevented', 'repeat', 'isComposing', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
    assert.equal(shouldIgnoreShortcut({ [property]: true }), true, property);
  }
});

test('global keyboard shortcuts leave native controls and editable descendants alone', () => {
  assert.equal(shouldIgnoreShortcut({ target: { isContentEditable: true } }), true);
  for (const selector of ['input', 'textarea', 'select', 'button', 'a', '[role="dialog"]', '[role="radio"]']) {
    const target = { closest: selectors => selectors.split(', ').includes(selector) ? {} : null };
    assert.equal(shouldIgnoreShortcut({ target }), true, selector);
  }
  assert.equal(shouldIgnoreShortcut({ target: { closest: () => null } }), false);
});

const { summarizeDecks } = load('lib/library.ts');
test('library aggregates due boundaries, empty sets and review state without counting orphan cards', () => {
  const sets = [{ id: 'deck', name: 'One' }, { id: 'empty', name: 'Empty' }];
  const result = summarizeDecks(sets, [
    card({ id: 'new', due: 100, createdAt: 100 }),
    card({ id: 'learned', due: 200, streak: 2 }),
    card({ id: 'missed', due: 150, streak: 0 }),
    card({ id: 'orphan', deckId: 'missing' }),
  ], 100);
  assert.deepEqual(result[0], { deck: sets[0], total: 3, due: 1, reviewed: 2, learned: 1 });
  assert.deepEqual(result[1], { deck: sets[1], total: 0, due: 0, reviewed: 0, learned: 0 });
});

test('ambiguous prompts never produce fewer than four quiz choices', () => {
  const input = [
    card({ id: 'a', front: 'Same', back: 'A' }),
    card({ id: 'b', front: 'Same', back: 'B' }),
    card({ id: 'c', front: 'Other', back: 'C' }),
    card({ id: 'd', front: 'Another', back: 'D' }),
  ];
  const questions = buildQuiz(input);
  assert.equal(questions.length, 2);
  assert.ok(questions.every(question => question.options.length === 4));
});

const { selectStudyCards, isStillLearning, filterStudyCards } = load('lib/study-queue.ts', { './types': types });
test('missed terms remain playable after leaving or reloading a round before their due date', () => {
  const missed = srs.reviewCard(card({ createdAt: 1 }), 0, 100);
  const known = srs.reviewCard(card({ id: 'known', createdAt: 1 }), 1, 100);
  const saved = JSON.parse(JSON.stringify([missed, known]));
  assert.equal(isStillLearning(saved[0]), true);
  assert.deepEqual(selectStudyCards(saved, 'continue', 200).map(c => c.id), ['one']);
  assert.deepEqual(selectStudyCards(saved, 'learning', 200).map(c => c.id), ['one']);
  assert.deepEqual(selectStudyCards(saved, 'due', 200), []);
});
test('mastered sets can be played again without resetting schedules on entry', () => {
  const saved = [srs.reviewCard(card(), 1, 100)];
  const before = structuredClone(saved);
  assert.deepEqual(selectStudyCards(saved, 'continue', 200), saved);
  assert.deepEqual(selectStudyCards(saved, 'all', 200), saved);
  assert.deepEqual(selectStudyCards(saved, 'learning', 200), []);
  assert.deepEqual(saved, before);
});
test('continue combines due and missed terms once, while excluding future known terms', () => {
  const input = [card({ id: 'new', createdAt: 100, due: 100 }), card({ id: 'missed', due: 500 }), card({ id: 'known', streak: 2, due: 500 })];
  assert.deepEqual(selectStudyCards(input, 'continue', 100).map(c => c.id), ['new', 'missed']);
  assert.equal(isStillLearning(input[0]), false);
  assert.deepEqual(selectStudyCards([], 'all', 100), []);
});
