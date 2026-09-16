// Run: node --test tests/match.test.cjs
// TDD contract for lib/match.ts — pure logic for the Quizlet-style Find the Pair mode.
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
const match = load('lib/match.ts', { './types': types });

const card = (id, front, back, patch = {}) => ({
  id, deckId: 'deck', front, back,
  interval: 1, ease: 2.5, due: 0, streak: 0, createdAt: 0, ...patch,
});

// Deterministic generator: keeps tests independent of Math.random.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const deck = [
  card('1', 'abrupt', 'กะทันหัน'),
  card('2', 'acclaim', 'คำสรรเสริญ'),
  card('3', 'accord', 'ข้อตกลง'),
  card('4', 'acute', 'เฉียบพลัน'),
  card('5', 'blank-back', ''),
  card('6', 'dupe', 'กะทันหัน'),
  card('7', 'legacy', 'โบราณ [B1]'),
];

test('buildMatchBoard selects unique pairs, produces one EN + one TH tile each, and never mutates cards', () => {
  const before = JSON.parse(JSON.stringify(deck));
  const board = match.buildMatchBoard(deck, 4, seeded(7));
  assert.equal(board.length, 8, '4 pairs expand to 8 tiles');
  const pairIds = new Set(board.map(tile => tile.pairId));
  assert.equal(pairIds.size, 4);
  for (const pairId of pairIds) {
    const tiles = board.filter(tile => tile.pairId === pairId);
    assert.equal(tiles.length, 2);
    assert.deepEqual(tiles.map(tile => tile.side).sort(), ['en', 'th']);
    assert.equal(tiles.find(tile => tile.side === 'en').text, tiles.find(tile => tile.side === 'en').text.trim());
  }
  assert.deepEqual(deck, before, 'source cards must not be mutated');
  assert.ok(!board.some(tile => tile.text === ''), 'blank backs are not usable');
});

test('buildMatchBoard never allows duplicate Thai answers or duplicate prompts on one board', () => {
  const board = match.buildMatchBoard(deck, 6, seeded(11));
  const backing = board.filter(tile => tile.side === 'th').map(tile => tile.text);
  assert.equal(new Set(backing).size, backing.length, 'Thai answer text must be unique per board');
  const fronts = board.filter(tile => tile.side === 'en').map(tile => tile.text);
  assert.equal(new Set(fronts).size, fronts.length, 'English prompt text must be unique per board');
  assert.equal(board.length, 10, 'only five pairs are usable after blank and duplicate-back de-duplication');
});

test('countMatchablePairs reports de-duplicated usable pairs for mode gating', () => {
  assert.equal(match.countMatchablePairs(deck), 5);
  assert.equal(match.countMatchablePairs([card('1', 'one', '   ')]), 0);
  assert.equal(match.countMatchablePairs([]), 0);
});

test('buildMatchBoard is deterministic for a fixed random source and clamps tiny decks', () => {
  const a = match.buildMatchBoard(deck, 3, seeded(3));
  const b = match.buildMatchBoard(deck, 3, seeded(3));
  assert.deepEqual(a, b);
  const tiny = match.buildMatchBoard([card('1', 'one', 'หนึ่ง')], 6, seeded(1));
  assert.deepEqual(tiny, [], 'fewer than two usable pairs cannot make a board');
});

test('selectMatchTile walks selected -> pair and mismatch without leaking state', () => {
  const board = match.buildMatchBoard(deck, 3, seeded(5));
  const en = board.find(tile => tile.side === 'en');
  const th = board.find(tile => tile.side === 'th' && tile.pairId !== en.pairId);
  let state = match.initialMatchState();
  assert.equal(state.kind, 'idle');

  state = match.selectMatchTile(state, en.id, board);
  assert.equal(state.kind, 'selected');
  assert.deepEqual(state.selectedIds, [en.id]);

  const same = match.selectMatchTile(state, en.id, board);
  assert.equal(same, state, 'clicking the selected tile again is a no-op');

  state = match.selectMatchTile(state, th.id, board);
  assert.equal(state.kind, 'mismatch');
  assert.equal(state.mistakes, 1);
  assert.deepEqual(state.selectedIds, []);
  assert.deepEqual(state.mistakeIds.sort(), [en.id, th.id].sort());
  const next = match.selectMatchTile(state, th.id, board);
  assert.equal(next.kind, 'selected');
  assert.deepEqual(next.mistakeIds, [], 'starting a new selection clears the flash state');
});

test('matching every pair completes the round and accuracy rewards fewer mistakes', () => {
  const board = match.buildMatchBoard(deck, 3, seeded(13));
  let state = match.initialMatchState();
  for (const pairId of new Set(board.map(tile => tile.pairId))) {
    state = match.selectMatchTile(state, board.find(tile => tile.pairId === pairId && tile.side === 'en').id, board);
    state = match.selectMatchTile(state, board.find(tile => tile.pairId === pairId && tile.side === 'th').id, board);
  }
  assert.equal(state.kind, 'complete');
  assert.equal(state.matchedPairIds.length, 3);
  assert.equal(match.matchAccuracy(3, 0), 100);
  assert.ok(match.matchAccuracy(3, 1) < 100);
  assert.ok(match.matchAccuracy(3, 1) > 50);
  assert.equal(match.matchAccuracy(0, 0), 100);
});
