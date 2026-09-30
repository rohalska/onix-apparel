import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The proxy and scripts are plain ESM JavaScript, not TypeScript.
    // The spread comes first and `files` after, so this project's file
    // restriction always wins even if the upstream config object ever
    // gains a `files` key of its own.
    ...tseslint.configs.disableTypeChecked,
    files: ['server/**/*.mjs', 'scripts/**/*.mjs', 'shared/**/*.mjs'],
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      // These files run under plain Node, so declare the runtime globals they
      // use. The flat-config recommended sets carry no environment by
      // default, and this project doesn't otherwise depend on the `globals`
      // package for a handful of identifiers.
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // server/proxy.mjs and scripts/dev.mjs use empty catch blocks
      // deliberately, as fallbacks when a preferred code path fails (e.g.
      // trying several credential sources, or killing a child process that
      // may already be dead). That's intentional control flow, not an
      // oversight.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Scoped to the specific files that earned this: the two services
    // shaping payloads from loosely-typed external JSON sources (a public
    // fake-store API used for fallback data, and the Vertex AI Retail API),
    // the module that attaches an `any`-typed debug bridge to `window` for
    // FDE console testing, the component that reads a not-yet-modeled action
    // union from that bridge, and the tests that deliberately pass invalid
    // types to exercise defensive handling. Modeling those payloads
    // precisely is a real typing effort belonging to later work, not this
    // lint-onboarding task, so this stays a warning rather than a blocking
    // error — but only here. Everywhere else, including new code, an
    // explicit `any` is still an error.
    files: [
      'src/services/api.ts',
      'src/services/vertexSearch.ts',
      'src/services/agentActionBus.ts',
      'src/components/ConciergeChatModal.tsx',
      'tests/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettier,
);
