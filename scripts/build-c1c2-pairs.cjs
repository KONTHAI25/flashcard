#!/usr/bin/env node
/**
 * Build-time data tool for the completed C1/C2 EN–TH dataset.
 *
 * Sources:
 *  - data/vocab/sources/oxford-5000-c1-words.txt
 *    Headwords from The Oxford 5000 by CEFR level (C1 section), Oxford
 *    University Press, https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000
 *  - data/vocab/sources/octanove-c2-words.txt
 *    C2 headwords from the Octanove Vocabulary Profile C1/C2 v1.0
 *    (CC BY-SA 4.0, Octanove Labs / CEFR-J), distributed by Open Language Profiles.
 *
 * Thai meanings come from Longdo (NECTEC Lexitron EN–TH) with MyMemory as a
 * fallback. Responses are cached in /tmp/flashcard-c1c2-cache.json so a failed
 * or interrupted run can resume without re-fetching.
 *
 * Usage:
 *   node scripts/build-c1c2-pairs.cjs --limit 20 --no-write   # dry run
 *   node scripts/build-c1c2-pairs.cjs --write                # regenerate data files
 */
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const CACHE_PATH = '/tmp/flashcard-c1c2-cache.json';
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const WRITE = args.includes('--write');
const CONCURRENCY = 3;

const norm = value => value.normalize('NFKC').trim().toLowerCase();

function loadTsArray(relativePath, exportName) {
  const filename = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    throw new Error(`Unexpected import ${name} in ${relativePath}`);
  }, module, module.exports);
  return module.exports[exportName];
}

function loadTranslateParser() {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, 'lib/translate-server.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    throw new Error(`Unexpected import ${name} in translate-server.ts`);
  }, module, module.exports);
  return module.exports;
}

const { parseLongdoHtml, containsThaiScript, LONGDO_USER_AGENT } = loadTranslateParser();

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

const MANUAL_OVERRIDES = readJson('data/vocab/sources/translation-overrides.json');

function readWordList(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(word => word.toLowerCase());
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try { return JSON.parse(readFileSync(CACHE_PATH, 'utf8')); } catch { return {}; }
}
function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
}

function sanitizeThai(text) {
  // Drop symbol notes such as "(สัญลักษณ์ย่อ gal.)" but keep real parentheses.
  return text
    .replace(/\s*\([^)]*[A-Za-z][^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAcceptableThai(text, word) {
  if (typeof text !== 'string') return false;
  if (!containsThaiScript(text)) return false;
  if (text.trim() === word.trim()) return false;
  if (/[A-Za-z]/.test(text)) return false; // IPA/reading stubs and leftover Latin
  if (text.includes('/')) return false; // phonetic notation
  if (/แปลว่า/.test(text)) return false; // parser caught a dictionary tag, not a meaning
  if (/\((?:sl|สแลง)\)/i.test(text)) return false; // slang sense
  return text.trim().length >= 2;
}

function chooseThai(candidates, word) {
  const cleaned = candidates
    .map(candidate => ({ ...candidate, thai: sanitizeThai(candidate.thai) }))
    .filter(candidate => isAcceptableThai(candidate.thai, word))
    .filter(candidate => !/[<>{}[\]]/.test(candidate.thai));
  if (cleaned.length === 0) return null;
  const exact = cleaned.filter(candidate => norm(candidate.headword) === norm(word));
  const pool = exact.length ? exact : cleaned;
  const short = pool.filter(candidate => candidate.thai.length <= 80);
  const chosen = (short.length ? short : pool)
    .sort((a, b) => a.thai.length - b.thai.length)[0];
  return chosen ? chosen.thai : null;
}

/** Try the word and common base forms for derived adverbs/nouns/verbs. */
function lookupQueries(word) {
  const queries = [word];
  const base = word.toLowerCase();
  if (base.endsWith('ically')) queries.push(`${base.slice(0, -6)}ic`);
  if (base.endsWith('ingly')) queries.push(base.slice(0, -2));
  else if (base.endsWith('ly')) queries.push(base.slice(0, -2));
  if (base.endsWith('ization')) queries.push(`${base.slice(0, -4)}e`);
  if (base.endsWith('isation')) queries.push(`${base.slice(0, -4)}e`);
  if (base.endsWith('ized')) queries.push(`${base.slice(0, -2)}e`);
  if (base.endsWith('ised')) queries.push(`${base.slice(0, -2)}e`);
  if (base.endsWith('ness')) queries.push(base.slice(0, -4));
  return [...new Set(queries.filter(Boolean))];
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function lookupLongdo(word) {
  try {
    const response = await fetchWithTimeout(`${'https://dict.longdo.com/mobile.php'}?search=${encodeURIComponent(word)}`, {
      headers: {
        'User-Agent': LONGDO_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return chooseThai(parseLongdoHtml(html, word, 8), word);
  } catch {
    return null;
  }
}

async function lookupMyMemory(word) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|th`;
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 9000);
    if (!response.ok) return null;
    const payload = await response.json();
    const text = payload?.responseData?.translatedText;
    const cleaned = typeof text === 'string' ? sanitizeThai(text) : '';
    if (!isAcceptableThai(cleaned, word)) return null;
    if (/[<>{}[\]]/.test(cleaned)) return null;
    return cleaned;
  } catch {
    return null;
  }
}

async function lookupAuto(word) {
  for (const query of lookupQueries(word)) {
    const thai = await lookupLongdo(query);
    if (thai) return { th: thai, source: 'longdo' };
  }
  for (const query of lookupQueries(word)) {
    const thai = await lookupMyMemory(query);
    if (thai) return { th: thai, source: 'mymemory' };
  }
  return null;
}

async function lookup(word, cache) {
  // Reviewed overrides always win, then a cached result that still passes the
  // quality gate; phonetics and parser stubs from earlier runs are refetched.
  const override = MANUAL_OVERRIDES[word];
  if (override) {
    const result = { th: override.th, source: override.source === 'manual' ? 'manual' : override.source };
    cache[word] = result;
    return result;
  }
  if (cache[word] && isAcceptableThai(cache[word].th, word)) return cache[word];
  const result = await lookupAuto(word);
  cache[word] = result;
  return result;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function formatRow(en, th, level, source) {
  const quote = value => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `  ["${quote(en)}", "${quote(th)}", "${level}"${source ? `, "${source}"` : ''}],`;
}

function formatPart(header, rows) {
  return `${header}\n${rows.join('\n')}\n];\n`;
}

async function main() {
  const legacy = loadTsArray('data/vocab/part-07.ts', 'VOCAB_07');
  const legacyPairs = legacy
    .filter(([, , level]) => level === 'C1' || level === 'C2')
    .map(row => [row[0], row[1], row[2], row[3]]);
  // Corrections live in part-08 after the first complete run; on the very first
  // run they are still the B1/B2 rows left in part-07.
  let legacyCorrections = legacy
    .filter(([, , level]) => level === 'B1' || level === 'B2')
    .map(row => [row[0], row[1], row[2]]);
  if (legacyCorrections.length === 0) {
    try { legacyCorrections = loadTsArray('data/vocab/part-08.ts', 'VOCAB_08'); } catch { legacyCorrections = []; }
  }
  const correctionsByWord = new Map(legacyCorrections.map(row => [norm(row[0]), row]));

  const appWords = new Set();
  for (const name of ['01', '02', '03', '04', '05', '06']) {
    for (const [en] of loadTsArray(`data/vocab/part-${name}.ts`, `VOCAB_${name}`)) appWords.add(norm(en));
  }
  for (const [en] of legacyPairs) appWords.add(norm(en));
  for (const [en] of legacyCorrections) appWords.add(norm(en));

  const c1Targets = readWordList('data/vocab/sources/oxford-5000-c1-words.txt');
  const c2Targets = readWordList('data/vocab/sources/octanove-c2-words.txt');
  const c1Add = c1Targets.filter(word => !appWords.has(word));
  const c1AddSet = new Set(c1Add);
  const c2Add = c2Targets.filter(word => !appWords.has(word) && !c1AddSet.has(word));
  const work = [...c1Add.map(word => ({ word, level: 'C1' })), ...c2Add.map(word => ({ word, level: 'C2' }))];

  console.log(JSON.stringify({
    legacyPairs: legacyPairs.length,
    legacyCorrections: legacyCorrections.length,
    c1Targets: c1Targets.length,
    c2Targets: c2Targets.length,
    c1Add: c1Add.length,
    c2Add: c2Add.length,
    work: work.length,
    limit: Number.isFinite(LIMIT) ? LIMIT : null,
  }, null, 2));

  const cache = loadCache();
  const queue = work.slice(0, Number.isFinite(LIMIT) ? LIMIT : work.length);
  let done = 0;
  let translatedLongdo = 0;
  let translatedMyMemory = 0;
  let failed = 0;
  const rows = await mapWithConcurrency(queue, CONCURRENCY, async ({ word, level }) => {
    const result = await lookup(word, cache);
    done++;
    if (result) {
      if (result.source === 'longdo') translatedLongdo++; else translatedMyMemory++;
    } else {
      failed++;
      console.error(`MISS ${word}`);
    }
    if (done % 25 === 0) {
      saveCache(cache);
      console.log(`progress ${done}/${queue.length} (${translatedLongdo} longdo, ${translatedMyMemory} mymemory, ${failed} failed)`);
    }
    const cardSource = result ? (result.source === 'longdo' ? 'longdo' : 'manual') : null;
    return result ? [word, result.th, level, cardSource] : null;
  });
  saveCache(cache);

  const misses = queue.filter((_, index) => !rows[index]).map(item => item.word);
  console.log(JSON.stringify({ done, translatedLongdo, translatedMyMemory, failed, misses: misses.slice(0, 50), missCount: misses.length }, null, 2));

  if (!WRITE) {
    console.log('dry run: no files written');
    return;
  }
  if (misses.length) {
    console.error(`refusing to write: ${misses.length} words still lack a Thai meaning`);
    process.exitCode = 1;
    return;
  }

  // Final part-07: curated legacy rows plus the completed source lists, sorted
  // by level then alphabetically so chunked decks read in a stable order.
  const dedupe = new Map();
  for (const row of legacyPairs) dedupe.set(norm(row[0]), { en: row[0], th: row[1], level: row[2], source: row[3] });
  const additions = queue.map(({ word, level }) => {
    const result = cache[word];
    return { en: word, th: result.th, level, source: result.source === 'longdo' ? 'longdo' : 'manual' };
  });
  for (const row of additions) {
    if (!dedupe.has(norm(row.en))) dedupe.set(norm(row.en), row);
  }
  const finalRows = [...dedupe.values()]
    .sort((a, b) => (a.level === b.level ? a.en.localeCompare(b.en) : a.level.localeCompare(b.level)));
  const c1Count = finalRows.filter(row => row.level === 'C1').length;
  const c2Count = finalRows.filter(row => row.level === 'C2').length;

  const header = [
    '// Completed C1/C2 English–Thai dataset.',
    '// C1 headwords: The Oxford 5000 by CEFR level (Oxford University Press).',
    '// C2 headwords: Octanove Vocabulary Profile C1/C2 v1.0 (CC BY-SA 4.0,',
    '//   Octanove Labs / CEFR-J; distributed by Open Language Profiles).',
    '// Thai meanings: Longdo (NECTEC Lexitron EN–TH) with MyMemory fallback.',
    '// Regenerate with: node scripts/build-c1c2-pairs.cjs --write',
    `// ${c1Count} C1 rows · ${c2Count} C2 rows.`,
    'export const VOCAB_07: Array<[string, string, string, string?]> = [',
  ].join('\n');
  writeFileSync(path.join(root, 'data/vocab/part-07.ts'), formatPart(header, finalRows.map(row => formatRow(row.en, row.th, row.level, row.source))), 'utf8');

  const corrections = [...correctionsByWord.values()].sort((a, b) => a[0].localeCompare(b[0]));
  const correctionHeader = [
    '// Verified B1/B2 level corrections discovered while completing C1/C2.',
    '// These rows were previously in part-07 with the wrong level; level source:',
    '// The Oxford 5000 by CEFR level (Oxford University Press).',
    'export const VOCAB_08: Array<[string, string, string]> = [',
  ].join('\n');
  writeFileSync(path.join(root, 'data/vocab/part-08.ts'), formatPart(correctionHeader, corrections.map(row => formatRow(row[0], row[1], row[2]))), 'utf8');

  console.log(JSON.stringify({ wrote: true, rows: finalRows.length, c1Count, c2Count, corrections: corrections.length }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
