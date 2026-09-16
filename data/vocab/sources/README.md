# C1/C2 source lists

These files are the committed headword targets used by
`scripts/build-c1c2-pairs.cjs`. They contain no Thai translations; generated
pairs live in `../part-07.ts`.

| File | Source | Notes |
| --- | --- | --- |
| `oxford-5000-c1-words.txt` | The Oxford 5000 by CEFR level, C1 section. © Oxford University Press. https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000 | Parenthetical sense notes are removed and duplicate headwords (e.g. counter, grave, strip) are listed once. |
| `octanove-c2-words.txt` | Octanove Vocabulary Profile C1/C2 v1.0, C2 section. © Octanove Labs / CEFR-J, licensed CC BY-SA 4.0. Distributed by Open Language Profiles: https://github.com/openlanguageprofiles/olp-en-cefrj | British/American slash variants are canonicalized to the first spelling. The upstream `porten` typo is corrected to `portent`. |
| `translation-overrides.json` | Project review | Reviewed Thai entries that replace dictionary/IPA stubs or low-quality machine fallbacks. Rows using these entries are tagged `source: "manual"` in `part-07.ts`. |

The C2-derived rows in `part-07.ts` are a derivative work of the Octanove
Vocabulary Profile and are therefore shared under CC BY-SA 4.0; attribution is
kept in the generated file header and in the project README.
