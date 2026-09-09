import { Card, Deck } from "./types";
import { buildInitialData } from "./storage-seed";

export const STORAGE_KEY = "fc_storage";
export type StorageErrorCode = "unavailable" | "read" | "write" | "invalid-data" | "unsupported-version";

/** Persistence failures are synchronous: callers must not report success after one. */
export class StorageError extends Error {
  constructor(public readonly code: StorageErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "StorageError";
  }
}

export interface StorageData { decks: Deck[]; cards: Card[] }
interface Snapshot extends StorageData { version: 1 }
let cachedStorage: Storage | undefined;
let cachedRaw: string | undefined;
let cachedSnapshot: Snapshot | undefined;

function invalid(message: string): never { throw new StorageError("invalid-data", message); }
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Expected an object.");
}
function text(value: unknown, field: string): void {
  if (typeof value !== "string" || !value.trim()) invalid(`${field} must be a nonempty string.`);
}
function number(value: unknown, field: string, minimum = 0): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) invalid(`${field} must be a finite number >= ${minimum}.`);
}
export function validateDeck(value: unknown): asserts value is Deck {
  record(value);
  for (const field of ["id", "name", "emoji"]) text(value[field], field);
  number(value.createdAt, "createdAt");
}
export function validateCard(value: unknown): asserts value is Card {
  record(value);
  for (const field of ["id", "deckId", "front", "back"]) text(value[field], field);
  for (const field of ["interval", "due", "streak", "createdAt"]) number(value[field], field);
  number(value.ease, "ease", Number.MIN_VALUE);
  if (!Number.isInteger(value.streak)) invalid("streak must be an integer.");
}
function validateData(value: unknown): asserts value is StorageData {
  record(value);
  if (!Array.isArray(value.decks) || !Array.isArray(value.cards)) invalid("Expected decks and cards arrays.");
  const decks = new Set<string>();
  const cards = new Set<string>();
  for (const deck of value.decks) {
    validateDeck(deck);
    if (decks.has(deck.id)) invalid(`Duplicate deck ID: ${deck.id}`);
    decks.add(deck.id);
  }
  for (const card of value.cards) {
    validateCard(card);
    if (cards.has(card.id)) invalid(`Duplicate card ID: ${card.id}`);
    if (!decks.has(card.deckId)) invalid(`Missing deck: ${card.deckId}`);
    cards.add(card.id);
  }
}

export function validatePatch(patch: unknown, currentId: string, fields: readonly string[]): void {
  record(patch);
  for (const key of Object.keys(patch)) {
    if (!fields.includes(key)) invalid(`Unknown field: ${key}`);
  }
  // Existing review callers pass complete Card objects, including the unchanged ID.
  if ("id" in patch && patch.id !== currentId) invalid("IDs cannot be changed.");
}

function storage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage; }
  catch (cause) { throw new StorageError("unavailable", "Browser storage is unavailable.", cause); }
}
function read(target: Storage, key: string): string | null {
  try { return target.getItem(key); }
  catch (cause) { throw new StorageError("read", "Unable to read saved flashcards.", cause); }
}
function parse(raw: string): unknown {
  try { return JSON.parse(raw); }
  catch (cause) { throw new StorageError("invalid-data", "Saved flashcards contain invalid JSON; original data was retained.", cause); }
}
function copy(data: StorageData): StorageData {
  return { decks: data.decks.map(deck => ({ ...deck })), cards: data.cards.map(card => ({ ...card })) };
}
function persist(target: Storage, data: StorageData): void {
  validateData(data);
  const snapshot: Snapshot = { ...copy(data), version: 1 };
  const raw = JSON.stringify(snapshot);
  try { target.setItem(STORAGE_KEY, raw); }
  catch (cause) { throw new StorageError("write", "Unable to save flashcards. Storage may be full or disabled.", cause); }
  // Publish only after the single atomic localStorage write succeeds.
  cachedStorage = target;
  cachedRaw = raw;
  cachedSnapshot = snapshot;
  window.dispatchEvent(new CustomEvent("flashcards:change"));
}
function load(target: Storage): Snapshot {
  const raw = read(target, STORAGE_KEY);
  if (raw !== null) {
    if (target === cachedStorage && raw === cachedRaw && cachedSnapshot) return cachedSnapshot;
    const snapshot = parse(raw);
    record(snapshot);
    if (snapshot.version !== 1) throw new StorageError("unsupported-version", "Unsupported flashcard storage version; saved data was retained.");
    validateData(snapshot);
    cachedStorage = target;
    cachedRaw = raw;
    cachedSnapshot = snapshot as unknown as Snapshot;
    return cachedSnapshot;
  }
  const decks = read(target, "fc_decks");
  const cards = read(target, "fc_cards");
  // Legacy presence (even empty arrays) means an existing installation. Preserve
  // deletions and the old single Oxford deck, IDs, and scheduling fields verbatim.
  // Keep legacy keys as a recovery copy; the versioned snapshot is authoritative.
  const data = decks === null && cards === null ? buildInitialData() : {
    decks: decks === null ? [] : parse(decks),
    cards: cards === null ? [] : parse(cards),
  };
  validateData(data);
  persist(target, data);
  return cachedSnapshot!;
}

export function readStorage(): StorageData {
  const target = storage();
  return target ? copy(load(target)) : { decks: [], cards: [] };
}

/** One synchronous read/modify/write; independent tabs are last-writer-wins. */
export function changeStorage<T>(change: (data: StorageData) => T): T {
  const target = storage();
  if (!target) throw new StorageError("unavailable", "Flashcards can only be saved in a browser.");
  const data = copy(load(target));
  const result = change(data);
  persist(target, data);
  return result;
}
