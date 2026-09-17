// Run: node --test tests/set-card-remain.test.cjs
// The library "Remain" chip promises to replay the still-learning subset, so its
// destination must honor that: SetCard emits ?mode=learning and /study/[id]
// maps the parameter onto StudySession (a bare query string is not enough).
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  function localRequire(name) {
    const base = name.startsWith('@/')
      ? path.join(root, name.slice(2))
      : path.resolve(path.dirname(filename), name);
    const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]
      .find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!target) return require(name);
    // This route-wiring test does not render CSS; Playwright checks the styles.
    if (target.endsWith('.module.css')) return { default: {} };
    return load(path.relative(root, target));
  }
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const { default: StudyPage } = load('app/study/[id]/page.tsx');
const { SetCard } = load('components/SetCard.tsx');
const { selectStudyCards } = load('lib/study-queue.ts');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
// Mixed deck from the review reproduction: unstarted, missed (due tomorrow),
// and a learned card due now. summaryRemaining counts only the missed one.
const cards = [
  { id: 'unstarted', deckId: 'deck-demo', streak: 0, due: now - 30 * DAY, createdAt: now - 30 * DAY },
  { id: 'missed', deckId: 'deck-demo', streak: 0, due: now + DAY, createdAt: now - 30 * DAY },
  { id: 'learned', deckId: 'deck-demo', streak: 1, due: now, createdAt: now - 30 * DAY },
];

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  const children = node.props?.children;
  if (Array.isArray(children)) for (const child of children) walk(child, visit);
  else walk(children, visit);
}

function remainChips(tree) {
  const chips = [];
  walk(tree, node => { if (node.props?.className === 'set-remain') chips.push(node); });
  return chips;
}

test('Remain chip deep-links the still-learning subset, not the mixed queue', () => {
  const summary = {
    deck: { id: 'deck-demo', name: 'Demo set', emoji: '📗' },
    total: 3, due: 2, reviewed: 2, learned: 1,
  };
  const chips = remainChips(SetCard({ summary, onDelete: () => {} }));
  assert.equal(chips.length, 1);
  assert.equal(chips[0].props.href, '/study/deck-demo?mode=learning');
  assert.match(chips[0].props['aria-label'], /Remain 1\/3/);
});

test('Remain chip hides once every attempted card is learned', () => {
  const summary = {
    deck: { id: 'deck-demo', name: 'Demo set', emoji: '📗' },
    total: 3, due: 2, reviewed: 2, learned: 2,
  };
  const chips = remainChips(SetCard({ summary, onDelete: () => {} }));
  assert.equal(chips.length, 0);
});

test('/study/[id] consumes ?mode=learning and defaults unknown modes to continue', async () => {
  assert.equal(typeof StudyPage, 'function');
  const learning = await StudyPage({
    params: Promise.resolve({ id: 'deck-demo' }),
    searchParams: Promise.resolve({ mode: 'learning' }),
  });
  assert.equal(typeof learning.type, 'function');
  assert.equal(learning.props.id, 'deck-demo');
  assert.equal(learning.props.initialMode, 'learning');
  const fallback = await StudyPage({
    params: Promise.resolve({ id: 'deck-demo' }),
    searchParams: Promise.resolve({ mode: 'nonsense' }),
  });
  assert.equal(fallback.props.initialMode, 'continue');
  const absent = await StudyPage({
    params: Promise.resolve({ id: 'deck-demo' }),
    searchParams: Promise.resolve({}),
  });
  assert.equal(absent.props.initialMode, 'continue');
});

test('learning mode selects exactly the missed cards the chip displays', () => {
  assert.deepEqual(selectStudyCards(cards, 'learning').map(card => card.id), ['missed']);
  assert.equal(selectStudyCards(cards, 'continue').length, 3);
});
