// Browser-only fixture for the isolated local QA server. Not production code.
(() => {
  if (location.hostname !== '127.0.0.1' || location.port !== '3101') return;
  if (!localStorage.getItem('review-fixture')) {
    const now = Date.now();
    const card = { deckId: 'qa', interval: 30, ease: 2.5, due: now + 86400000, streak: 3, createdAt: now - 10000 };
    localStorage.setItem('fc_storage', JSON.stringify({ version: 1,
      decks: [{ id: 'qa', name: 'Review QA', emoji: '📚', createdAt: now }],
      cards: [
        { ...card, id: 'custom', front: 'provide', back: 'CUSTOM MEANING', level: 'B1', source: 'manual', wordEng: 'provide', wordThai: 'CUSTOM MEANING' },
        { ...card, id: 'legacy', front: 'cat', back: 'แมว [A1]' },
        { ...card, id: 'generic', front: 'Capital of France?', back: 'Paris' },
        { ...card, id: 'other', front: 'dog', back: 'สุนัข', level: 'B2', source: 'oxford' },
      ] }));
    localStorage.setItem('review-fixture', '1');
  }
  const originalFetch = window.fetch.bind(window);
  window.__lookupCalls = [];
  window.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.pathname !== '/api/translate') return originalFetch(input, options);
    const word = url.searchParams.get('word');
    window.__lookupCalls.push(word);
    return new Promise(resolve => setTimeout(() => {
      const failed = word === 'unavailable';
      resolve(new Response(JSON.stringify({ word_eng: word,
        word_thai: failed ? word : 'Thai for ' + word, source: 'longdo', pos: 'v',
        candidates: failed ? [] : [{ headword: word, thai: 'Thai for ' + word, pos: 'v' }],
        ...(failed ? { error: 'Mock unavailable' } : {}),
      }), { status: failed ? 502 : 200, headers: { 'Content-Type': 'application/json' } }));
    }, word === 'provide' ? 1000 : 80));
  };
})();
