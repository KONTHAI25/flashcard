"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { readRawSnapshot } from "@/lib/export-import";

/** Route-level error boundary with recovery even when storage is corrupt (F8). */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  function downloadRaw() {
    try {
      const raw = readRawSnapshot();
      if (!raw) return;
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flashcards-raw-recovery.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Recovery download is best effort.
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your saved sets are still in this browser. Try again, or download the raw data before clearing site data.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={reset} className="w-full">Try again</Button>
        <Button variant="secondary" onClick={downloadRaw} className="w-full">Download raw data</Button>
        <Button variant="secondary" onClick={() => router.push("/")} className="w-full">Back to library</Button>
      </div>
    </div>
  );
}
