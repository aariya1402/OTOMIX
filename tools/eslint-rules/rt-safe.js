/**
 * @fileoverview ESLint rule: rt-safe
 * Bans `new`, array/object literals, `console.*`, and `await` in files tagged @rt-safe.
 */
'use strict';

function isRtSafeFile(sourceCode) {
  const comments = sourceCode.getAllComments();
  return comments.some(c => c.value.includes('@rt-safe'));
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban RT-unsafe constructs in @rt-safe files',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      noNew: '`new` expression is forbidden in @rt-safe files (Rule 23).',
      noArrayLiteral: 'Array literal is forbidden in @rt-safe files (Rule 23).',
      noObjectLiteral: 'Object literal is forbidden in @rt-safe files (Rule 23).',
      noConsole: '`console.*` is forbidden in @rt-safe files (Rule 23).',
      noAwait: '`await` is forbidden in @rt-safe files (Rule 23).',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    if (!isRtSafeFile(sourceCode)) {
      return {};
    }

    return {
      NewExpression(node) {
        context.report({ node, messageId: 'noNew' });
      },
      ArrayExpression(node) {
        context.report({ node, messageId: 'noArrayLiteral' });
      },
      ObjectExpression(node) {
        context.report({ node, messageId: 'noObjectLiteral' });
      },
      "CallExpression[callee.object.name='console']"(node) {
        context.report({ node, messageId: 'noConsole' });
      },
      AwaitExpression(node) {
        context.report({ node, messageId: 'noAwait' });
      },
    };
  },
};