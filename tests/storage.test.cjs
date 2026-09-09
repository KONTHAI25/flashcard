// Run: node --test tests/storage.test.cjs
// Compile with the project's installed TypeScript; no loader or package edits.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'flashcard-storage-'));
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    'lib/store.ts', 'lib/export-import.ts', '--outDir', output, '--module', 'commonjs', '--target', 'ES2020',
    '--lib', 'ES2020,DOM', '--strict', '--skipLibCheck', '--esModuleInterop',
  ], { cwd: root, stdio: 'pipe' });
} catch (error) {
  rmSync(output, { recursive: true, force: true });
  throw new Error(String(error.stdout || error.message));
}
const store = require(path.join(output, 'lib/store.js'));
const { STORAGE_KEY } = require(path.join(output, 'lib/storage.js'));
const { importSnapshotJson } = require(path.join(output, 'lib/export-import.js'));
const vocabulary = require(path.join(output, 'data/vocab/index.js'));
after(() => { delete global.window; rmSync(output, { recursive: true, force: true }); });

class MemoryStorage {
  values = new Map();
  writes = 0;
  fail = false;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (this.fail) throw new DOMException('Full', 'QuotaExceededError');
    this.writes++;
    this.values.set(key, value);
  }
}
const deck = { id: 'custom', name: 'Mine', emoji: '📚', createdAt: 1 };
const card = { id: 'card', deckId: 'custom', front: 'Q', back: 'A', interval: 32, ease: 2.1, due: 90000, streak: 7, createdAt: 2 };
function setup(data = { decks: [deck], cards: [card] }) {
  const storage = new MemoryStorage();
  global.window = new EventTarget();
  window.localStorage = storage;
  if (data) storage.values.set(STORAGE_KEY, JSON.stringify({ version: 1, ...data }));
  return storage;
}
function errorCode(code) { return error => error instanceof store.StorageError && error.code === code; }

test('backup replacement recovers corrupt or absent storage in one write and preserves progress', () => {
  for (const previous of [null, '{broken', JSON.stringify({ version: 99 })]) {
    const storage = setup(null);
    if (previous !== null) storage.values.set(STORAGE_KEY, previous);
    assert.deepEqual(importSnapshotJson(JSON.stringify({ version: 1, decks: [deck], cards: [card] })), { decks: 1, cards: 1, mode: 'replace' });
    assert.equal(storage.writes, 1);
    assert.deepEqual(store.getCards(), [card]);
  }
});

test('invalid backups never seed or overwrite existing data', () => {
  const invalid = ['{', JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, decks: [deck], cards: [{ ...card, deckId: 'missing' }] })];
  for (const previous of [null, '{broken', JSON.stringify({ version: 1, decks: [deck], cards: [card] })]) {
    for (const raw of invalid) {
      const storage = setup(null);
      if (previous !== null) storage.values.set(STORAGE_KEY, previous);
      assert.throws(() => importSnapshotJson(raw), store.StorageError);
      assert.equal(storage.writes, 0);
      assert.equal(storage.getItem(STORAGE_KEY), previous);
    }
  }
});

test('failed backup writes preserve the previous snapshot', () => {
  const storage = setup();
  const previous = storage.getItem(STORAGE_KEY);
  storage.fail = true;
  assert.throws(() => importSnapshotJson(JSON.stringify({ version: 1, decks: [], cards: [] })), errorCode('write'));
  assert.equal(storage.getItem(STORAGE_KEY), previous);
  assert.deepEqual(store.getCards(), [card]);
});

test('all vocabulary source tuples and newly seeded pairs are unique', () => {
  const rows = ['01', '02', '03', '04', '05', '06'].flatMap(n => vocabulary['VOCAB_' + n]);
  assert.equal(rows.length, new Set(rows.map(row => JSON.stringify(row))).size);
  setup(null);
  const seeded = store.getCards().filter(c => c.source === 'oxford');
  assert.ok(seeded.length > 0);
  assert.equal(seeded.length, new Set(seeded.map(c => JSON.stringify([c.front, c.back, c.level]))).size);
  assert.ok(seeded.every(c => ['B1', 'B2', 'C1', 'C2'].includes(c.level)));
});

test('metadata is validated at load, create, update, and restore boundaries without writes', () => {
  const invalids = [{ level: {} }, { level: 'Z9' }, { source: 'unknown' }, { wordEng: 42 }, { wordThai: ' ' }];
  for (const extras of invalids) {
    let storage = setup({ decks: [deck], cards: [{ ...card, ...extras }] });
    const raw = storage.getItem(STORAGE_KEY);
    assert.throws(() => store.getCards(), errorCode('invalid-data'));
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.equal(storage.writes, 0);
    storage = setup();
    assert.throws(() => store.createCard(deck.id, 'Q', 'A', extras), errorCode('invalid-data'));
    assert.throws(() => store.updateCard(card.id, extras), errorCode('invalid-data'));
    assert.throws(() => store.restoreCard({ ...card, id: 'restore', ...extras }), errorCode('invalid-data'));
    assert.throws(() => store.restoreDeck(deck, [{ ...card, ...extras }]), errorCode('invalid-data'));
    assert.equal(storage.writes, 0);
  }
});

test('legacy levels and existing duplicate cards retain IDs and schedules', () => {
  const original = [{ ...card, id: 'old-one', back: 'คำ [A1]' }, { ...card, id: 'old-two', back: 'คำ [A1]' }];
  const storage = setup({ decks: [deck], cards: original });
  assert.deepEqual(store.getCards(), original);
  assert.equal(storage.writes, 0);
  const updated = store.updateCard('old-one', { level: 'A1' });
  assert.equal(updated.interval, card.interval);
  assert.equal(updated.streak, card.streak);
  assert.deepEqual(store.getCards().map(c => c.id), ['old-one', 'old-two']);
});

test('fresh installation seeds once; Oxford deletions and progress survive reload', () => {
  const storage = setup(null);
  const decks = store.getDecks();
  assert.ok(decks.some(d => d.id === 'deck-demo'));
  assert.ok(decks.some(d => d.id === 'deck-oxford-01'));
  assert.equal(storage.writes, 1);
  const [first, second] = store.getCardsByDeck('deck-oxford-01');
  store.updateCard(second.id, { interval: 99, streak: 12 });
  store.deleteCard(first.id);
  store.deleteDeck('deck-oxford-02');
  const persisted = JSON.parse(storage.getItem(STORAGE_KEY));
  const reloaded = setup(persisted);
  assert.equal(store.getCard(first.id), undefined);
  assert.equal(store.getDeck('deck-oxford-02'), undefined);
  assert.equal(store.getCard(second.id).interval, 99);
  assert.equal(store.getCard(second.id).streak, 12);
  assert.equal(reloaded.writes, 0);
});

test('migration retains legacy single Oxford IDs, edits and review progress', () => {
  const storage = setup(null);
  const legacyDeck = { ...deck, id: 'deck-oxford-3000', name: 'Edited Oxford' };
  const legacyCard = { ...card, id: 'ox-1', deckId: legacyDeck.id };
  storage.values.set('fc_decks', JSON.stringify([deck, legacyDeck]));
  storage.values.set('fc_cards', JSON.stringify([card, legacyCard]));
  assert.deepEqual(store.getDecks(), [deck, legacyDeck]);
  assert.deepEqual(store.getCards(), [card, legacyCard]);
  assert.equal(storage.writes, 1);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 1);
  assert.ok(storage.getItem('fc_cards'));
});

test('partial Oxford and empty legacy collections are never replenished', () => {
  for (const data of [{ decks: [], cards: [] }, {
    decks: [{ ...deck, id: 'deck-oxford-01' }],
    cards: [{ ...card, id: 'deck-oxford-01-c5', deckId: 'deck-oxford-01' }],
  }]) {
    const storage = setup(null);
    storage.values.set('fc_decks', JSON.stringify(data.decks));
    storage.values.set('fc_cards', JSON.stringify(data.cards));
    assert.deepEqual(store.getDecks(), data.decks);
    assert.deepEqual(store.getCards(), data.cards);
  }
});

test('deck deletion and restoration each use one atomic write and event', () => {
  const storage = setup();
  const observations = [];
  window.addEventListener('flashcards:change', () => observations.push([store.getDecks().length, store.getCards().length]));
  const removed = store.deleteDeck(deck.id);
  assert.equal(storage.writes, 1);
  assert.deepEqual(observations, [[0, 0]]);
  store.restoreDeck(removed.deck, removed.cards);
  assert.equal(storage.writes, 2);
  assert.deepEqual(observations, [[0, 0], [1, 1]]);
  assert.deepEqual(store.getCard(card.id), card);
});

test('quota failure preserves persisted data and cache and emits no event', () => {
  const storage = setup();
  store.getCards();
  const raw = storage.getItem(STORAGE_KEY);
  let events = 0;
  window.addEventListener('flashcards:change', () => events++);
  storage.fail = true;
  assert.throws(() => store.deleteDeck(deck.id), errorCode('write'));
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  assert.deepEqual(store.getCard(card.id), card);
  assert.equal(events, 0);
  storage.fail = false;
  store.deleteDeck(deck.id);
  assert.equal(events, 1);
});

test('failed initialization and migration remain retryable without losing legacy data', () => {
  for (const legacy of [false, true]) {
    const storage = setup(null);
    if (legacy) {
      storage.values.set('fc_decks', JSON.stringify([deck]));
      storage.values.set('fc_cards', JSON.stringify([card]));
    }
    storage.fail = true;
    assert.throws(() => store.getDecks(), errorCode('write'));
    assert.equal(storage.getItem(STORAGE_KEY), null);
    storage.fail = false;
    assert.ok(store.getDecks().length);
    if (legacy) assert.deepEqual(store.getCard(card.id), card);
  }
});

test('invalid input, ID changes and orphan cards fail without writing', () => {
  const storage = setup();
  const invalid = [
    () => store.createDeck(' ', 'x'),
    () => store.createCard('missing', 'Q', 'A'),
    () => store.updateDeck(deck.id, { id: 'new' }),
    () => store.updateCard(card.id, { id: 'new' }),
    () => store.updateCard(card.id, { due: NaN }),
    () => store.updateCard(card.id, { interval: Infinity }),
    () => store.updateCard(card.id, { streak: -1 }),
    () => store.updateCard(card.id, { streak: 1.5 }),
    () => store.updateCard(card.id, { front: '' }),
    () => store.updateCard(card.id, { deckId: 'missing' }),
    () => store.updateCard(card.id, { unknown: 'field' }),
    () => store.updateCard(card.id, null),
    () => store.restoreCard({ ...card, id: 'orphan', deckId: 'missing' }),
    () => store.restoreDeck(deck, null),
    () => store.restoreDeck(deck, [{ ...card, deckId: 'other' }]),
  ];
  for (const action of invalid) assert.throws(action, errorCode('invalid-data'));
  assert.equal(storage.writes, 0);
  assert.deepEqual(store.getCard(card.id), card);
  assert.equal(store.updateCard(card.id, { ...card, interval: 64 }).interval, 64);
});

test('corrupt and future data are surfaced without overwriting either format', () => {
  for (const raw of ['{bad', '{"version":2}', '{"version":1,"decks":[],"cards":[{}]}']) {
    const storage = setup();
    storage.values.set(STORAGE_KEY, raw);
    assert.throws(() => store.getDecks(), store.StorageError);
    assert.equal(storage.writes, 0);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
  const storage = setup(null);
  storage.values.set('fc_decks', '{bad');
  assert.throws(() => store.getDecks(), errorCode('invalid-data'));
  assert.equal(storage.getItem('fc_decks'), '{bad');
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('unchanged reads avoid parsing and returned objects cannot mutate the cache', () => {
  setup();
  const originalParse = JSON.parse;
  let parses = 0;
  JSON.parse = (...args) => { parses++; return originalParse(...args); };
  try {
    store.getCards()[0].streak = 1000;
    store.getDecks()[0].name = 'Changed';
    for (let i = 0; i < 5; i++) assert.deepEqual(store.getCard(card.id), card);
    assert.equal(store.getDeck(deck.id).name, deck.name);
    assert.equal(parses, 1);
  } finally { JSON.parse = originalParse; }
});

test('external writes are observed on reads and retained by subsequent mutations', () => {
  const storage = setup();
  store.getCards();
  storage.values.set(STORAGE_KEY, JSON.stringify({ version: 1, decks: [deck], cards: [{ ...card, streak: 9 }] }));
  assert.equal(store.getCard(card.id).streak, 9);
  store.createDeck('Another', 'x');
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).cards[0].streak, 9);
});

test('restores deduplicate and create/update results do not alias cached records', () => {
  setup();
  store.restoreDeck(deck, [card, card]);
  store.restoreCard(card);
  assert.equal(store.getCards().length, 1);
  const created = store.createCard(deck.id, 'New', 'Answer');
  created.front = 'mutated';
  assert.equal(store.getCard(created.id).front, 'New');
  const updated = store.updateDeck(deck.id, { name: 'Updated' });
  updated.name = 'mutated';
  assert.equal(store.getDeck(deck.id).name, 'Updated');
});

test('SSR reads are empty and writes fail explicitly; browser access errors surface', () => {
  delete global.window;
  assert.deepEqual(store.getDecks(), []);
  assert.deepEqual(store.getCards(), []);
  assert.throws(() => store.createDeck('New', 'x'), errorCode('unavailable'));
  global.window = {};
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('Denied'); } });
  assert.throws(() => store.getDecks(), errorCode('unavailable'));
  const storage = setup();
  storage.getItem = () => { throw new Error('Denied'); };
  assert.throws(() => store.getCards(), errorCode('read'));
});
