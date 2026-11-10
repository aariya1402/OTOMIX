import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
// @ts-ignore
import rule from '../eslint-rules/no-alloc-in-structural';

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-alloc-in-structural', () => {
  it('runs all RuleTester cases', () => {
    tester.run('no-alloc-in-structural', rule, {
      valid: [
        {
          code: `// @structural\nexport function add(a, b) { return a + b; }`,
        },
        {
          code: `const arr = [1, 2, 3];`,
        },
      ],
      invalid: [
        {
          code: `// @structural\nconst x = [];`,
          errors: [{ messageId: 'arrayAlloc' }],
        },
        {
          code: `// @structural\nconst x = new Array(3);`,
          errors: [{ messageId: 'arrayAlloc' }],
        },
        {
          code: `// @structural\nconst x = new Float32Array(4);`,
          errors: [{ messageId: 'typedArrayAlloc' }],
        },
        {
          code: `// @structural\nconst o = {};`,
          errors: [{ messageId: 'objectAlloc' }],
        },
        {
          code: `// @structural\nconst o = new Object();`,
          errors: [{ messageId: 'objectAlloc' }],
        },
      ],
    });
    expect(true).toBe(true);
  });
});