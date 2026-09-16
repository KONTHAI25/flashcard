import type { SVGProps } from "react";

export type IconName = "library" | "cards" | "quiz" | "plus" | "search" | "arrow" | "grid" | "list" | "trash" | "match" | "check" | "shuffle" | "swap" | "clock" | "refresh" | "close";
const paths: Record<IconName, string> = {
  library: "M4 4h4v16H4zM11 4h4v16h-4zM18 4l3 15",
  cards: "M7 7h14v14H7zM3 17V3h14",
  quiz: "M8 4H5v17h14V4h-3M9 3h6v4H9zM9 12h6M9 16h4",
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  arrow: "M5 12h14M13 6l6 6-6 6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  match: "M4 4h6v6H4zM14 14h6v6h-6zM10 7h4M7 10v4",
  check: "M4 12.5l5 5L20 6.5",
  shuffle: "M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  swap: "M7 16H3m0 0 4-4m-4 4 4 4M17 8h4m0 0-4-4m4 4-4 4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  refresh: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6",
  close: "M6 6l12 12M18 6 6 18",
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
