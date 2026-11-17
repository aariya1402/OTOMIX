import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator(() => '')({
  name: 'no-alloc-in-structural',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow allocations in @structural files' },
    schema: [],
    messages: { noAlloc: 'Allocation not allowed in @structural files' },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.getText();
    if (!text.includes('@structural')) return {};

    return {
      ArrayExpression(node: TSESTree.ArrayExpression) { context.report({ node, messageId: 'noAlloc' }); },
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type === 'Identifier' && ['Array', 'Float32Array', 'Object'].includes(node.callee.name)) {
          context.report({ node, messageId: 'noAlloc' });
        }
      }
    };
  }
});