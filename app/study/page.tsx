"use client";

import Link from "next/link";
import { useLibrary } from "@/lib/use-library";
import { LoadError } from "@/components/LoadError";
import { Icon } from "@/components/Icon";

export default function StudyIndexPage() {
  const { summaries, loading, error, refresh } = useLibrary();
  if (error) return <LoadError message={error} onRetry={refresh} />;
  if (loading) return <p role="status">Loading flashcards…</p>;
  const sets = summaries.filter(row => row.total > 0).sort((a, b) => (b.reviewed - b.learned) - (a.reviewed - a.learned) || b.due - a.due);
  const totalDue = sets.reduce((sum, row) => sum + row.due, 0);
  const learning = sets.reduce((sum, row) => sum + row.reviewed - row.learned, 0);

  return <div>
    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Flashcards</h1>
    <p className="mt-2 text-sm text-slate-500">Practice any set, anytime. Pick up the terms you’re still learning or play again.</p>
    <div className="my-6 flex flex-wrap items-center gap-4 text-sm">
      <span className="rounded-full bg-indigo-50 px-3 py-2 font-medium text-indigo-700">{learning} still learning</span>
      <span className="text-slate-500">{totalDue} due for review · {sets.length} sets</span>
      {totalDue > 0 && <Link href="/study/all" className="inline-flex min-h-11 items-center gap-2 font-semibold text-indigo-600">Review all due <Icon name="arrow" width="17" height="17" /></Link>}
    </div>
    {sets.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-semibold">Add a few terms to start</h2><Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-indigo-600">Back to your library</Link></div> :
      <ul className="space-y-3">{sets.map(({ deck, total, due, reviewed, learned }) => {
        const remaining = reviewed - learned;
        return <li key={deck.id}><Link href={`/study/${deck.id}`} aria-label={`${remaining ? "Continue learning" : "Practice"} ${deck.name}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xl">{deck.emoji}</span>
          <span className="min-w-0 flex-1"><span className="block break-words font-semibold">{deck.name}</span><span className="mt-1 block text-xs text-slate-500">{total} terms · {remaining} still learning · {due} due</span></span>
          <span className="text-sm font-semibold text-indigo-600">{remaining ? "Continue" : "Practice"}</span><Icon name="arrow" className="shrink-0 text-indigo-500" width="18" height="18" />
        </Link></li>;
      })}</ul>}
  </div>;
}
