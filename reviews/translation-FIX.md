# Translation fixes

Implemented the translation endpoint fixes for WR-02 and WR-05.

- **WR-02:** Added bounded per-instance success and negative-result caches with actual expiry checks and capacity eviction, in-flight lookup deduplication, a request-window budget, an upstream-window budget, and a maximum active upstream concurrency. The browser helper also now bounds its short-lived cache and deduplicates concurrent calls. Request exhaustion returns the existing manual-entry fallback shape with HTTP 429 and `Retry-After`; temporary upstream capacity exhaustion returns HTTP 503 with `Retry-After`.
- **WR-02:** Longdo response bodies are read as a byte stream with a 256 KiB cap. A single abort timeout covers both the fetch and complete body consumption. No forwarded IP is trusted and no distributed protection is claimed; these controls apply to one running server instance.
- **WR-05:** Headword extraction removes only trailing grammatical annotations, so phrase candidates such as `take off [phrv]` retain `take off` for exact-match ranking. Numeric HTML entities are decoded with bounds checks so malformed values cannot throw.

Validation:

- `node --test tests/translate*.test.cjs` — 11 passed.
- `npx tsc --noEmit` — translation files typecheck, but the current shared tree has an unrelated existing error at `app/deck/[id]/page.tsx:586` (`handleSave` is passed as a mouse event handler).
- Targeted ESLint on the route and server helper — passed.

The tests use mocked offline upstream responses and cover misses, concurrent identical and different words, cache capacity and expiry, request limits, oversized bodies, and a body-consumption timeout. No live Longdo request or load test was performed.
