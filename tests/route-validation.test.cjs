// Run: node --test tests/route-validation.test.cjs
// Route-level validation for GET /api/translate (missing/oversized ?word=).
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

const { GET } = load('app/api/translate/route.ts');

test('route rejects missing and oversized ?word= with 400', async () => {
  const missing = await GET({ nextUrl: new URL('http://localhost/api/translate'), headers: new Headers() });
  assert.equal(missing.status, 400);
  const long = await GET({ nextUrl: new URL(`http://localhost/api/translate?word=${'a'.repeat(101)}`), headers: new Headers() });
  assert.equal(long.status, 400);
});
