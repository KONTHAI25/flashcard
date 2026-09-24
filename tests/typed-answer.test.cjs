// Run: node --test tests/typed-answer.test.cjs (uses the existing TypeScript dependency).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

const { checkTypedAnswer, acceptedAnswers } = load('lib/typed-answer.ts');

test('spelling is strict: a typo is not correct', () => {
  assert.equal(checkTypedAnswer('water', 'water'), true);
  assert.equal(checkTypedAnswer('woter', 'water'), false);
  assert.equal(checkTypedAnswer('wate', 'water'), false);
  assert.equal(checkTypedAnswer('waterr', 'water'), false);
  assert.equal(checkTypedAnswer('ละทิ้ง', 'ละทิ้ง'), true);
  assert.equal(checkTypedAnswer('ละทิ่ง', 'ละทิ้ง'), false);
});

test('case, outer/inner spacing, trailing punctuation and invisible marks are ignored', () => {
  assert.equal(checkTypedAnswer('  Water ', 'water'), true);
  assert.equal(checkTypedAnswer('look   after', 'Look after'), true);
  assert.equal(checkTypedAnswer('water.', 'water'), true);
  assert.equal(checkTypedAnswer('don’t', "don't"), true);
  assert.equal(checkTypedAnswer('ละ​ทิ้ง', 'ละทิ้ง'), true);
});

test('blank input is never correct', () => {
  assert.equal(checkTypedAnswer('', 'water'), false);
  assert.equal(checkTypedAnswer('   ', 'water'), false);
});

test('any listed meaning is accepted, or the whole answer', () => {
  const answer = 'ถากถาง, ดูถูก, เหยียดหยาม';
  assert.equal(checkTypedAnswer('ดูถูก', answer), true);
  assert.equal(checkTypedAnswer('เหยียดหยาม', answer), true);
  assert.equal(checkTypedAnswer(answer, answer), true);
  assert.equal(checkTypedAnswer('ดูถูกก', answer), false);
  assert.equal(checkTypedAnswer('เลวร้ายมาก', 'ซึ่งก่อหายนะ; เลวร้ายมาก'), true);
  assert.equal(checkTypedAnswer('colour', 'color/colour'), true);
});

test('bracketed notes are optional', () => {
  assert.equal(checkTypedAnswer('คิดว่า', 'คิดว่า (คำเป็นทางการ)'), true);
  assert.equal(checkTypedAnswer('คิดว่า (คำเป็นทางการ)', 'คิดว่า (คำเป็นทางการ)'), true);
  assert.equal(checkTypedAnswer('คำเป็นทางการ', 'คิดว่า (คำเป็นทางการ)'), false);
});

test('acceptedAnswers lists normalized, unique forms', () => {
  assert.deepEqual(acceptedAnswers('Water'), ['water']);
  assert.deepEqual(acceptedAnswers('a, b; a'), ['a, b; a', 'a', 'b']);
  assert.deepEqual(acceptedAnswers('คิดว่า (ทางการ)'), ['คิดว่า (ทางการ)', 'คิดว่า']);
});
