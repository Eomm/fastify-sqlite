'use strict'

const config = require('neostandard')({
  ignores: require('neostandard').resolveIgnoresFromGitignore(),
  ts: true,
})

module.exports = [
  ...config,
  {
    files: ['**/*.d.ts'],
    rules: {
      // `declare namespace X` + `declare const X` is a legitimate TypeScript
      // declaration-merging pattern (used in index.d.ts). The default rule
      // is too strict for ambient .d.ts files.
      '@typescript-eslint/no-redeclare': 'off'
    }
  }
]
