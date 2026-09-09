"use client";

import { Button } from "@/components/Button";

/** Root-level fallback: must render its own html/body (Next.js requirement). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 560, margin: "48px auto", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h1>Something went wrong</h1>
          <p>Reload the page. Your saved sets remain in this browser.</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
