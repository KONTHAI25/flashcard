import { NextRequest, NextResponse } from "next/server";
import { createClientBudget } from "@/lib/translate-client-budget";
import {
  TranslationServer,
} from "@/lib/translate-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keep the platform timeout above the upstream fetch timeout (6s) so the
// app's graceful 502 fallback wins over a platform 504.
export const maxDuration = 10;

// This state is intentionally per server instance. It limits this process and
// does not claim to provide distributed protection across replicas.
// Pair with edge per-IP rate limiting (e.g. Vercel WAF) for public deploys.
const translationServer = new TranslationServer();

// Minimal per-IP fairness bucket (in-process defense-in-depth only).
// Replicas each hold their own map; use edge rate limiting as the real gate.
const takeIpBudget = createClientBudget();

function clientIp(request: NextRequest): string {
  // Forwarded headers are only fairness hints, not authenticated identities.
  // Process-wide budgets still apply if a direct caller spoofs these headers.
  const headers = (request as { headers?: { get?: (name: string) => string | null } }).headers;
  const forwarded = headers?.get?.("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers?.get?.("x-real-ip")?.trim() || "unknown";
}

function wordHash(word: string): string {
  // Compact diagnostic fingerprint, not an anonymization mechanism.
  let hash = 5381;
  for (let i = 0; i < word.length; i++) {
    hash = ((hash << 5) + hash + word.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  const word = (request.nextUrl.searchParams.get("word") ?? "").trim();

  if (!word) {
    return NextResponse.json({ error: "Missing ?word= query parameter" }, { status: 400 });
  }
  if (word.length > 100) {
    return NextResponse.json({ error: "?word= is too long" }, { status: 400 });
  }

  const ipRetry = takeIpBudget(clientIp(request), started);
  if (ipRetry !== undefined) {
    console.warn(
      JSON.stringify({ route: "translate", status: 429, reason: "per-ip-budget", retryAfter: ipRetry, wordLen: word.length }),
    );
    return NextResponse.json(
      { word_eng: word, word_thai: word, pos: null, source: "longdo", candidates: [], error: "Translation request budget exceeded for this client; try again later" },
      { status: 429, headers: { "Retry-After": String(ipRetry), "Cache-Control": "no-store" } },
    );
  }

  const result = await translationServer.lookup(word);
  const latencyMs = Date.now() - started;
  const level = result.status >= 500 ? "warn" : "info";
  console[level](
    JSON.stringify({
      route: "translate",
      status: result.status,
      latencyMs,
      wordLen: word.length,
      wordHash: wordHash(word),
      cacheSize: translationServer.getCacheSize(),
      inFlight: translationServer.getInFlightSize(),
    }),
  );
  const headers: Record<string, string> = {};
  if (result.retryAfterSeconds !== undefined) headers["Retry-After"] = String(result.retryAfterSeconds);
  // Successful translations are immutable for 24h (server cache TTL); errors
  // and fallbacks must not be cached by CDNs or browsers.
  headers["Cache-Control"] = result.status === 200 ? "public, max-age=86400" : "no-store";
  return NextResponse.json(result.data, { status: result.status, headers });
}
