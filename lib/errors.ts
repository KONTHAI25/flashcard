/** User-facing text for a caught value: its Error message, or the fallback. */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
