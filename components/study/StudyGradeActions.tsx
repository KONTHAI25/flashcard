import styles from "./StudyGradeActions.module.css";

function StillLearningIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function KnowIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function StudyGradeActions({ revealed, onReview }: {
  revealed: boolean;
  onReview: (quality: number) => void;
}) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        disabled={!revealed}
        onClick={() => onReview(0)}
        className={`${styles.action} ${styles.stillLearning}`}
        aria-label="Still learning (press 1)"
      >
        <StillLearningIcon />
        <span className={styles.label}>Still learning</span>
        <kbd className={styles.shortcut}>1</kbd>
      </button>
      <button
        type="button"
        disabled={!revealed}
        onClick={() => onReview(1)}
        className={`${styles.action} ${styles.know}`}
        aria-label="Know (press 2)"
      >
        <KnowIcon />
        <span className={styles.label}>Know</span>
        <kbd className={styles.shortcut}>2</kbd>
      </button>
    </div>
  );
}
