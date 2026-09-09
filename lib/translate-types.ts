/** Shared EN-TH translation contracts (client + server). */

export interface TranslateCandidate {
  headword: string;
  pos: string | null;
  thai: string;
}

export interface TranslateResult {
  word_eng: string;
  word_thai: string;
  pos: string | null;
  source: "longdo";
  candidates: TranslateCandidate[];
}
