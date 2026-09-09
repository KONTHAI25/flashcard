"use client";

import { useRef, useState } from "react";
import { Button } from "./Button";
import { showToast } from "./Toast";
import { exportSnapshotJson, importSnapshotJson, readRawSnapshot } from "@/lib/export-import";

/** Backup / restore for browser-only persistence (F1). */
export function BackupButtons({ onRestored, recovery = false }: { onRestored?: () => void; recovery?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function handleExport() {
    try {
      const json = recovery ? readRawSnapshot() : exportSnapshotJson();
      if (json === null) throw new Error("No saved snapshot is available to download.");
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
      if (!window.confirm("Replace all current sets and study progress with this backup? Export a backup first if you want to keep them.")) return;
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
        {recovery ? "Download raw data" : "Export backup"}
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
