// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, waitFor } from '@testing-library/react';
import AppContent from '../../src/AppContent';
import { renderWithProviders } from '../setup.components';
import {
  dispatchAgentAction,
  subscribeToOutcomes,
  CART_OWNED_ACTIONS,
  type AgentActionPayload,
  type AgentActionOutcome,
} from '../../src/services/agentActionBus';
import { FALLBACK_PRODUCTS } from '../../src/data/fallbackProducts';

/**
 * Asserts that each action on the bus produces an observable effect, by mounting
 * the provider tree the app uses at runtime and dispatching on the real bus.
 *
 * A sibling suite checks the static shape of the contract. That cannot establish
 * that an action is wired: matching `action.action === 'X'` in a source file is
 * satisfied by a comment or a dead branch, and would break on a refactor to a
 * switch with behaviour unchanged. These tests observe the storefront instead,
 * which is what the integration actually depends on.
 */

// Queries are scoped to the container this test mounted, not to document.body.
// A render left mounted by an earlier test would otherwise contribute its own
// text and its own subscription, and the first "N items" in the document could
// belong to either one.
let view: ReturnType<typeof renderWithProviders>;
const body = () => view.container.textContent || '';
const itemCount = () => body().match(/(\d+) items?/i)?.[1];

// Dispatching inside act() flushes the state updates the handlers queue, so the
// assertions below wait on the rendered result rather than on a fixed delay.
const dispatch = (action: AgentActionPayload) =>
  act(() => {
    dispatchAgentAction(action);
  });

const expectToast = () =>
  waitFor(() => expect(body()).toMatch(/concierge action was not applied/i));

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  // The catalog fetch is irrelevant here and would otherwise hit the network;
  // failing it exercises the bundled dataset, which the assertions below assume.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  view = renderWithProviders(<AppContent />);
  await waitFor(() => expect(itemCount()).toBe(String(FALLBACK_PRODUCTS.length)));
});

afterEach(() => {
  // Unmount before the spies come off, so an effect cleanup that logs does not
  // escape into the next test, and so this file's subscription is dropped
  // rather than left to receive the next test's dispatches.
  cleanup();
  warn.mockRestore();
  vi.unstubAllGlobals();
});

const declined = (action: string) =>
  warn.mock.calls.flat().some((arg) => String(arg).includes(`Declined ${action}`));

describe('actions owned by CartContext', () => {
  // These three were once reported as reaching nothing. They are handled in
  // CartContext, and these tests are the evidence.
  it('OPEN_CART opens the bag', async () => {
    expect(body()).not.toMatch(/your bag is currently empty/i);
    await dispatch({ action: 'OPEN_CART' });
    await waitFor(() => expect(body()).toMatch(/your bag is currently empty/i));
  });

  it('CLOSE_CART closes it again', async () => {
    await dispatch({ action: 'OPEN_CART' });
    await waitFor(() => expect(body()).toMatch(/your bag is currently empty/i));
    await dispatch({ action: 'CLOSE_CART' });
    await waitFor(() => expect(body()).not.toMatch(/your bag is currently empty/i));
  });

  it('APPLY_PROMO reports a bad code to the shopper, not just the console', async () => {
    await dispatch({ action: 'APPLY_PROMO', promoCode: 'NOT_A_REAL_CODE' });
    await expectToast();
    expect(body()).toMatch(/invalid or expired promo code/i);
    expect(declined('APPLY_PROMO')).toBe(true);
  });

  it('APPLY_PROMO with no code is reported rather than ignored', async () => {
    await dispatch({ action: 'APPLY_PROMO' });
    await expectToast();
    expect(declined('APPLY_PROMO')).toBe(true);
  });

  it('APPLY_PROMO with a non-string code is rejected before it reaches .trim()', async () => {
    await dispatch({ action: 'APPLY_PROMO', promoCode: 42 as unknown as string });
    await expectToast();
  });

  it('every action named in CART_OWNED_ACTIONS is one of the above', () => {
    expect([...CART_OWNED_ACTIONS].sort()).toEqual(
      ['APPLY_PROMO', 'CLOSE_CART', 'OPEN_CART'].sort(),
    );
  });
});

describe('actions owned by AppContent', () => {
  it('ADD_TO_CART adds a real product and says so', async () => {
    await dispatch({ action: 'ADD_TO_CART', productId: 16, size: 'M' });
    await waitFor(() => expect(body()).toMatch(/added to shopping bag by concierge/i));
  });

  it('OPEN_PRODUCT opens the product it names', async () => {
    await dispatch({ action: 'OPEN_PRODUCT', productId: 16 });
    await waitFor(() => expect(body()).toMatch(/moto biker jacket/i));
  });

  it('NAVIGATE_COLLECTION changes the visible collection', async () => {
    await dispatch({ action: 'NAVIGATE_COLLECTION', collection: 'new' });
    await waitFor(() => expect(itemCount()).not.toBe(String(FALLBACK_PRODUCTS.length)));
  });

  it('SEARCH filters the catalog', async () => {
    await dispatch({ action: 'SEARCH', query: 'jacket' });
    await waitFor(() => expect(itemCount()).toBe('4'));
  });

  it('CLEAR_FILTERS restores the full catalog', async () => {
    await dispatch({ action: 'SEARCH', query: 'jacket' });
    await waitFor(() => expect(itemCount()).toBe('4'));
    await dispatch({ action: 'CLEAR_FILTERS' });
    await waitFor(() => expect(itemCount()).toBe(String(FALLBACK_PRODUCTS.length)));
  });
});

describe('rejections are visible', () => {
  it('an unresolvable product raises a toast rather than failing silently', async () => {
    await dispatch({ action: 'ADD_TO_CART', productId: 999999 });
    await expectToast();
  });

  it('OPEN_PRODUCT for a product that does not exist is reported', async () => {
    await dispatch({ action: 'OPEN_PRODUCT', productId: 999999 });
    await expectToast();
  });

  it('NAVIGATE_COLLECTION with no collection is reported', async () => {
    await dispatch({ action: 'NAVIGATE_COLLECTION' });
    await expectToast();
    expect(declined('NAVIGATE_COLLECTION')).toBe(true);
  });

  it('SEARCH with no query is reported', async () => {
    await dispatch({ action: 'SEARCH' });
    await expectToast();
    expect(declined('SEARCH')).toBe(true);
  });

  it('SEARCH with a null query is rejected rather than throwing', async () => {
    // An agent emitting JSON commonly serializes an unset optional field as null,
    // and handleSearchChange calls .trim() on whatever it is given.
    await dispatch({ action: 'SEARCH', query: null as unknown as string });
    await expectToast();
    expect(declined('SEARCH')).toBe(true);
  });

  it('the live region exists before there is anything to announce', () => {
    // A live region has to be in the accessibility tree ahead of the message.
    // Mounting the region together with its first toast is the usual reason an
    // announcement is never made.
    const region = view.container.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(body()).not.toMatch(/concierge action was not applied/i);
  });

  it('two deliberate adds of the same product are confirmed twice', async () => {
    // Collapsing repeats is for rejections. Two adds are two events, and showing
    // one confirmation for two units in the bag misreports what happened.
    await dispatch({ action: 'ADD_TO_CART', productId: 16, size: 'M' });
    await waitFor(() => expect(body()).toMatch(/added to shopping bag by concierge/i));
    await dispatch({ action: 'ADD_TO_CART', productId: 16, size: 'M' });
    await waitFor(() =>
      expect(body().match(/added to shopping bag by concierge/gi)?.length).toBe(2),
    );
  });

  it('a repeated rejection does not stack another toast', async () => {
    // Every rejection now raises a toast, so a retrying agent could otherwise
    // bury the corner of the page in click-intercepting cards.
    await dispatch({ action: 'SEARCH' });
    await expectToast();
    const once = body().match(/concierge action was not applied/gi)?.length;
    expect(once).toBe(1);
    await dispatch({ action: 'SEARCH' });
    await dispatch({ action: 'SEARCH' });
    expect(body().match(/concierge action was not applied/gi)?.length).toBe(1);
  });

  it('an action the bus does not recognise is reported', async () => {
    await dispatch({ action: 'TOTALLY_BOGUS' } as never);
    await expectToast();
    expect(declined('TOTALLY_BOGUS')).toBe(true);
  });
});

describe('outcome envelopes and correlation', () => {
  it('emits an outcome envelope with matching id and applied: true for successful action', async () => {
    const outcomes: AgentActionOutcome[] = [];
    const unsub = subscribeToOutcomes((o) => outcomes.push(o));
    try {
      await dispatch({ id: 'add-123', action: 'ADD_TO_CART', productId: 16, size: 'M' });
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]).toEqual({
        id: 'add-123',
        action: 'ADD_TO_CART',
        ok: true,
        applied: true,
      });
    } finally {
      unsub();
    }
  });

  it('emits an outcome envelope with matching id, code, and applied: false for declined action', async () => {
    const outcomes: AgentActionOutcome[] = [];
    const unsub = subscribeToOutcomes((o) => outcomes.push(o));
    try {
      await dispatch({ id: 'search-456', action: 'SEARCH' });
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0].id).toBe('search-456');
      expect(outcomes[0].action).toBe('SEARCH');
      expect(outcomes[0].ok).toBe(false);
      expect(outcomes[0].applied).toBe(false);
      expect(outcomes[0].code).toBe('INVALID_QUERY');
    } finally {
      unsub();
    }
  });

  it('correlates multiple in-flight actions with different ids', async () => {
    const outcomes: AgentActionOutcome[] = [];
    const unsub = subscribeToOutcomes((o) => outcomes.push(o));
    try {
      await dispatch({ id: 'search-valid', action: 'SEARCH', query: 'jacket' });
      await dispatch({ id: 'search-invalid', action: 'SEARCH' });
      expect(outcomes).toHaveLength(2);
      expect(outcomes.find((o) => o.id === 'search-valid')).toMatchObject({
        id: 'search-valid',
        action: 'SEARCH',
        ok: true,
        applied: true,
      });
      expect(outcomes.find((o) => o.id === 'search-invalid')).toMatchObject({
        id: 'search-invalid',
        action: 'SEARCH',
        ok: false,
        applied: false,
        code: 'INVALID_QUERY',
      });
    } finally {
      unsub();
    }
  });

  it('emits stable machine-readable codes for each failure mode', async () => {
    const outcomes: AgentActionOutcome[] = [];
    const unsub = subscribeToOutcomes((o) => outcomes.push(o));
    try {
      await dispatch({ id: 'promo-none', action: 'APPLY_PROMO' });
      await dispatch({ id: 'promo-bad', action: 'APPLY_PROMO', promoCode: 'FAKE' });
      await dispatch({ id: 'nav-bad', action: 'NAVIGATE_COLLECTION' });
      await dispatch({ id: 'open-bad', action: 'OPEN_PRODUCT', productId: 999999 });
      await dispatch({ id: 'bogus-act', action: 'NON_EXISTENT' } as never);

      expect(outcomes.find((o) => o.id === 'promo-none')?.code).toBe('MISSING_PROMO');
      expect(outcomes.find((o) => o.id === 'promo-bad')?.code).toBe('INVALID_PROMO');
      expect(outcomes.find((o) => o.id === 'nav-bad')?.code).toBe('MISSING_COLLECTION');
      expect(outcomes.find((o) => o.id === 'open-bad')?.code).toBe('PRODUCT_NOT_FOUND');
      expect(outcomes.find((o) => o.id === 'bogus-act')?.code).toBe('UNRECOGNIZED_ACTION');
    } finally {
      unsub();
    }
  });

  it('yields exactly one successful outcome for every supported action success path', async () => {
    const successDispatches: AgentActionPayload[] = [
      { id: 'act-open-cart', action: 'OPEN_CART' },
      { id: 'act-close-cart', action: 'CLOSE_CART' },
      { id: 'act-apply-promo', action: 'APPLY_PROMO', promoCode: 'SAVE20' },
      { id: 'act-add-to-cart', action: 'ADD_TO_CART', productId: 16, size: 'M' },
      { id: 'act-open-product', action: 'OPEN_PRODUCT', productId: 16 },
      { id: 'act-navigate-collection', action: 'NAVIGATE_COLLECTION', collection: 'men' },
      { id: 'act-search', action: 'SEARCH', query: 'jacket' },
      { id: 'act-clear-filters', action: 'CLEAR_FILTERS' },
    ];

    // Assert every entry in CART_OWNED_ACTIONS is covered
    CART_OWNED_ACTIONS.forEach((actionName) => {
      expect(
        successDispatches.some((d) => d.action === actionName),
        `CART_OWNED_ACTION ${actionName} must be covered in success test`,
      ).toBe(true);
    });

    for (const actionPayload of successDispatches) {
      const outcomes: AgentActionOutcome[] = [];
      const unsub = subscribeToOutcomes((o) => outcomes.push(o));
      try {
        await dispatch(actionPayload);
        expect(
          outcomes,
          `Action ${actionPayload.action} (${actionPayload.id}) must emit exactly one outcome`,
        ).toHaveLength(1);
        expect(outcomes[0]).toMatchObject({
          id: actionPayload.id,
          action: actionPayload.action,
          ok: true,
          applied: true,
        });
      } finally {
        unsub();
      }
    }
  });
});
