import { afterEach } from 'vitest';

// Registered as a vitest setupFile, so it applies to every test in the jsdom
// environment whether or not that file imports the render helper. Nothing
// otherwise stops a new component test from calling Testing Library's `render`
// directly and quietly losing both the unmount and the storage reset.
//
// The guard is what lets one setupFile serve both environments: setupFiles run
// for every test file, most of this suite runs under node, and importing
// @testing-library/react there would pull in a DOM that does not exist.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  await import('@testing-library/jest-dom/vitest');

  // vite.config.ts does not set `test.globals: true`, so Testing Library's own
  // auto-cleanup -- which only registers when it finds a global `afterEach` --
  // never fires. Without this, every render in a file stays mounted and a later
  // test's `getByRole` can match a previous test's leftover DOM.
  //
  // WishlistProvider and CartProvider seed their initial state from
  // localStorage and persist on every change, and jsdom does not reset storage
  // between `it()` blocks either. Clearing it here keeps one test's wishlist or
  // cart out of the next one.
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });
}
