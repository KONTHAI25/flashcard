"use client";

import { useCallback, useEffect, useState } from "react";
import { getCards, getDecks } from "./store";
import { summarizeDecks, type DeckSummary } from "./library";

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

  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("storage", refresh);
    window.addEventListener("flashcards:change", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, 60_000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("flashcards:change", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);
  return { summaries, loading, error, refresh };
}
