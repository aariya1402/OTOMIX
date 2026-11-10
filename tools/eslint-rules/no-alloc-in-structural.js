/**
 * @fileoverview ESLint rule: no-alloc-in-structural
 * Flags array/object/typed-array allocations in files tagged @structural.
 */

'use strict';

const TYPED_ARRAYS = new Set([
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array',
]);

function isStructuralFile(sourceCode) {
  const comments = sourceCode.getAllComments();
  return comments.some(c => c.value.includes('@structural'));
}

function isAllocationCallee(callee) {
  if (callee.type === 'Identifier') {
    const name = callee.name;
    if (name === 'Array' || name === 'Object') return true;
    if (TYPED_ARRAYS.has(name)) return true;
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow array/object/typed-array allocations in @structural files',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      arrayAlloc: 'Array allocation forbidden in @structural file',
      objectAlloc: 'Object allocation forbidden in @structural file',
      typedArrayAlloc: 'TypedArray allocation forbidden in @structural file',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    if (!isStructuralFile(sourceCode)) {
      return {};
    }

    return {
      ArrayExpression(node) {
        context.report({ node, messageId: 'arrayAlloc' });
      },
      ObjectExpression(node) {
        context.report({ node, messageId: 'objectAlloc' });
      },
      NewExpression(node) {
        if (isAllocationCallee(node.callee)) {
          const name = node.callee.name;
          const msgId = TYPED_ARRAYS.has(name) ? 'typedArrayAlloc' :
                        name === 'Object' ? 'objectAlloc' : 'arrayAlloc';
          context.report({ node, messageId: msgId });
        }
      },
    };
  },
};