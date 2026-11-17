import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../no-alloc-in-structural.ts';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-alloc-in-structural (P02-T02-S02-M01)', () => {
  it('fails on array/object/typed-array allocations inside @structural files', () => {
    ruleTester.run('no-alloc-in-structural', rule, {
      valid: [
        { code: '// @structural\nfunction calc(a: number, b: number) { return a + b * 2; }' },
        { code: 'function calc(a: number) { const arr = []; return arr; }' }
      ],
      invalid: [
        { code: '// @structural\nfunction calc() { return []; }', errors: [{ messageId: 'noAlloc' }] },
        { code: '// @structural\nfunction calc() { return new Array(); }', errors: [{ messageId: 'noAlloc' }] },
        { code: '// @structural\nfunction calc() { return new Float32Array(); }', errors: [{ messageId: 'noAlloc' }] }
      ],
    });
  });
});