"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { FlashCard } from "@/components/FlashCard";
import { normalizeCard, getDisplayBack, isBilingualCard, type Card } from "@/lib/types";
import styles from "@/app/deck/[id]/deck.module.css";

export function DeckPreview({ cards }: { cards: Card[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const restoreCardFocus = useRef(false);
  const selectedIndex = cards.findIndex((card) => card.id === selectedId);
  const index = selectedIndex < 0 ? 0 : selectedIndex;
  const raw = cards[index];
  const card = raw ? normalizeCard(raw) : undefined;

  useLayoutEffect(() => {
    if (restoreCardFocus.current) {
      stageRef.current?.querySelector("button")?.focus({ preventScroll: true });
      restoreCardFocus.current = false;
    }
  }, [card?.id]);

  if (!card) return null;

  function move(direction: number) {
    const next = cards[Math.max(0, Math.min(cards.length - 1, index + direction))];
    if (next) setSelectedId(next.id);
  }

  return (
    <section
      className={styles.preview}
      aria-label="Flashcard preview"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          restoreCardFocus.current = stageRef.current?.contains(event.target as Node) ?? false;
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className={styles.previewHeading}>
        <h2>Preview this set</h2>
        <span>{raw && isBilingualCard(raw) ? "English → Thai · " : ""}Explore at your own pace</span>
      </div>
      <div ref={stageRef} className={styles.cardStage}>
        <FlashCard
          key={card.id}
          front={card.front}
          back={getDisplayBack(card)}
          level={card.level}
          source={card.source}
          bilingual={isBilingualCard(raw)}
        />
      </div>
      <div className={styles.previewControls}>
        <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label="Previous card">
          <span aria-hidden="true">←</span>
        </button>
        <p role="status" aria-live="polite" aria-atomic="true">{index + 1} <span>/ {cards.length}</span></p>
        <button type="button" onClick={() => move(1)} disabled={index === cards.length - 1} aria-label="Next card">
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className={styles.previewHint}>Use ← → to browse while focused here. Focus the card and press Space or Enter to flip.</p>
    </section>
  );
}
