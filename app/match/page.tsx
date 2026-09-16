"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDecks, getCards } from "@/lib/store";
import { countMatchablePairs, MATCH_MIN_PAIRS } from "@/lib/match";
import { Badge } from "@/components/ui";
import { LoadError } from "@/components/LoadError";
import { Icon } from "@/components/Icon";

interface MatchDeckRow {
  id: string;
  name: string;
  emoji: string;
  pairs: number;
}

export default function MatchIndexPage() {
  const [decks, setDecks] = useState<MatchDeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    try {
      const cards = getCards();
      setDecks(getDecks().map(deck => ({
        id: deck.id,
        name: deck.name,
        emoji: deck.emoji,
        pairs: countMatchablePairs(cards.filter(card => card.deckId === deck.id)),
      })));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read saved sets.");
    } finally {
      setLoading(false);
    }
  }, [attempt]);

  if (error) return <LoadError message={error} onRetry={() => setAttempt(value => value + 1)} />;
  if (loading) return <p role="status">Loading match sets…</p>;

  const ready = decks.filter(row => row.pairs >= MATCH_MIN_PAIRS);
  const waiting = decks.filter(row => row.pairs < MATCH_MIN_PAIRS);

  return (
    <div className="match-index">
      <header className="match-index-head">
        <div className="match-index-art" aria-hidden="true"><Icon name="match" width="30" height="30" /></div>
        <div>
          <h1>Find the pair</h1>
          <p>Tap an English term, then tap its Thai meaning. Clear the board as fast as you can.</p>
        </div>
      </header>

      {decks.length === 0 ? (
        <div className="empty-panel">
          <h2>No sets yet</h2>
          <p>Create a set with at least two English–Thai pairs to play.</p>
          <Link href="/?new=1" className="match-cta">Create a set</Link>
        </div>
      ) : ready.length === 0 ? (
        <div className="empty-panel">
          <h2>No playable sets yet</h2>
          <p>Find the pair needs at least {MATCH_MIN_PAIRS} terms with different English prompts and Thai meanings.</p>
          <Link href="/study" className="match-cta">Go to flashcards</Link>
        </div>
      ) : (
        <ul className="match-deck-list">
          {ready.map(row => (
            <li key={row.id}>
              <Link href={`/match/${row.id}`} className="match-deck-row">
                <span className="match-deck-emoji" aria-hidden="true">{row.emoji}</span>
                <span className="match-deck-name">{row.name}</span>
                <Badge variant="due">{row.pairs} pairs</Badge>
                <Icon name="arrow" width="18" height="18" className="match-deck-arrow" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {waiting.length > 0 && ready.length > 0 && (
        <p className="match-index-note">
          {waiting.length} {waiting.length === 1 ? "set needs" : "sets need"} more distinct English–Thai pairs before Find the pair is available.
        </p>
      )}
    </div>
  );
}
