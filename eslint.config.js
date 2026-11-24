import parser from '@typescript-eslint/parser';
export default [{
  files:['**/*.ts','**/*.tsx','**/*.js','**/*.mjs'],
  ignores:['dist/**','node_modules/**'],
  languageOptions:{parser,ecmaVersion:'latest',sourceType:'module'},
  rules:{'no-async-promise-executor':'error','no-dupe-args':'error','no-dupe-else-if':'error','no-dupe-keys':'error','no-unreachable':'error','no-unsafe-finally':'error'},
}];
