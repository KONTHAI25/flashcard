const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual UI callbacks without adding a DOM test dependency.
function loadCallback(relativePath, predicate, dependencies) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let match;
  function visit(node) {
    if (!match && predicate(node)) match = node;
    if (!match) ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(match, `Callback not found in ${relativePath}`);
  const { outputText } = ts.transpileModule(`const callback = ${match.getText(source)};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  return new Function(...Object.keys(dependencies), `${outputText}\nreturn callback;`)(...Object.values(dependencies));
}

const namedFunction = name => node => ts.isFunctionDeclaration(node) && node.name?.text === name;

test('quiz submits only explicit answer keys, never navigation keys', () => {
  const selections = [];
  let prevented = 0;
  const handleKey = loadCallback('app/quiz/[id]/page.tsx', namedFunction('handleKey'), {
    shouldIgnoreShortcut: () => false,
    finished: false,
    questions: [{ options: ['A', 'B', 'C', 'D'] }],
    currentIdx: 0,
    selected: null,
    handleSelect: index => selections.push(index),
    handleNext: () => assert.fail('An unanswered question must not advance'),
  });
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'CapsLock', 'ContextMenu', 'Delete', 'Enter', 'Tab', 'Escape', ' ', '0', '5']) {
    handleKey({ key, preventDefault: () => prevented++ });
  }
  assert.deepEqual(selections, [], 'non-answer keys must not grade a card');
  assert.equal(prevented, 0);
  for (const key of ['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']) {
    handleKey({ key, preventDefault: () => prevented++ });
  }
  assert.deepEqual(selections, [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
  assert.equal(prevented, 12);
});

test('mid-round shuffle changes an unrevealed card, pins a revealed target, and restores pending order', () => {
  const currentIdxRef = { current: 1 };
  const settings = { shuffle: true };
  const cards = ['reviewed', 'active', 'next', 'last'].map(id => ({ id }));
  const roundOrderRef = { current: cards };
  const calls = [];
  const makeUpdateQueue = isRevealed => loadCallback('components/study/StudySession.tsx', node =>
    ts.isArrowFunction(node) && ts.isCallExpression(node.parent) &&
    node.parent.expression.getText() === 'setDueCards' && node.getText().includes('shufflePendingCards'), {
      settings,
      index: currentIdxRef.current,
      isRevealed,
      roundOrderRef,
      shufflePendingCards: (queue, index, revealed) => {
        calls.push({ queue: [...queue], index, revealed });
        const start = index + (revealed ? 1 : 0);
        const pending = queue.slice(start);
        return [...queue.slice(0, start), ...pending.slice(1), ...pending.slice(0, 1)];
      },
      restorePendingCards: (queue, original, index, revealed) => {
        const prefix = queue.slice(0, index);
        const active = revealed ? queue.slice(index, index + 1) : [];
        const used = new Set([...prefix, ...active].map(card => card.id));
        return [...prefix, ...active, ...original.filter(card => !used.has(card.id))];
      },
    });
  const updateQueue = makeUpdateQueue(false);
  const result = updateQueue(cards);
  assert.deepEqual(result.map(card => card.id), ['reviewed', 'next', 'last', 'active']);
  assert.equal(result[0], cards[0], 'reviewed prefix must remain untouched');
  assert.notEqual(result[1], cards[1], 'an unrevealed current card must change when cards remain');
  assert.deepEqual(calls[0], { queue: cards, index: 1, revealed: false });

  const revealedResult = makeUpdateQueue(true)(cards);
  assert.deepEqual(revealedResult.map(card => card.id), ['reviewed', 'active', 'last', 'next']);
  assert.equal(revealedResult[1], cards[1], 'the revealed active card must remain the grading target');
  assert.deepEqual(calls[1], { queue: cards, index: 1, revealed: true });

  settings.shuffle = false;
  const restored = updateQueue(result);
  assert.deepEqual(restored.map(card => card.id), ['reviewed', 'active', 'next', 'last']);
});

test('failed term Undo propagates to the toast host and remains retryable', () => {
  const removed = { id: 'term', deckId: 'deck', front: 'cat', back: 'แมว' };
  let savedCards = [];
  let failWrite = true;
  let renderedCards;
  const toasts = [];
  const handleDeleteCard = loadCallback('app/deck/[id]/page.tsx', namedFunction('handleDeleteCard'), {
    id: 'deck',
    deleteCard: () => removed,
    getCardsByDeck: () => [...savedCards],
    setCards: cards => { renderedCards = cards; },
    showToast: (message, options) => toasts.push({ message, ...options }),
    restoreCard: card => {
      if (failWrite) throw new Error('Storage full');
      savedCards = [card];
    },
  });
  handleDeleteCard('term');
  assert.equal(toasts.length, 1);
  const undo = toasts[0].onUndo;
  assert.throws(() => undo(), /Storage full/);
  assert.equal(toasts.length, 1, 'failure must not replace the retryable Undo toast');
  assert.deepEqual(savedCards, []);
  failWrite = false;
  undo();
  assert.deepEqual(renderedCards, [removed]);
});
