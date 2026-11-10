const { Linter } = require('eslint');
const parser = require('@typescript-eslint/parser');
const fs = require('fs');
const path = require('path');
const rule = require('./no-alloc-in-structural');

const linter = new Linter();
linter.defineParser('@typescript-eslint/parser', parser);
linter.defineRule('no-alloc-in-structural', rule);

const files = [
  path.join(__dirname, '../../packages/core/src/timing/structure.ts'),
  path.join(__dirname, '../../packages/core/src/timing/quantum.ts'),
];

let totalViolations = 0;
for (const f of files) {
  const code = fs.readFileSync(f, 'utf-8');
  const messages = linter.verify(code, {
    parser: '@typescript-eslint/parser',
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { 'no-alloc-in-structural': 'error' },
  }, { filename: f });
  console.log(f, ':', messages.length, 'violations');
  if (messages.length > 0) {
      messages.forEach(m => console.log(`  Line ${m.line}: ${m.message}`));
  }
  totalViolations += messages.length;
}

process.exit(totalViolations > 0 ? 1 : 0);