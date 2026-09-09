"use client";

import { replaceStorage, readStorage, STORAGE_KEY, StorageError } from "./storage";
import type { Card, Deck } from "./types";

export interface SnapshotImportResult {
  decks: number;
  cards: number;
  mode: "replace";
}

/** Serialize the current library (versioned snapshot shape) for backup. */
export function exportSnapshotJson(): string {
  const data = readStorage();
  return JSON.stringify({ version: 1, decks: data.decks, cards: data.cards }, null, 2);
}

/** Read the raw persisted string even when it fails validation (recovery). */
export function readRawSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function assertDeckArray(value: unknown): asserts value is Deck[] {
  if (!Array.isArray(value)) throw new StorageError("invalid-data", "Import: decks must be an array.");
}

function assertCardArray(value: unknown): asserts value is Card[] {
  if (!Array.isArray(value)) throw new StorageError("invalid-data", "Import: cards must be an array.");
}

/**
 * Replace the library with a previously exported snapshot.
 * Validation happens inside the atomic write: invalid imports throw
 * StorageError and leave the current snapshot untouched.
 */
export function importSnapshotJson(raw: string): SnapshotImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new StorageError("invalid-data", "Import: file is not valid JSON.", cause);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new StorageError("invalid-data", "Import: expected an object with decks and cards.");
  }
  const snapshot = parsed as Record<string, unknown>;
  if (snapshot.version !== 1) {
    throw new StorageError("unsupported-version", "Import: unsupported snapshot version.");
  }
  assertDeckArray(snapshot.decks);
  assertCardArray(snapshot.cards);
  const decks = snapshot.decks.map((d) => ({ ...d }));
  const cards = snapshot.cards.map((c) => ({ ...c }));
  replaceStorage({ decks, cards });
  return { decks: decks.length, cards: cards.length, mode: "replace" };
}
