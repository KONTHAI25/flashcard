"use client";

import { useRef, useState } from "react";
import { Button } from "./Button";
import { showToast } from "./Toast";
import { exportSnapshotJson, importSnapshotJson } from "@/lib/export-import";

/** Backup / restore for browser-only persistence (F1). */
export function BackupButtons({ onRestored }: { onRestored?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function handleExport() {
    try {
      const json = exportSnapshotJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flashcards-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Could not export your sets.");
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const result = importSnapshotJson(text);
      onRestored?.();
      showToast(`Restored ${result.decks} sets and ${result.cards} terms.`);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "Could not import this file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={handleExport}>
        Export backup
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        loading={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? "Importing…" : "Import backup"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import backup file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
