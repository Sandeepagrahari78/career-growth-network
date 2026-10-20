export default [
  {
    files: [
      "scripts/ci/**/*.mjs",
      "scripts/infra/**/*.mjs",
      "services/health-demo/**/*.mjs",
      "services/platform-template/test/**/*.mjs",
      "services/identity/**/*.mjs",
      "services/ai/test/**/*.mjs",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        AbortController: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: "error",
      curly: "error",
    },
  },
];
