"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeck } from "@/lib/store";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

const ICONS = ["📖", "🎯", "🧮", "🌍", "💻", "🎨", "🔬", "🎵", "🧠", "⚡"];

export function CreateSetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(ICONS[0]);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title="Create a set">
      <form className="space-y-5" onSubmit={(event) => {
        event.preventDefault();
        try {
          const deck = createDeck(name.trim(), emoji);
          setName(""); setEmoji(ICONS[0]); setError(null);
          onClose(); router.push(`/deck/${deck.id}`);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your set. Please try again."); }
      }}>
        <div>
          <label htmlFor="set-name" className="mb-2 block text-sm font-medium">Set name</label>
          <input id="set-name" className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Everyday Spanish" maxLength={120} autoComplete="off" autoFocus required />
          <p className="mt-2 text-xs text-slate-500">Start with a topic. Add your terms next.</p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Set icon</legend>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((icon) => <button key={icon} type="button" onClick={() => setEmoji(icon)} aria-label={`Use ${icon} as set icon`} aria-pressed={emoji === icon} className={`grid h-11 w-11 place-items-center rounded-xl border text-xl ${emoji === icon ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200 hover:bg-slate-50"}`}>{icon}</button>)}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={!name.trim()} className="w-full">Create set</Button>
      </form>
    </Sheet>
  );
}
