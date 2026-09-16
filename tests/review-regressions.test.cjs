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

test('mid-round shuffle preserves reviewed and active cards, including a revealed card', () => {
  const currentIdxRef = { current: 1 };
  const shuffled = [];
  const updateQueue = loadCallback('components/study/StudySession.tsx', node =>
    ts.isArrowFunction(node) && ts.isCallExpression(node.parent) &&
    node.parent.expression.getText() === 'setDueCards' && node.getText().includes('currentIdxRef'), {
    currentIdxRef,
    shuffleCards: cards => { shuffled.push([...cards]); return [...cards].reverse(); },
  });
  const cards = ['reviewed', 'revealed', 'next', 'last'].map(id => ({ id }));
  const before = structuredClone(cards);
  const result = updateQueue(cards);
  assert.equal(result[0], cards[0]);
  assert.equal(result[1], cards[1], 'the revealed active card must remain the grading target');
  assert.deepEqual(result.map(card => card.id), ['reviewed', 'revealed', 'last', 'next']);
  assert.deepEqual(shuffled[0], cards.slice(2));
  assert.deepEqual(cards, before);
  currentIdxRef.current = cards.length - 1;
  assert.deepEqual(updateQueue(cards), cards);
  currentIdxRef.current = cards.length;
  assert.deepEqual(updateQueue(cards), cards);
  assert.deepEqual(updateQueue([]), []);
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
