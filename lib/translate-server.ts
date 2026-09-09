import type { TranslateCandidate, TranslateResult } from "./translate-types";

export const LONGDO_URL = "https://dict.longdo.com/mobile.php";
export const LONGDO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const TRANSLATE_LIMITS = {
  fetchTimeoutMs: 6_000,
  maxResponseBytes: 256 * 1024,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  negativeCacheTtlMs: 30_000,
  cacheMaxEntries: 256,
  maxCandidates: 5,
  requestWindowMs: 60_000,
  maxRequestsPerWindow: 120,
  upstreamWindowMs: 60_000,
  maxUpstreamPerWindow: 30,
  maxUpstreamConcurrency: 4,
} as const;

type TranslatePayload = TranslateResult & { error?: string };

export interface TranslationResponse {
  data: TranslatePayload;
  status: number;
  retryAfterSeconds?: number;
}

interface CacheEntry {
  response: TranslationResponse;
  expires: number;
}

export interface TranslationServerOptions {
  now?: () => number;
  fetchImpl?: typeof fetch;
  fetchTimeoutMs?: number;
  maxResponseBytes?: number;
  cacheTtlMs?: number;
  negativeCacheTtlMs?: number;
  cacheMaxEntries?: number;
  maxCandidates?: number;
  requestWindowMs?: number;
  maxRequestsPerWindow?: number;
  upstreamWindowMs?: number;
  maxUpstreamPerWindow?: number;
  maxUpstreamConcurrency?: number;
}

interface ParsedRow extends TranslateCandidate {
  isExact: boolean;
  isSlang: boolean;
}

export class ResponseTooLargeError extends Error {
  constructor() {
    super("Longdo response was too large");
    this.name = "ResponseTooLargeError";
  }
}

export class LongdoTimeoutError extends Error {
  constructor() {
    super("Longdo lookup timed out");
    this.name = "LongdoTimeoutError";
  }
}

function decodeNumericEntity(decimal: string | undefined, hexadecimal: string | undefined): string {
  const cp = decimal !== undefined ? Number(decimal) : parseInt(hexadecimal ?? "", 16);
  // HTML replaces null, surrogate, and out-of-range numeric references. Keep
  // parsing total so malformed upstream data cannot turn into a 500 response.
  if (
    !Number.isSafeInteger(cp) ||
    cp <= 0 ||
    cp > 0x10ffff ||
    (cp >= 0xd800 && cp <= 0xdfff)
  ) {
    return "\ufffd";
  }
  return String.fromCodePoint(cp);
}

export function decodeEntities(s: string): string {
  // Decode numeric references first so a named entity that produces "&"
  // (e.g. "&amp;#65;") is not double-decoded into "A" in a second pass.
  return s
    .replace(/&#(\d+);|&#x([0-9a-fA-F]+);/g, (_, decimal: string | undefined, hexadecimal: string | undefined) =>
      decodeNumericEntity(decimal, hexadecimal),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function cellToText(cellHtml: string): string {
  const noScript = cellHtml
    .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
  const withBreaks = noScript
    .replace(/<br\s*\/?\s*>/gi, ", ")
    .replace(/<\/(div|p|li|tr)>/gi, " ");
  const stripped = withBreaks.replace(/<[^>]*>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}

const POS_TAG =
  "n|vt|vi|v|adj|adv|prep|conj|pron|aux|int|prf|phr|phrv|art|det|num|pref|suf|abbr|slang";

export function extractPos(headCellText: string, defCellText: string): string | null {
  const bracket = headCellText.match(/\[\s*([A-Za-z][A-Za-z.\s/,;-]*)\s*\]/);
  if (bracket) {
    const pos = bracket[1].replace(/[.;,\s]+$/g, "").trim();
    if (pos) return pos;
  }
  // NECTEC rows put the tag at the start of the definition cell: "(n) แมว".
  const lead = defCellText.match(new RegExp(`^\\((${POS_TAG})\\b`, "i"));
  if (lead) return lead[1].toLowerCase();
  const paren = headCellText.match(new RegExp(`\\b(${POS_TAG})\\b`, "i"));
  return paren ? paren[1].toLowerCase() : null;
}

/** Extract the complete headword, removing a trailing grammatical annotation. */
export function extractHeadword(headCellText: string): string {
  let headword = headCellText.trim();
  headword = headword.replace(/\s*\[[^\]]*\]\s*$/, "");
  headword = headword.replace(
    new RegExp(`\\s*\\(\\s*(?:${POS_TAG})(?:\\s+[A-Za-z]+)?\\s*\\)\\s*$`, "i"),
    "",
  );
  return headword
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z0-9'’. -]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDefinition(defText: string): string {
  let s = defText.replace(/\[Add to Longdo\]/gi, " ");
  // Drop trailing "See also ..." / "Syn. ..." cross-reference tails.
  const seeIdx = s.search(/see\s+also/i);
  if (seeIdx >= 0) s = s.slice(0, seeIdx);
  s = s.replace(/\bSyn\..*$/i, " ");
  // Strip a leading "(pos)" tag — it becomes the structured `pos` field.
  s = s.replace(new RegExp(`^\\((${POS_TAG})\\)\\s*`, "i"), "");
  return s
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,+$/g, "")
    .trim();
}

/** True when text contains at least one Thai codepoint (U+0E00–U+0E7F). */
export function containsThaiScript(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Parse NECTEC Lexitron EN-TH rows from Longdo mobile.php HTML.
 * Row shape: <tr><td>headword (+pos)</td><td>definition</td></tr>.
 */
export function parseLongdoHtml(
  html: string,
  word: string,
  maxCandidates: number = TRANSLATE_LIMITS.maxCandidates,
): TranslateCandidate[] {
  // Prefer the NECTEC Lexitron EN-TH section when present, cut off at the
  // next dictionary section so later tables don't leak into candidates.
  // Offsets are explicit: skip a small prefix before searching for the next
  // section boundary, and cap the scoped HTML so a 256KB response cannot
  // produce an unbounded regex scan.
  const SECTION_PREFIX_SKIP = 100;
  const SECTION_MAX_CHARS = 60_000;
  const sectionIdx = html.search(/NECTEC[^<]{0,80}Lexitron/i);
  let scoped = html;
  if (sectionIdx >= 0) {
    const after = html.slice(sectionIdx);
    const nextSection = after
      .slice(SECTION_PREFIX_SKIP)
      .search(/<br\s*\/?\s*>\s*<b>[^<>]*Dictionary|<b>Hope Dictionary/);
    scoped =
      nextSection >= 0 ? after.slice(0, SECTION_PREFIX_SKIP + nextSection) : after.slice(0, SECTION_MAX_CHARS);
  }

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr\s*>/gi;
  const rows: ParsedRow[] = [];
  const query = word.trim().toLowerCase();

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(scoped)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td\s*>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
      if (cells.length >= 3) break;
    }
    if (cells.length < 2) continue;

    const headText = cellToText(cells[0]);
    const defText = cellToText(cells[1]);
    if (!headText || !defText) continue;

    const headword = extractHeadword(headText);
    if (!headword) continue;
    const pos = extractPos(headText, defText);
    const thai = cleanDefinition(defText);
    if (!thai) continue;

    // Slang senses are marked "(slang)" in English or "(คำสแลง)" in Thai.
    const isSlang = /slang|สแลง/i.test(`${headText} ${defText}`);
    const isExact = headword.toLowerCase() === query;
    rows.push({ headword, pos, thai, isExact, isSlang });

    if (rows.length >= 40) break;
  }

  if (rows.length === 0) return [];

  // Skip slang rows when a better (exact, non-slang) match exists.
  const hasExactNonSlang = rows.some((r) => r.isExact && !r.isSlang);
  const filtered = hasExactNonSlang ? rows.filter((r) => !r.isSlang) : rows;

  filtered.sort((a, b) => {
    if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
    if (a.isSlang !== b.isSlang) return a.isSlang ? 1 : -1;
    return 0;
  });

  return filtered
    .slice(0, Math.max(1, maxCandidates))
    .map(({ headword, pos, thai }) => ({ headword, pos, thai }));
}

function fallbackBody(word: string, message: string): TranslatePayload {
  return {
    word_eng: word,
    word_thai: word,
    pos: null,
    source: "longdo",
    candidates: [],
    error: message,
  };
}

function cloneResponse(response: TranslationResponse): TranslationResponse {
  return {
    ...response,
    data: {
      ...response.data,
      candidates: response.data.candidates.map((c) => ({ ...c })),
    },
  };
}
function retryAfterSeconds(earliest: number | undefined, now: number, windowMs: number): number {
  if (earliest === undefined) return 1;
  return Math.max(1, Math.ceil((earliest + windowMs - now) / 1000));
}

function responseWithError(
  word: string,
  message: string,
  status: number,
  retryAfter?: number,
): TranslationResponse {
  return {
    data: fallbackBody(word, message),
    status,
    ...(retryAfter === undefined ? {} : { retryAfterSeconds: retryAfter }),
  };
}

async function readBodyCapped(
  response: Response,
  maxResponseBytes: number,
  onReader?: (reader: ReadableStreamDefaultReader<Uint8Array> | undefined) => void,
): Promise<string> {
  const contentLength = response.headers?.get("content-length");
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      throw new ResponseTooLargeError();
    }
  }

  const body = response.body;
  if (!body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxResponseBytes) {
      throw new ResponseTooLargeError();
    }
    return text;
  }

  const reader = body.getReader();
  onReader?.(reader);
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const value = next.value as Uint8Array;
      bytes += value.byteLength;
      if (bytes > maxResponseBytes) throw new ResponseTooLargeError();
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    try {
      // Cancellation can wait on a broken upstream. Start it, but let the
      // caller's timeout/error path continue without awaiting it.
      void Promise.resolve(reader.cancel()).catch(() => undefined);
    } catch {
      // The original read/size error is the useful failure.
    }
    throw error;
  } finally {
    onReader?.(undefined);
    try {
      reader.releaseLock();
    } catch {
      // The stream may already have released the lock during cancellation.
    }
  }
}

function cancelBody(response: Response | undefined): void {
  const body = response?.body;
  if (!body || body.locked) return;
  try {
    void Promise.resolve(body.cancel()).catch(() => undefined);
  } catch {
    // Cleanup is best effort; the controller abort still closes native fetches.
  }
}

function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array> | undefined): void {
  if (!reader) return;
  try {
    void Promise.resolve(reader.cancel()).catch(() => undefined);
  } catch {
    // Cleanup is best effort.
  }
  try {
    reader.releaseLock();
  } catch {
    // The read path may have released the lock concurrently.
  }
}

export class TranslationServer {
  private readonly now: () => number;
  private readonly fetchImpl: typeof fetch;
  private readonly fetchTimeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly cacheTtlMs: number;
  private readonly negativeCacheTtlMs: number;
  private readonly cacheMaxEntries: number;
  private readonly maxCandidates: number;
  private readonly requestWindowMs: number;
  private readonly maxRequestsPerWindow: number;
  private readonly upstreamWindowMs: number;
  private readonly maxUpstreamPerWindow: number;
  private readonly maxUpstreamConcurrency: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<TranslationResponse>>();
  private readonly requestTimes: number[] = [];
  private readonly upstreamTimes: number[] = [];
  private activeUpstream = 0;

  constructor(options: TranslationServerOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
    this.fetchTimeoutMs = options.fetchTimeoutMs ?? TRANSLATE_LIMITS.fetchTimeoutMs;
    this.maxResponseBytes = options.maxResponseBytes ?? TRANSLATE_LIMITS.maxResponseBytes;
    this.cacheTtlMs = options.cacheTtlMs ?? TRANSLATE_LIMITS.cacheTtlMs;
    this.negativeCacheTtlMs = options.negativeCacheTtlMs ?? TRANSLATE_LIMITS.negativeCacheTtlMs;
    this.cacheMaxEntries = Math.max(1, options.cacheMaxEntries ?? TRANSLATE_LIMITS.cacheMaxEntries);
    this.maxCandidates = Math.max(1, options.maxCandidates ?? TRANSLATE_LIMITS.maxCandidates);
    this.requestWindowMs = options.requestWindowMs ?? TRANSLATE_LIMITS.requestWindowMs;
    this.maxRequestsPerWindow = Math.max(1, options.maxRequestsPerWindow ?? TRANSLATE_LIMITS.maxRequestsPerWindow);
    this.upstreamWindowMs = options.upstreamWindowMs ?? TRANSLATE_LIMITS.upstreamWindowMs;
    this.maxUpstreamPerWindow = Math.max(1, options.maxUpstreamPerWindow ?? TRANSLATE_LIMITS.maxUpstreamPerWindow);
    this.maxUpstreamConcurrency = Math.max(1, options.maxUpstreamConcurrency ?? TRANSLATE_LIMITS.maxUpstreamConcurrency);
  }

  getCacheSize(): number {
    this.purgeExpiredCache();
    return this.cache.size;
  }

  getInFlightSize(): number {
    return this.inFlight.size;
  }

  reset(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.requestTimes.length = 0;
    this.upstreamTimes.length = 0;
    this.activeUpstream = 0;
  }

  private purgeExpiredCache(): void {
    const now = this.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires <= now) this.cache.delete(key);
    }
  }

  private getCached(key: string): TranslationResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.cache.delete(key);
      return undefined;
    }
    // Keep hot keys available when the bounded cache reaches capacity.
    this.cache.delete(key);
    this.cache.set(key, entry);
    // Return a copy: callers must not be able to mutate the cached entry.
    return cloneResponse(entry.response);
  }

  private setCached(key: string, response: TranslationResponse, ttlMs: number): void {
    this.purgeExpiredCache();
    this.cache.delete(key);
    while (this.cache.size >= this.cacheMaxEntries) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { response, expires: this.now() + ttlMs });
  }

  private takeRequestBudget(): TranslationResponse | undefined {
    const now = this.now();
    while (this.requestTimes[0] !== undefined && this.requestTimes[0] + this.requestWindowMs <= now) {
      this.requestTimes.shift();
    }
    if (this.requestTimes.length >= this.maxRequestsPerWindow) {
      return responseWithError(
        "",
        "Translation request budget exceeded; try again later",
        429,
        retryAfterSeconds(this.requestTimes[0], now, this.requestWindowMs),
      );
    }
    this.requestTimes.push(now);
    return undefined;
  }

  private takeUpstreamBudget(word: string): TranslationResponse | undefined {
    const now = this.now();
    while (this.upstreamTimes[0] !== undefined && this.upstreamTimes[0] + this.upstreamWindowMs <= now) {
      this.upstreamTimes.shift();
    }
    if (this.activeUpstream >= this.maxUpstreamConcurrency) {
      return responseWithError(
        word,
        "Translation service is busy; try again later",
        503,
        1,
      );
    }
    if (this.upstreamTimes.length >= this.maxUpstreamPerWindow) {
      return responseWithError(
        word,
        "Translation upstream budget exceeded; try again later",
        503,
        retryAfterSeconds(this.upstreamTimes[0], now, this.upstreamWindowMs),
      );
    }
    this.upstreamTimes.push(now);
    this.activeUpstream += 1;
    return undefined;
  }

  private async fetchLongdoHtml(word: string): Promise<string> {
    const controller = new AbortController();
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let response: Response | undefined;
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const operation = (async () => {
      response = await this.fetchImpl(
        `${LONGDO_URL}?search=${encodeURIComponent(word)}`,
        {
          headers: {
            "User-Agent": LONGDO_USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`Longdo responded with HTTP ${response.status}`);
      }
      return await readBodyCapped(response, this.maxResponseBytes, (reader) => {
        activeReader = reader;
      });
    })();
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new LongdoTimeoutError());
      }, this.fetchTimeoutMs);
    });
    try {
      return await Promise.race([operation, timeout]);
    } catch (error) {
      controller.abort();
      cancelReader(activeReader);
      cancelBody(response);
      if (timedOut || (error instanceof Error && error.name === "AbortError")) {
        throw new LongdoTimeoutError();
      }
      throw error;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  private async performLookup(word: string, key: string): Promise<TranslationResponse> {
    try {
      const html = await this.fetchLongdoHtml(word);
      const parsed = parseLongdoHtml(html, word, this.maxCandidates);
      // Sanity check: EN-TH candidates must contain Thai script. A parse that
      // yields only Latin text means the upstream markup changed shape.
      const candidates = parsed.filter((c) => containsThaiScript(c.thai));
      if (candidates.length === 0) {
        const reason =
          parsed.length === 0
            ? `No EN-TH entry found for "${word}"`
            : `No Thai-script definition found for "${word}" (upstream markup may have changed)`;
        const response = responseWithError(word, reason, 502);
        this.setCached(key, response, this.negativeCacheTtlMs);
        return cloneResponse(response);
      }
      const response: TranslationResponse = {
        data: {
          word_eng: word,
          word_thai: candidates[0].thai,
          pos: candidates[0].pos,
          source: "longdo",
          candidates,
        },
        status: 200,
      };
      this.setCached(key, response, this.cacheTtlMs);
      return cloneResponse(response);
    } catch (error) {
      const message =
        error instanceof LongdoTimeoutError
          ? error.message
          : error instanceof ResponseTooLargeError
            ? error.message
            : `Longdo lookup failed: ${error instanceof Error ? error.message : "fetch error"}`;
      return responseWithError(word, message, 502);
    } finally {
      this.activeUpstream = Math.max(0, this.activeUpstream - 1);
    }
  }

  async lookup(word: string): Promise<TranslationResponse> {
    // Cache (and in-flight dedup) first: hits must not consume the shared
    // request budget, otherwise one client can 429 the feature for everyone
    // sharing this instance (F16).
    const key = normalizeKey(word);
    this.purgeExpiredCache();
    const cached = this.getCached(key);
    if (cached) return cached;

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const requestBudgetError = this.takeRequestBudget();
    if (requestBudgetError) {
      return { ...requestBudgetError, data: fallbackBody(word, requestBudgetError.data.error ?? "Request budget exceeded") };
    }

    const upstreamBudgetError = this.takeUpstreamBudget(word);
    if (upstreamBudgetError) return upstreamBudgetError;

    const task = this.performLookup(word, key);
    this.inFlight.set(key, task);
    // Attach cleanup without creating an unhandled rejected promise.
    void task.then(
      () => {
        if (this.inFlight.get(key) === task) this.inFlight.delete(key);
      },
      () => {
        if (this.inFlight.get(key) === task) this.inFlight.delete(key);
      },
    );
    return task;
  }
}

function normalizeKey(word: string): string {
  return word.trim().toLowerCase();
}
