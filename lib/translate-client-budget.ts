/** Bounded, per-instance fairness hints; global upstream limits remain authoritative. */
export function createClientBudget({ maxClients = 2048, limit = 60, windowMs = 60_000 } = {}) {
  const clients = new Map<string, number[]>();
  return (hint: string, now: number): number | undefined => {
    const key = hint.slice(0, 128) || "unknown";
    if (!clients.has(key) && clients.size >= maxClients) {
      for (const [client, times] of clients) {
        if (times[times.length - 1] + windowMs <= now) clients.delete(client);
      }
      // Do not let caller-controlled, unique headers grow the map indefinitely.
      if (clients.size >= maxClients) return 1;
    }
    const hits = (clients.get(key) ?? []).filter(time => time + windowMs > now);
    if (hits.length >= limit) {
      clients.set(key, hits);
      return Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    }
    hits.push(now);
    clients.set(key, hits);
    return undefined;
  };
}
