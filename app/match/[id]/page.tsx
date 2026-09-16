"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDeck, getCardsByDeck } from "@/lib/store";
import type { Card as CardType, Deck } from "@/lib/types";
import {
  MATCH_DEFAULT_PAIRS,
  MATCH_MIN_PAIRS,
  buildMatchBoard,
  countMatchablePairs,
  formatElapsed,
  initialMatchState,
  matchAccuracy,
  selectMatchTile,
  type MatchTile,
} from "@/lib/match";
import { Button } from "@/components/Button";
import { LoadError } from "@/components/LoadError";
import { ProgressBar } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MatchSession key={id} id={id} />;
}

function MatchSession({ id }: { id: string }) {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [board, setBoard] = useState<MatchTile[]>([]);
  const [state, setState] = useState(initialMatchState);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const cardsRef = useRef<CardType[]>([]);

  const startBoard = useCallback((cards: CardType[]) => {
    setBoard(buildMatchBoard(cards, MATCH_DEFAULT_PAIRS));
    setState(initialMatchState());
    const started = Date.now();
    setStartedAt(started);
    setNow(started);
    setFinishedAt(null);
  }, []);

  useEffect(() => {
    try {
      const loadedDeck = getDeck(id);
      if (!loadedDeck) {
        router.replace("/match");
        return;
      }
      const cards = getCardsByDeck(id);
      setDeck(loadedDeck);
      cardsRef.current = cards;
      startBoard(cards);
      setLoadError("");
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Could not read saved cards.");
    } finally {
      setLoading(false);
    }
  }, [id, router, startBoard, attempt]);

  useEffect(() => {
    if (state.kind === "complete" || loading) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [state.kind, loading]);

  useEffect(() => {
    if (state.kind === "complete" && finishedAt === null) setFinishedAt(Date.now());
  }, [state.kind, finishedAt]);

  useEffect(() => {
    if (state.kind !== "mismatch") return;
    const timer = setTimeout(() => {
      setState(previous => previous.kind === "mismatch" ? { ...previous, kind: "idle", mistakeIds: [] } : previous);
    }, 650);
    return () => clearTimeout(timer);
  }, [state.kind, state.mistakes]);

  const pairCount = useMemo(() => new Set(board.map(tile => tile.pairId)).size, [board]);
  const matched = state.matchedPairIds.length;
  const complete = state.kind === "complete" && pairCount > 0;
  const elapsedMs = Math.max(0, (finishedAt ?? now) - startedAt);
  const accuracy = matchAccuracy(pairCount, state.mistakes);
  const usablePairs = cardsRef.current.length ? countMatchablePairs(cardsRef.current) : 0;

  if (loadError) return <LoadError message={loadError} onRetry={() => { setLoading(true); setAttempt(value => value + 1); }} />;
  if (loading) return <p role="status" className="match-loading">Shuffling the board…</p>;
  if (!deck) return null;

  if (usablePairs < MATCH_MIN_PAIRS) {
    return (
      <div className="match-empty">
        <div className="match-summary-icon" aria-hidden="true"><span className="noun-art noun-art-puzzle" /></div>
        <h1>Not enough pairs</h1>
        <p>Find the pair needs at least {MATCH_MIN_PAIRS} terms with different English prompts and Thai meanings. Add or edit terms in this set first.</p>
        <div className="match-actions">
          <Button onClick={() => router.push(`/deck/${id}`)}>Back to set</Button>
          <Button variant="secondary" onClick={() => router.push("/match")}>Choose another set</Button>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="match-summary">
        <div className="match-summary-ring" role="status" aria-label={`Board cleared with ${accuracy}% accuracy`}>
          <span>{accuracy}%</span>
          <small>accuracy</small>
        </div>
        <h1>Nice work!</h1>
        <p>You matched all {pairCount} pairs in {deck.name}.</p>
        <dl className="match-summary-stats">
          <div><dt>Time</dt><dd>{formatElapsed(elapsedMs)}</dd></div>
          <div><dt>Wrong tries</dt><dd>{state.mistakes}</dd></div>
          <div><dt>Pairs</dt><dd>{pairCount}</dd></div>
        </dl>
        <div className="match-actions">
          <Button onClick={() => startBoard(cardsRef.current)}><Icon name="refresh" width="18" height="18" /> Play again</Button>
          <Button variant="secondary" onClick={() => router.push(`/study/${id}`)}>Study flashcards</Button>
          <Button variant="secondary" onClick={() => router.push(`/deck/${id}`)}>Back to set</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-page">
      <header className="match-top">
        <Link href={`/deck/${id}`} aria-label="Back to set" className="match-back">
          <Icon name="close" width="18" height="18" />
        </Link>
        <h1>{deck.name}</h1>
        <div className="match-top-stats">
          <span><Icon name="match" width="15" height="15" /> {matched}/{pairCount}</span>
          <span><Icon name="clock" width="15" height="15" /> {formatElapsed(elapsedMs)}</span>
        </div>
      </header>

      <ProgressBar value={pairCount ? (matched / pairCount) * 100 : 0} className="match-progress" />

      <p className="match-hint" id="match-instructions">
        Tap an English term, then tap its Thai meaning. Wrong pairs turn red.
      </p>

      <p className="sr-only" aria-live="polite">
        {state.kind === "pair"
          ? "Pair matched"
          : state.kind === "mismatch"
            ? "Not a pair. Try again"
            : `${matched} of ${pairCount} pairs matched`}
      </p>

      <div className="match-grid" role="group" aria-labelledby="match-instructions">
        {board.map(tile => {
          const isMatched = state.matchedPairIds.includes(tile.pairId);
          const isSelected = state.selectedIds.includes(tile.id);
          const isMistake = state.mistakeIds.includes(tile.id);
          const label = `${tile.side === "en" ? "English" : "Thai"}: ${tile.text}`;
          return (
            <button
              key={tile.id}
              type="button"
              className={`match-tile match-tile-${tile.side}${isSelected ? " is-selected" : ""}${isMatched ? " is-matched" : ""}${isMistake ? " is-mistake" : ""}`}
              disabled={isMatched}
              aria-pressed={isSelected}
              aria-label={`${label}${isMatched ? ", matched" : ""}`}
              onClick={() => setState(previous => selectMatchTile(previous, tile.id, board))}
            >
              <span className="match-tile-lang" aria-hidden="true">{tile.side === "en" ? "EN" : "TH"}</span>
              <span className="match-tile-text">{tile.text}</span>
              {isMatched && <Icon name="check" width="18" height="18" className="match-tile-check" />}
            </button>
          );
        })}
      </div>

      <div className="match-footer">
        <p>Wrong tries: <strong>{state.mistakes}</strong></p>
        <button type="button" className="match-restart" onClick={() => startBoard(cardsRef.current)}>
          <Icon name="refresh" width="16" height="16" /> Shuffle again
        </button>
      </div>
    </div>
  );
}
