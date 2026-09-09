import { updateCardReview } from "@/lib/store";

/** Persist a review atomically; deleted cards resolve to null (never resurrected). */
export function saveReview(id: string, quality: number) {
  return updateCardReview(id, quality);
}
