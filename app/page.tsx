"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteDeck, restoreDeck } from "@/lib/store";
import { useLibrary } from "@/lib/use-library";
import type { DeckSummary } from "@/lib/library";
import { SetCard } from "@/components/SetCard";
import { CreateSetSheet } from "@/components/CreateSetSheet";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/ui";
import { showToast } from "@/components/Toast";
import { Icon } from "@/components/Icon";

const FILTERS = [{ value: "all", label: "All sets" }, { value: "due", label: "To review" }, { value: "new", label: "Not started" }] as const;
type Filter = typeof FILTERS[number]["value"];

function LibraryLoading() {
  return <div role="status" className="py-20 text-center text-sm text-slate-500">Loading your library…</div>;
}

function Library() {
  const { summaries, loading, error, refresh } = useLibrary();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(12);
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    if (searchParams.get("new") === "1") { setOpen(true); router.replace("/", { scroll: false }); }
  }, [searchParams, router]);
  useEffect(() => { setVisibleCount(12); }, [query, filter, sort]);

  const totalDue = summaries.reduce((sum, item) => sum + item.due, 0);
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return summaries.filter((item) => item.deck.name.toLocaleLowerCase().includes(text))
      .filter((item) => filter === "due" ? item.due > 0 : filter === "new" ? item.total > 0 && item.reviewed === 0 : true)
      .sort((a, b) => sort === "az" ? a.deck.name.localeCompare(b.deck.name) : sort === "due" ? b.due - a.due : b.deck.createdAt - a.deck.createdAt);
  }, [summaries, query, filter, sort]);

  function remove({ deck }: DeckSummary) {
    try {
      const removed = deleteDeck(deck.id);
      refresh();
      showToast(`Deleted “${deck.name}”`, { label: "Undo", onUndo: () => {
        if (removed.deck) restoreDeck(removed.deck, removed.cards);
        refresh();
      } });
    } catch (cause) { showToast(cause instanceof Error ? cause.message : "Could not delete this set."); }
  }

  if (loading) return <LibraryLoading />;
  if (error) return <EmptyState title="Your library could not load" hint={error} action={<Button onClick={refresh}>Try again</Button>} />;

  return <div className="library-page">
    <header className="library-intro"><div><h1>Good things take practice.</h1><p>Pick a set. Find your rhythm. Make it stick.</p></div><span className="intro-doodle" aria-hidden="true">✳</span></header>
    <section aria-label="Ways to study" className="study-shortcuts">
      <Link href="/study" className="study-shortcut shortcut-cards"><div><h2>Flashcards</h2><p>A little repetition goes a long way.</p><span>Start reviewing <Icon name="arrow" width="16" height="16" /></span></div><div className="mode-art cards-art" aria-hidden="true"><i /><i /><Icon name="cards" width="32" height="32" /></div></Link>
      <Link href="/quiz" className="study-shortcut shortcut-quiz"><div><h2>Practice quiz</h2><p>See what you know. Build on it.</p><span>Test yourself <Icon name="arrow" width="16" height="16" /></span></div><div className="mode-art quiz-art" aria-hidden="true"><Icon name="quiz" width="48" height="48" /><i>✓</i></div></Link>
      <button type="button" onClick={() => setOpen(true)} className="study-shortcut shortcut-create"><div><h2>Make it yours</h2><p>Your topic. Your next study set.</p><span>Create a set <Icon name="plus" width="16" height="16" /></span></div><div className="mode-art create-art" aria-hidden="true"><Icon name="plus" width="38" height="38" /></div></button>
    </section>

    <section aria-labelledby="library-heading" className="sets-section">
      <div className="sets-title-row"><h2 id="library-heading">Your study sets <span>{summaries.length}</span></h2><Link href="/study/all" className="review-all">{totalDue ? "Review all due" : "Review progress"}<Icon name="arrow" width="16" height="16" /></Link></div>
      <div className="library-tabs" role="group" aria-label="Filter sets">{FILTERS.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={filter === item.value ? "library-tab active" : "library-tab"}>{item.label}</button>)}</div>
      <div className="library-toolbar">
        <label className="sort-control"><span>Sort by</span><select aria-label="Sort sets" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently created</option><option value="due">Most due</option><option value="az">Alphabetical</option></select></label>
        <div className="library-search-view"><label className="set-search"><Icon name="search" width="17" height="17" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a set" aria-label="Search sets" /></label><div className="view-switch" role="group" aria-label="View sets">{(["grid", "list"] as const).map(mode => <button type="button" key={mode} aria-label={`${mode === "grid" ? "Grid" : "List"} view`} aria-pressed={view === mode} onClick={() => setView(mode)} className={view === mode ? "selected" : ""}><Icon name={mode} width="18" height="18" /></button>)}</div></div>
      </div>
      {filtered.length ? <>
        <ul className={`set-collection ${view === "list" ? "set-collection-list" : ""}`}>{filtered.slice(0, visibleCount).map(summary => <SetCard key={summary.deck.id} summary={summary} onDelete={() => remove(summary)} />)}</ul>
        <div className="library-pagination"><p role="status">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} sets</p>{filtered.length > visibleCount && <Button variant="secondary" onClick={() => setVisibleCount(count => count + 12)}>Show more sets</Button>}</div>
      </> : <EmptyState title={summaries.length ? "No matching sets" : "Your first set starts here"} hint={summaries.length ? "Try another search or filter." : "Create a set, add a few terms, and start learning."} action={<Button variant="secondary" onClick={() => { if (!summaries.length) setOpen(true); else { setQuery(""); setFilter("all"); router.replace("/", { scroll: false }); } }}>{summaries.length ? "Clear filters" : "Create a set"}</Button>} />}
    </section>
    <CreateSetSheet open={open} onClose={() => setOpen(false)} />
  </div>;
}

export default function DecksPage() {
  return <Suspense fallback={<LibraryLoading />}><Library /></Suspense>;
}
