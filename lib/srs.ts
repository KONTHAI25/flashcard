import type { Card } from "./types";

/**
 * Simple SM-2-lite spaced repetition.
 * quality: 0 (Again), 1 (Good), 2 (Easy)
 */
export function reviewCard(card: Card, quality: number, now = Date.now()): Card {
  if (quality !== 0 && quality !== 1 && quality !== 2) {
    throw new RangeError("Review quality must be 0, 1, or 2");
  }
  let interval = Number.isFinite(card.interval) ? Math.max(0, card.interval) : 0;
  let ease = Number.isFinite(card.ease) ? Math.min(3, Math.max(1.3, card.ease)) : 2.5;
  let streak = Number.isFinite(card.streak) ? Math.max(0, Math.floor(card.streak)) : 0;

  if (quality === 0) {
    // Again → reset
    interval = 1; // 1 day
    ease = Math.max(1.3, ease - 0.2);
    streak = 0;
  } else if (quality === 1) {
    // Good
    if (interval < 1) {
      interval = 1;
    } else if (interval < 6) {
      interval = interval + 1;
    } else {
      interval = Math.round(interval * ease);
    }
    ease = Math.max(1.3, ease + 0.0);
    streak = streak + 1;
  } else {
    // Easy
    if (interval < 1) {
      interval = 4;
    } else {
      interval = Math.round(interval * ease * 1.3);
    }
    ease = Math.min(3.0, ease + 0.15);
    streak = streak + 1;
  }

  const due = now + interval * 24 * 60 * 60 * 1000;

  return { ...card, interval, ease, due, streak };
}

export function isDue(card: Card): boolean {
  return card.due <= Date.now();
}

export function nextReviewLabel(card: Card): string {
  const ms = card.due - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.ceil(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.ceil(hrs / 24);
  return `${days}d`;
}
