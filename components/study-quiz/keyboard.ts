/** Keep shortcuts out of native controls, editing, dialogs and key repeats. */
export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.repeat || event.isComposing ||
      event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return true;
  const target = event.target as HTMLElement | null;
  return Boolean(target?.isContentEditable || target?.closest?.(
    'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="slider"], [role="menu"], [role="radio"]'
  ));
}

/** A held Enter/Space auto-repeats clicks on buttons; callers preventDefault on it. */
export function isRepeatActivation(event: Pick<KeyboardEvent, "repeat" | "key">): boolean {
  return event.repeat && (event.key === "Enter" || event.key === " ");
}
