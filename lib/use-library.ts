"use client";

import { useCallback, useState } from "react";
import { getCards, getDecks } from "./store";
import { summarizeDecks, type DeckSummary } from "./library";
import { useStorageRefresh } from "./use-storage-refresh";

export function useLibrary() {
  const [summaries, setSummaries] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    try {
      setSummaries(summarizeDecks(getDecks(), getCards()));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your sets. Please try again.");
    } finally { setLoading(false); }
  }, []);

  useStorageRefresh(refresh);
  return { summaries, loading, error, refresh };
}
