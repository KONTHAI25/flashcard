"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeCard, isBilingualCard, type Card } from "@/lib/types";
import { studyFace } from "@/lib/study-settings";
import { checkTypedAnswer } from "@/lib/typed-answer";
import { PairBadges } from "@/components/PairMeta";
import styles from "./StudyPrompt.module.css";

export function StudyPrompt({ card, revealed, swap = false, typing = false, onReveal, onReview }: {
  card: Card;
  revealed: boolean;
  swap?: boolean;
  /** Ask for a typed answer before revealing; a match suggests Know. */
  typing?: boolean;
  onReveal: () => void;
  onReview: (quality: number) => void;
}) {
  const prompt = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState("");
  // null until a typed answer is checked; a plain reveal leaves grading manual.
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => {
    if (revealed) return;
    (typing ? input.current : prompt.current)?.focus();
    // Focus follows the Type toggle while the answer is still hidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing]);
  useEffect(() => { if (result !== null) continueButton.current?.focus(); }, [result]);
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
  const answerName = bilingual ? `${face.answerLabel} answer` : "answer";

  function checkAnswer() {
    if (!typed.trim()) return;
    setResult(checkTypedAnswer(typed, answer));
    onReveal();
  }

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
        {!revealed && <span className={styles.reveal}>{typing ? "Don't know? Show answer" : "Show answer"}</span>}
      </button>
      {typing && !revealed && (
        <form className={styles.typeForm} onSubmit={event => { event.preventDefault(); checkAnswer(); }}>
          <input
            ref={input}
            value={typed}
            onChange={event => setTyped(event.target.value)}
            lang={bilingual && face.answerLabel === "Thai" ? "th" : "en"}
            placeholder={`Type the ${answerName}`}
            aria-label={`Type the ${answerName}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            className={styles.typeInput}
          />
          <button type="submit" disabled={!typed.trim()} className={styles.typeSubmit}>Check</button>
        </form>
      )}
      <div id="study-answer" aria-live="polite">
        {revealed && (
          <div ref={answerRef} className={styles.answer}>
            {result !== null && (
              <p className={`${styles.verdict} ${result ? styles.verdictRight : styles.verdictWrong}`}>
                {result ? "✓ Correct" : <>✗ Not quite · you typed <span className={styles.yourAnswer}>{typed.trim()}</span></>}
              </p>
            )}
            <p className={styles.answerLabel}>
              {bilingual ? `${face.answerLabel}${face.answerLabel === "Thai" ? " · คำแปล" : " · Answer"}` : "Answer"}
            </p>
            <p className={styles.answerText}>{answer}</p>
            {result !== null && (
              <button
                ref={continueButton}
                type="button"
                className={styles.continue}
                onClick={() => onReview(result ? 1 : 0)}
                onKeyDown={event => {
                  // 1/2 still override the suggested grade while Continue has focus.
                  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
                  if (event.key === "1" || event.key === "2") {
                    event.preventDefault();
                    onReview(event.key === "1" ? 0 : 1);
                  }
                }}
              >
                Continue · {result ? "Know" : "Still learning"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
