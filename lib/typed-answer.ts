/**
 * Typed-answer checking for study sessions. Spelling is strict ("woter" is not
 * "water"); only formatting noise is forgiven: case, spacing, trailing
 * punctuation, curly apostrophes and invisible zero-width marks.
 */
function normalize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?。]+$/, "")
    .trim();
}

/** Bracketed usage notes such as "(formal)" are optional when typing. */
function withoutNotes(text: string): string {
  return text.replace(/\s*[(（][^)）]*[)）]/g, "");
}

/** Every accepted form: the whole answer, or any one listed meaning. */
export function acceptedAnswers(answer: string): string[] {
  const forms = [answer, ...answer.split(/[,;/，；]/)]
    .flatMap(form => [normalize(form), normalize(withoutNotes(form))])
    .filter(Boolean);
  return [...new Set(forms)];
}

export function checkTypedAnswer(input: string, answer: string): boolean {
  const typed = normalize(input);
  return typed !== "" && acceptedAnswers(answer).includes(typed);
}
