import Link from "next/link";
import type { DeckSummary } from "@/lib/library";
import { Icon } from "./Icon";

export function SetCard({ summary, onDelete }: { summary: DeckSummary; onDelete: () => void }) {
  const { deck, total, due } = summary;
  const source = deck.id.startsWith("deck-oxford-") ? "Oxford collection" : deck.id === "deck-demo" ? "Starter set" : "Personal set";
  return <li className="set-card">
    <div className="set-card-heading">
      <Link href={`/deck/${deck.id}`} className="set-title"><h3>{deck.name}</h3></Link>
      <button type="button" onClick={onDelete} aria-label={`Delete ${deck.name}`} className="set-delete"><Icon name="trash" width="16" height="16" /></button>
    </div>
    <div className="set-metadata"><span className="term-count">{total} {total === 1 ? "term" : "terms"}</span>{due > 0 && <span className="due-count">{due} to review</span>}</div>
    <div className="set-card-bottom"><span className="set-source"><span aria-hidden="true">{deck.emoji}</span>{source}</span><Link href={due ? `/study/${deck.id}` : `/deck/${deck.id}`} className="set-study" aria-label={`${due ? "Study" : "Open"} ${deck.name}`}><span>{due ? "Study" : "Open"}</span><Icon name="arrow" width="17" height="17" /></Link></div>
  </li>;
}
