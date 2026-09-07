import { Card } from "./types";

/**
 * Simple SM-2-lite spaced repetition.
 * quality: 0 (Again), 1 (Good), 2 (Easy)
 */
export function reviewCard(card: Card, quality: number): Card {
  let { interval, ease, streak } = card;

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

  const due = Date.now() + interval * 24 * 60 * 60 * 1000;

  return { ...card, interval, ease, due, streak };
}

export function isDue(card: Card): boolean {
  return card.due <= Date.now();
}

export function nextReviewLabel(card: Card): string {
  const ms = card.due - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}
