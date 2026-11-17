module.exports = {
  forbidden: [
    {
      name: 'no-decoder-on-main',
      severity: 'error',
      from: { path: '^packages/(gateway|ui)/src' },
      to: { path: '(^packages/workers/src/decode|node_modules/(mpg123-decoder|@wasm-audio-decoders))' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    exclude: { path: '(^|/)(dist|node_modules)/|\\.(spec|test)\\.ts$' },
  },
};