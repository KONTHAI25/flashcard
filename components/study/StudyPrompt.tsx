"use client";

import { useEffect, useRef } from "react";
import { normalizeCard, isBilingualCard, type Card } from "@/lib/types";
import { studyFace } from "@/lib/study-settings";
import { PairBadges } from "@/components/PairMeta";
import styles from "./StudyPrompt.module.css";

export function StudyPrompt({ card, revealed, swap = false, onReveal, onReview }: {
  card: Card;
  revealed: boolean;
  swap?: boolean;
  onReveal: () => void;
  onReview: (quality: number) => void;
}) {
  const prompt = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { prompt.current?.focus(); }, []);
  // On short screens the sticky grade bar can cover the answer; bring it into view.
  useEffect(() => {
    if (!revealed) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    answerRef.current?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [revealed]);
  const normalized = normalizeCard(card);
  const face = studyFace(normalized, swap);
  const answer = face.answer;
  const bilingual = isBilingualCard(card);
  return (
    <div className={styles.card}>
      <button
        ref={prompt}
        type="button"
        aria-expanded={revealed}
        aria-controls="study-answer"
        onClick={onReveal}
        onKeyDown={event => {
          if (event.repeat && (event.key === " " || event.key === "Enter")) event.preventDefault();
          if (!revealed || event.repeat || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
          const quality = event.key === "1" || event.key === "ArrowLeft" ? 0
            : event.key === "2" || event.key === "ArrowRight" ? 1 : null;
          if (quality !== null) {
            event.preventDefault();
            onReview(quality);
          }
        }}
        className={styles.face}
      >
        <span className={styles.meta}>
          <span className={styles.direction}>
            {bilingual ? (
              <>
                {face.promptLabel}
                <span aria-hidden="true" className={styles.arrow}>→</span>
                {face.answerLabel}
              </>
            ) : "Question"}
          </span>
          <span className={styles.badges}>
            <PairBadges level={normalized.level} source={normalized.source} />
          </span>
        </span>
        <span className={styles.word} data-study-word>{face.prompt}</span>
        {!revealed && <span className={styles.reveal}>Show answer</span>}
      </button>
      <div id="study-answer" aria-live="polite">
        {revealed && (
          <div ref={answerRef} className={styles.answer}>
            <p className={styles.answerLabel}>
              {bilingual ? `${face.answerLabel}${face.answerLabel === "Thai" ? " · คำแปล" : " · Answer"}` : "Answer"}
            </p>
            <p className={styles.answerText}>{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
