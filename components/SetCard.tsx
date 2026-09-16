import Link from "next/link";
import { summaryRemaining, type DeckSummary } from "@/lib/library";
import { Icon } from "./Icon";

const ACCENTS = ["#eef0ff", "#e6f7f0", "#fff1de", "#e8f4ff", "#fdeef5", "#f1ecff"];

function accentFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

export function SetCard({ summary, onDelete }: { summary: DeckSummary; onDelete: () => void }) {
  const { deck, total, due } = summary;
  const remaining = summaryRemaining(summary);
  const remainPct = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
  const source = deck.id.startsWith("deck-oxford-") ? "Oxford collection" : deck.id === "deck-demo" ? "Starter set" : "Personal set";
  const sourceIcon = deck.id.startsWith("deck-oxford-") ? "book" : deck.id === "deck-demo" ? "sparkles" : "pencil";
  return <li className="set-card">
    <div className="set-cover" style={{ backgroundColor: accentFor(deck.id) }} aria-hidden="true">
      <span className="set-cover-emoji">{deck.emoji}</span>
      <span className="set-cover-count">{total} {total === 1 ? "term" : "terms"}</span>
    </div>
    <div className="set-card-body">
      <div className="set-card-heading">
        <Link href={`/deck/${deck.id}`} className="set-title"><h3>{deck.name}</h3></Link>
        <button type="button" onClick={onDelete} aria-label={`Delete ${deck.name}`} className="set-delete"><Icon name="trash" width="16" height="16" /></button>
      </div>
      <div className="set-metadata">
        <span className="term-count"><Icon name="layers" width="12" height="12" />{total} {total === 1 ? "term" : "terms"}</span>
        {due > 0 && <span className="due-count"><Icon name="clock" width="12" height="12" />{due} to review</span>}
      </div>
      {remaining > 0 && (
        <Link href={`/study/${deck.id}?mode=learning`} className="set-remain" aria-label={`Remain ${remaining}/${total} still learning · play again`}>
          <span className="set-remain-track" aria-hidden="true">
            <span className="set-remain-fill" style={{ width: `${remainPct}%` }} />
          </span>
          <span className="set-remain-label">Remain {remaining}/{total}</span>
        </Link>
      )}
      <div className="set-card-bottom">
        <span className="set-source"><span aria-hidden="true"><Icon name={sourceIcon} width="13" height="13" /></span>{source}</span>
        <Link href={total > 0 ? `/study/${deck.id}` : `/deck/${deck.id}`} className="set-study" aria-label={`${total > 0 ? "Study" : "Open"} ${deck.name}`}>
          <span>{total > 0 ? "Study" : "Open"}</span><Icon name="arrow" width="17" height="17" />
        </Link>
      </div>
    </div>
  </li>;
}
