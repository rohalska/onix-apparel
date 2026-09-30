import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    // Node is the default because most suites exercise services and the proxy.
    // Component tests opt into jsdom with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Runs for every test file. It is a no-op under node and registers the
    // component cleanup under jsdom, so a component test gets unmounted and
    // its localStorage cleared without having to import anything.
    setupFiles: ['tests/setup.dom.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**', 'server/**', 'shared/**'],
      // Set to what the suite measured when this landed, rounded down. Raise
      // these as coverage improves. Numbers picked aspirationally get bypassed
      // within a week, which is worse than having none.
      thresholds: {
        statements: 50, // measured 52.97-53.47
        // No global branch floor. Under the v8 provider a file that is never
        // loaded contributes no branch records, so the branches denominator
        // covers only tested files and the figure rises as coverage falls.
        // Testing a new file would add its uncovered branches and lower the
        // percentage, failing the build for improving coverage.
        //
        // The functions floor moves the same way, which is why it is loose
        // rather than near the measured value. The behavioural bus tests mount
        // AppContent, so the component tree it pulls in now contributes its
        // uncovered functions to the denominator: statements and lines went
        // from 22.62 to roughly 53 in the same change that took functions from
        // 38.15 down to 35.29.
        //
        // The figures are a range, not a point: AppContent leaves a debounce and
        // a toast timer pending under jsdom, so consecutive runs over an
        // unchanged tree vary by about half a point. The floors sit far enough
        // below the measurement that the variance cannot fail a build on its own.
        functions: 34, // measured 35.29
        lines: 50, // measured 52.97-53.47
      },
    },
  },
});
