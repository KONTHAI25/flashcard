# Browser validation

Validated the production build on an isolated local server at `127.0.0.1:3101` with a separate headless Chromium session and synthetic browser storage. Existing user browser data was not accessed. The fixture in `browser-fixture.test.cjs` mocks translation responses in this QA origin only.

| Scenario | Result |
| --- | --- |
| Open a card with a custom meaning; change only its level and save | No automatic request occurred; the custom meaning and schedule were retained. |
| Translate one word, then change the front | The answer immediately cleared and Save was disabled until a current answer was available. |
| Replacement lookup fails | The old answer did not return; Save remained disabled. |
| Type a manual answer while a delayed lookup is pending | The delayed response did not overwrite the manual answer. |
| Edit a generic question | Front/Back labels were neutral; the existing answer remained unchanged, no automatic translation occurred, and no bilingual metadata was added. |
| No due cards: choose Practice all terms | The route opened with All terms selected and a playable card. |
| Future-due B1 cards plus a due B2 card; choose B1 in Continue learning | A B1 card remained playable instead of an empty round. |
| Change a card in a second tab while a form is open in the first | The list refreshed and the unsaved form text remained intact. |
| Choose No level on an existing pair | The persisted level was removed; answer and schedule remained intact. |
| Mobile editor at 390 × 844 | Body and dialog width both measured 390 px. Screenshot visually inspected; no horizontal overflow. |

Captured browser errors were empty. The automation CLI's coordinate clicks did not consistently dispatch to the application, so affected buttons were activated through DOM `click()` calls; this does not certify pointer hit-testing. One URL wait command timed out despite successful navigation; the route URL, selected mode and rendered playable card were checked directly afterward.

Screenshot: `mobile-editor.png`.

## Live dictionary smoke check

A separate, unmocked HTTP request to the local production route with `word=take off` returned HTTP 200. Candidate headwords remained `take off`, with Thai meanings including `ถอด` and `ปลด`. Raw summary is in `live-translation-check.json`. This was one normal lookup, not a load test or an exhaustive dictionary accuracy audit.

Distributed deployment limits, all browser engines, extended accessibility testing and production hosting configuration remain outside this local validation.
