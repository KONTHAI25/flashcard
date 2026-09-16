// Run: node --test tests/ui-icons.test.cjs
// Icon wiring: every Icon name maps to a vendored UIcons glyph class, every
// referenced Noun Project mask resolves to a committed PNG, and the font is
// vendored. Guards against typos that would render invisible icons.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = new Map();

function load(relative) {
  const filename = path.resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  function localRequire(name) {
    const base = name.startsWith('@/')
      ? path.join(root, name.slice(2))
      : path.resolve(path.dirname(filename), name);
    const target = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]
      .find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!target) return require(name);
    return load(path.relative(root, target));
  }
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

function sourceFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { recursive: true })
    .filter(file => file.endsWith('.tsx'))
    .map(file => fs.readFileSync(path.join(root, dir, file), 'utf8'));
}

function cssGlyphClasses() {
  const classes = new Set();
  for (const match of css.matchAll(/\.(fi-rr-[a-z0-9-]+)::before/g)) classes.add(match[1]);
  return classes;
}

test('every Icon name maps to a UIcons glyph class vendored in globals.css', () => {
  const { glyphClasses } = load('components/Icon.tsx');
  const vendored = cssGlyphClasses();
  assert.ok(Object.keys(glyphClasses).length >= 20, 'the glyph map lost entries');
  for (const [name, glyph] of Object.entries(glyphClasses)) {
    assert.match(glyph, /^fi-rr-/, `${name} must point at a fi-rr- glyph class`);
    assert.ok(vendored.has(glyph), `${name} → ${glyph} has no content rule in globals.css`);
  }
  for (const name of ['library', 'cards', 'quiz', 'plus', 'search', 'arrow', 'grid', 'list', 'trash', 'match', 'check', 'shuffle', 'swap', 'clock', 'refresh', 'close']) {
    assert.ok(name in glyphClasses, `${name} must stay mapped`);
  }
});

test('every Icon name referenced in source has a glyph mapping', () => {
  const { glyphClasses } = load('components/Icon.tsx');
  const used = new Set();
  for (const text of [...sourceFiles('app'), ...sourceFiles('components')]) {
    for (const match of text.matchAll(/<Icon name="([a-z]+)"/g)) used.add(match[1]);
    for (const match of text.matchAll(/icon: "([a-z]+)"/g)) used.add(match[1]);
  }
  assert.ok(used.size >= 10, `expected a healthy icon usage set, got ${used.size}`);
  const missing = [...used].filter(name => !(name in glyphClasses));
  assert.deepEqual(missing, [], `Icon names without a glyph mapping: ${missing.join(', ')}`);
});

test('SetCard picks the source-badge icon from the deck source', () => {
  const text = fs.readFileSync(path.join(root, 'components/SetCard.tsx'), 'utf8');
  assert.match(text, /startsWith\("deck-oxford-"\) \? "book"/, 'Oxford sets must show the book glyph');
  assert.match(text, /"deck-demo" \? "sparkles" : "pencil"/, 'demo sets show sparkles, personal sets show pencil');
  assert.match(text, /name=\{sourceIcon\}/, 'the badge must render the mapped icon, not the deck emoji');
});

test('every noun-art mask used in source resolves to a committed PNG', () => {
  const artClasses = new Set();
  for (const text of [...sourceFiles('app'), ...sourceFiles('components')]) {
    for (const match of text.matchAll(/noun-art-([a-z]+)/g)) artClasses.add(match[1]);
  }
  assert.ok(artClasses.size >= 5, 'the study-mode art tiles lost entries');
  for (const artClass of artClasses) {
    const rule = css.match(new RegExp(`\\.noun-art-${artClass}\\s*\\{[^}]*mask-image:\\s*url\\("([^"]+)"\\)`));
    assert.ok(rule, `.noun-art-${artClass} has no mask rule in globals.css`);
    const file = path.join(root, 'public', rule[1]);
    assert.ok(fs.existsSync(file), `masked asset missing: ${file}`);
    assert.ok(fs.statSync(file).size > 1000, `masked asset is empty or truncated: ${file}`);
  }
});

test('the UIcons web font is vendored and declared with a local URL', () => {
  const face = css.match(/@font-face\s*\{[^}]*uicons-regular-rounded[^}]*\}/s);
  assert.ok(face, 'globals.css must declare the uicons-regular-rounded font face');
  assert.match(face[0], /url\("\/fonts\/uicons\/uicons-regular-rounded\.woff2"\)/, 'the font must be self-hosted, not CDN-linked');
  const font = fs.statSync(path.join(root, 'public/fonts/uicons/uicons-regular-rounded.woff2'));
  assert.ok(font.size > 100000, `vendored font looks truncated: ${font.size} bytes`);
});
