import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule = require('../rt-safe');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

describe('rt-safe eslint rule', () => {
  it('should pass valid code and fail invalid code', () => {
    ruleTester.run('rt-safe', rule, {
      valid: [
        {
          code: `
            // @rt-safe
            const x = 1;
            function process() { return x; }
          `,
        },
        {
          code: `
            // no tag here
            const arr = [];
            const obj = {};
            const fn = new Function();
            console.log("hello");
          `,
        },
      ],
      invalid: [
        {
          code: `
            // @rt-safe
            const arr = []; // error
            const obj = {}; // error
            const dt = new Date(); // error
          `,
          errors: 3,
        },
        {
          code: `
            // @rt-safe
            console.log("bad"); // error
            async function foo() { await bar(); } // error
          `,
          errors: 2,
        },
      ],
    });
  });
});