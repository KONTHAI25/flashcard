import type { TranslateResult } from "./translate-types";
export type { TranslateCandidate, TranslateResult } from "./translate-types";

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const CLIENT_CACHE_MAX_ENTRIES = 64;

interface ClientCacheEntry {
  data: TranslateResult;
  expires: number;
}

const cache = new Map<string, ClientCacheEntry>();
const inFlight = new Map<string, Promise<TranslateResult>>();

function normalizeKey(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Client helper: look up EN->TH via the server-side Longdo proxy.
 * A small TTL cache and in-flight map avoid duplicate lookups from the editor.
 */
export async function fetchTranslate(word_eng: string): Promise<TranslateResult> {
  const raw = (word_eng ?? "").trim();
  if (!raw) throw new Error("fetchTranslate: missing word_eng");
  const key = normalizeKey(raw);

  const now = Date.now();
  for (const [cachedKey, entry] of cache) {
    if (entry.expires <= now) cache.delete(cachedKey);
  }
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit.data;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(`/api/translate?word=${encodeURIComponent(raw)}`);
    let data: TranslateResult & { error?: string };
    try {
      data = (await res.json()) as TranslateResult & { error?: string };
    } catch {
      throw new Error(`Translate request failed (HTTP ${res.status})`);
    }

    // Server returns a fallback body (word_thai echo + error) on Longdo or
    // capacity failure — still usable for manual entry, but do not cache it.
    if (!res.ok) {
      if (data && typeof data.word_thai === "string") {
        return data as TranslateResult;
      }
      throw new Error(
        (data as { error?: string })?.error ??
          `Translate request failed (HTTP ${res.status})`,
      );
    }

    while (cache.size >= CLIENT_CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
    cache.set(key, { data: data as TranslateResult, expires: Date.now() + CLIENT_CACHE_TTL_MS });
    return data as TranslateResult;
  })();
  inFlight.set(key, request);
  void request.then(
    () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    },
    () => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    },
  );
  return request;
}

export function clearTranslateCache(): void {
  cache.clear();
  inFlight.clear();
}
