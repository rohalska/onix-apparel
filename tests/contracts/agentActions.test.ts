/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FALLBACK_PRODUCTS } from '../../src/data/fallbackProducts';
import { CART_OWNED_ACTIONS } from '../../src/services/agentActionBus';

/**
 * Checks the static shape of the bus contract: the actions it declares, and whether
 * the examples `help()` prints are valid against the catalogs the storefront can
 * serve. That an action is actually wired to behaviour is established by
 * tests/contracts/agentActionBehaviour.test.tsx, which dispatches on the real bus
 * against a mounted provider tree; matching handler source text cannot show it.
 *
 * Paths resolve against this module rather than the process CWD, so the suite does
 * not depend on being run from the repo root. `new URL()` is not usable for this:
 * under jsdom the global URL resolves against the document base rather than the
 * file:// base it is handed, so the path comes out as an http URL.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

const bus = at('src/services/agentActionBus.ts');

/**
 * Parses the AgentActionType union. Fails loudly if the declaration cannot be
 * found: returning an empty list would register zero cases in `it.each` and
 * report success for a contract nobody checked.
 */
function declaredActions(): string[] {
  const start = bus.indexOf('export type AgentActionType');
  expect(start, 'AgentActionType declaration not found; has it been renamed?').toBeGreaterThan(-1);
  const end = bus.indexOf(';', start);
  expect(end, 'AgentActionType declaration is unterminated').toBeGreaterThan(start);
  const found = [...bus.slice(start, end).matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
  expect(found.length, 'parsed no actions out of AgentActionType').toBeGreaterThan(0);
  return found;
}

/**
 * The colours and sizes a product comes in differ between the two catalogs the
 * storefront can serve: `FALLBACK_PRODUCTS` when it is offline, and the Vertex
 * export once the proxy is up. `resolveValidatedAddToCart` consults the active
 * catalog first, so a variant is only safe to advertise if it is valid in both.
 * The proxy maps Vertex ids by stripping `onx-` and parsing an integer
 * (server/proxy.mjs), which is mirrored here.
 */
type Variants = { colors: string[]; sizes: string[] };

function catalogues(): Record<string, Map<number, Variants>> {
  const fallback = new Map<number, Variants>(
    FALLBACK_PRODUCTS.map((p) => [
      p.id,
      { colors: (p.colors ?? []).map((c) => c.name), sizes: p.sizes ?? [] },
    ]),
  );

  const vertexRaw = JSON.parse(at('vertex-retail-catalog.json')) as Array<{
    id: string;
    attributes?: { colors?: { text?: string[] }; sizes?: { text?: string[] } };
  }>;
  const vertex = new Map<number, Variants>(
    vertexRaw.map((p) => [
      parseInt(String(p.id).replace(/^onx-/, ''), 10),
      { colors: p.attributes?.colors?.text ?? [], sizes: p.attributes?.sizes?.text ?? [] },
    ]),
  );

  return { 'fallback dataset': fallback, 'Vertex catalog': vertex };
}

function helpExamples(): string[] {
  const logged: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    logged.push(args.map(String).join(' '));
  });
  (window as unknown as { onixStore: { help: () => void } }).onixStore.help();
  spy.mockRestore();
  return [...logged.join('\n').matchAll(/\{[^}]*\}/g)].map((m) => m[0]);
}

describe('the agent action bus contract', () => {
  it('declares the actions we expect', () => {
    expect(declaredActions().sort()).toEqual(
      [
        'ADD_TO_CART',
        'APPLY_PROMO',
        'CLEAR_FILTERS',
        'CLOSE_CART',
        'NAVIGATE_COLLECTION',
        'OPEN_CART',
        'OPEN_PRODUCT',
        'SEARCH',
      ].sort(),
    );
  });

  it('CART_OWNED_ACTIONS names only declared actions', () => {
    for (const action of CART_OWNED_ACTIONS) expect(declaredActions()).toContain(action);
  });

  it('every action help() advertises is declared in the type', () => {
    const advertised = [...bus.matchAll(/dispatch\(\{ action: '([A-Z_]+)'/g)].map((m) => m[1]);
    expect(advertised.length).toBeGreaterThan(0);
    for (const a of advertised) expect(declaredActions()).toContain(a);
  });

  it('help() cites products that exist in every catalog that has them', async () => {
    await import('../../src/services/agentActionBus');
    const examples = helpExamples().filter((e) => /productId:\s*\d+/.test(e));
    expect(examples.length).toBeGreaterThan(0);

    for (const [name, catalog] of Object.entries(catalogues())) {
      for (const example of examples) {
        const id = Number(/productId:\s*(\d+)/.exec(example)![1]);
        const variants = catalog.get(id);
        if (!variants) continue; // not every product appears in both exports

        const colour = /color:\s*'([^']+)'/.exec(example)?.[1];
        if (colour) {
          expect(
            variants.colors,
            `help() offers colour "${colour}" for product ${id}, absent from the ${name}`,
          ).toContain(colour);
        }

        const size = /size:\s*'([^']+)'/.exec(example)?.[1];
        if (size) {
          expect(
            variants.sizes,
            `help() offers size "${size}" for product ${id}, absent from the ${name}`,
          ).toContain(size);
        }
      }
    }
  });

  it('a product help() cites is resolvable in at least one catalog', async () => {
    await import('../../src/services/agentActionBus');
    const cats = Object.values(catalogues());
    for (const example of helpExamples().filter((e) => /productId:\s*\d+/.test(e))) {
      const id = Number(/productId:\s*(\d+)/.exec(example)![1]);
      expect(
        cats.some((c) => c.has(id)),
        `help() cites productId ${id}, which no catalog contains`,
      ).toBe(true);
    }
  });
});
