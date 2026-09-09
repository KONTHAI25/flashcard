import { getCard, updateCard } from "@/lib/store";
import { reviewCard } from "@/lib/srs";

/** Read the latest schedule and patch only review fields, preserving concurrent edits. */
export function saveReview(id: string, quality: number) {
  const current = getCard(id);
  if (!current) return null;
  const { interval, ease, due, streak } = reviewCard(current, quality);
  return updateCard(id, { interval, ease, due, streak });
}
