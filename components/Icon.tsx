import type { CSSProperties } from "react";

export type IconName = "library" | "cards" | "quiz" | "plus" | "search" | "arrow" | "grid" | "list" | "trash" | "match" | "check" | "shuffle" | "swap" | "clock" | "refresh" | "close" | "book" | "sparkles" | "pencil" | "layers";
export const glyphClasses: Record<IconName, string> = {
  library: "fi-rr-books",
  cards: "fi-rr-playing-cards",
  quiz: "fi-rr-clipboard-list-check",
  match: "fi-rr-puzzle",
  plus: "fi-rr-plus",
  search: "fi-rr-search",
  arrow: "fi-rr-arrow-right",
  grid: "fi-rr-apps",
  list: "fi-rr-list",
  trash: "fi-rr-trash",
  check: "fi-rr-check",
  shuffle: "fi-rr-shuffle",
  swap: "fi-rr-exchange",
  clock: "fi-rr-clock",
  refresh: "fi-rr-refresh",
  close: "fi-rr-cross-small",
  book: "fi-rr-book",
  sparkles: "fi-rr-sparkles",
  pencil: "fi-rr-pencil",
  layers: "fi-rr-layers",
};

/* Flaticon UIcons glyphs, vendored per public/icons/ATTRIBUTION.md. */
export function Icon({ name, width, height, className, style }: {
  name: IconName;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  const fontSize = (width ?? height) !== undefined ? `${width ?? height}px` : undefined;
  return (
    <span
      className={`fc-icon ${glyphClasses[name]}${className ? ` ${className}` : ""}`}
      style={{ fontSize, ...style }}
      aria-hidden="true"
    />
  );
}
