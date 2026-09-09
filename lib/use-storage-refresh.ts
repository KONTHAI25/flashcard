"use client";

import { useEffect } from "react";

/**
 * Shared storage refresh lifecycle (minor dedupe). Subscribes to
 * cross-tab `storage` events, in-app `flashcards:change`, visibility
 * changes, and a 60s poll. Returns an unsubscribe on unmount.
 */
export function useStorageRefresh(refresh: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
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
  }, [refresh, enabled]);
}
