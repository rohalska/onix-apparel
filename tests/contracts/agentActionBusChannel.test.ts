/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  dispatchAgentAction,
  subscribeToAgentActions,
  subscribeToActionRejections,
  subscribeToOutcomes,
  reportActionRejected,
  reportActionOutcome,
  resetAgentActionBusForTesting,
  type AgentActionRejection,
  type AgentActionOutcome,
} from '../../src/services/agentActionBus';

/**
 * The rejection channel and outcome envelope bus report the results of agent dispatches.
 * The cases that would quietly bypass or mislead an agent are worth pinning:
 * - A handler that throws (reported as HANDLER_THREW with unknown applied status)
 * - No subscriber mounted (reported as NO_SUBSCRIBER)
 * - Correlation ID preservation across concurrent dispatches
 * - Malformed payloads put on the bus by untrusted page scripts
 */

const unsubscribes: Array<() => void> = [];

afterEach(() => {
  while (unsubscribes.length) unsubscribes.pop()!();
  resetAgentActionBusForTesting();
  vi.restoreAllMocks();
});

function collectRejections(): AgentActionRejection[] {
  const seen: AgentActionRejection[] = [];
  unsubscribes.push(subscribeToActionRejections((r) => seen.push(r)));
  return seen;
}

function collectOutcomes(): AgentActionOutcome[] {
  const seen: AgentActionOutcome[] = [];
  unsubscribes.push(subscribeToOutcomes((o) => seen.push(o)));
  return seen;
}

describe('a handler that throws', () => {
  it('is reported on the rejection channel and outcome bus with unknown applied state', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const rejections = collectRejections();
    const outcomes = collectOutcomes();
    unsubscribes.push(
      subscribeToAgentActions(() => {
        throw new Error('handler blew up');
      }),
    );

    expect(() => dispatchAgentAction({ id: 'throw-1', action: 'OPEN_CART' })).not.toThrow();

    expect(rejections).toHaveLength(1);
    expect(rejections[0].action).toBe('OPEN_CART');
    expect(rejections[0].id).toBe('throw-1');
    expect(rejections[0].code).toBe('HANDLER_THREW');

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].id).toBe('throw-1');
    expect(outcomes[0].action).toBe('OPEN_CART');
    expect(outcomes[0].ok).toBe(false);
    expect(outcomes[0].code).toBe('HANDLER_THREW');
    // Applied is deliberately omitted because outcome is unknown
    expect(outcomes[0].applied).toBeUndefined();
  });
});

describe('dispatching when no subscriber is mounted', () => {
  it('emits an outcome envelope with NO_SUBSCRIBER code and applied: false', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();
    const rejections = collectRejections();

    dispatchAgentAction({ id: 'no-sub-1', action: 'SEARCH', query: 'jacket' });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toEqual({
      id: 'no-sub-1',
      action: 'SEARCH',
      ok: false,
      applied: false,
      reason: 'No subscriber was mounted to handle this action',
      code: 'NO_SUBSCRIBER',
    });

    expect(rejections).toHaveLength(1);
    expect(rejections[0].id).toBe('no-sub-1');
    expect(rejections[0].code).toBe('NO_SUBSCRIBER');
  });
});

describe('correlation of concurrent dispatches', () => {
  it('correlates multiple in-flight actions to their respective outcome envelopes', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.action === 'SEARCH' && payload.query === 'fail') {
          reportActionRejected('SEARCH', 'Search failed', payload.id, 'INVALID_QUERY');
        } else {
          reportActionOutcome({
            id: payload.id,
            action: payload.action,
            ok: true,
            applied: true,
          });
        }
      }),
    );

    dispatchAgentAction({ id: 'req-alpha', action: 'SEARCH', query: 'fail' });
    dispatchAgentAction({ id: 'req-beta', action: 'SEARCH', query: 'shoes' });

    expect(outcomes).toHaveLength(2);
    const alpha = outcomes.find((o) => o.id === 'req-alpha');
    const beta = outcomes.find((o) => o.id === 'req-beta');

    expect(alpha).toEqual({
      id: 'req-alpha',
      action: 'SEARCH',
      ok: false,
      applied: false,
      reason: 'Search failed',
      code: 'INVALID_QUERY',
    });

    expect(beta).toEqual({
      id: 'req-beta',
      action: 'SEARCH',
      ok: true,
      applied: true,
    });
  });
});

describe('rejections put on the bus by other page scripts', () => {
  it('are ignored when the payload is not two strings', () => {
    const seen = collectRejections();
    for (const detail of [
      null,
      'a string',
      42,
      { action: 'SEARCH' },
      { reason: 'no action' },
      { action: 42, reason: 'not a string' },
      // Both of these carry a `slice`, so they would reach a subscriber that
      // only checked for presence rather than for a string. Without them this
      // test passes whether the check is there or not, because every other
      // malformed reason throws on `.slice` before delivery either way.
      { action: 'SEARCH', reason: ['spoofed via an array'] },
      { action: 'SEARCH', reason: new String('spoofed via a String object') },
    ]) {
      window.dispatchEvent(new CustomEvent('onix:agent-action-rejected', { detail }));
    }
    expect(seen).toHaveLength(0);
  });

  it('are truncated so a long reason cannot be pushed into the storefront chrome', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const seen = collectRejections();
    reportActionRejected('SEARCH', 'x'.repeat(5000));
    expect(seen).toHaveLength(1);
    expect(seen[0].reason.length).toBeLessThanOrEqual(200);
  });
});

describe('outcomes put on the bus by other page scripts', () => {
  it('are ignored when the payload is malformed', () => {
    const seen = collectOutcomes();
    for (const detail of [
      null,
      'a string',
      42,
      { action: 'SEARCH' }, // missing ok
      { ok: true }, // missing action
      { action: 123, ok: true },
      { action: 'SEARCH', ok: 'not-a-bool' },
    ]) {
      window.dispatchEvent(new CustomEvent('onix:agent-action-outcome', { detail }));
    }
    expect(seen).toHaveLength(0);
  });

  it('are truncated when containing long fields', () => {
    const seen = collectOutcomes();
    window.dispatchEvent(
      new CustomEvent('onix:agent-action-outcome', {
        detail: {
          id: 'i'.repeat(1000),
          action: 'SEARCH',
          ok: false,
          reason: 'r'.repeat(1000),
          code: 'c'.repeat(1000),
        },
      }),
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].id?.length).toBeLessThanOrEqual(200);
    expect(seen[0].reason?.length).toBeLessThanOrEqual(200);
    expect(seen[0].code?.length).toBeLessThanOrEqual(200);
  });
});

describe('window.onixStore public contract', () => {
  it('exposes version, dispatch, subscribe, and subscribeOutcomes', () => {
    expect(window.onixStore).toBeDefined();
    expect(window.onixStore?.version).toBe('1.1.0');
    expect(typeof window.onixStore?.dispatch).toBe('function');
    expect(typeof window.onixStore?.subscribe).toBe('function');
    expect(typeof window.onixStore?.subscribeOutcomes).toBe('function');
    expect(typeof window.onixStore?.help).toBe('function');
  });
});

describe('exactly one outcome per dispatch guarantee and deduplication', () => {
  it('emits only the success outcome if a handler reports success and subsequently throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.id === 'success-then-throw') {
          reportActionOutcome({
            id: payload.id,
            action: payload.action,
            ok: true,
            applied: true,
          });
          throw new Error('exploded after applying');
        }
      }),
    );

    dispatchAgentAction({ id: 'success-then-throw', action: 'OPEN_CART' });

    // Must emit exactly 1 outcome (the success outcome), not both ok:true and HANDLER_THREW
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toEqual({
      id: 'success-then-throw',
      action: 'OPEN_CART',
      ok: true,
      applied: true,
    });
  });

  it('isolates nested dispatches so inner outcome does not hide outer UNHANDLED_ACTION', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.id === 'parent-unhandled') {
          // Parent handler dispatches a nested child action and does not report on parent
          dispatchAgentAction({ id: 'child-handled', action: 'OPEN_CART' });
        } else if (payload.id === 'child-handled') {
          // Child handler handles and reports child outcome
          reportActionOutcome({
            id: payload.id,
            action: payload.action,
            ok: true,
            applied: true,
          });
        }
      }),
    );

    dispatchAgentAction({ id: 'parent-unhandled', action: 'SEARCH', query: 'dress' });

    // Both dispatches should emit exactly one outcome
    expect(outcomes).toHaveLength(2);
    const child = outcomes.find((o) => o.id === 'child-handled');
    const parent = outcomes.find((o) => o.id === 'parent-unhandled');

    expect(child).toEqual({
      id: 'child-handled',
      action: 'OPEN_CART',
      ok: true,
      applied: true,
    });

    expect(parent).toEqual({
      id: 'parent-unhandled',
      action: 'SEARCH',
      ok: false,
      applied: false,
      reason: 'Action SEARCH was not handled by any subscriber',
      code: 'UNHANDLED_ACTION',
    });
  });

  it('does not allow an unrelated outcome event to hide UNHANDLED_ACTION', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.id === 'action-target') {
          // Emit an outcome with an unrelated ID
          reportActionOutcome({
            id: 'unrelated-id',
            action: 'OTHER_ACTION',
            ok: true,
          });
          // Do not report on action-target
        }
      }),
    );

    dispatchAgentAction({ id: 'action-target', action: 'CLEAR_FILTERS' });

    // The unrelated outcome was emitted, but action-target was not handled
    expect(outcomes).toHaveLength(2);
    const targetOutcome = outcomes.find((o) => o.id === 'action-target');
    expect(targetOutcome).toEqual({
      id: 'action-target',
      action: 'CLEAR_FILTERS',
      ok: false,
      applied: false,
      reason: 'Action CLEAR_FILTERS was not handled by any subscriber',
      code: 'UNHANDLED_ACTION',
    });
  });

  it('deduplicates multiple outcome reports for the same dispatch', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.id === 'dup-dispatch') {
          reportActionOutcome({ id: payload.id, action: payload.action, ok: true, applied: true });
          reportActionOutcome({ id: payload.id, action: payload.action, ok: true, applied: true });
        }
      }),
    );

    dispatchAgentAction({ id: 'dup-dispatch', action: 'CLOSE_CART' });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].id).toBe('dup-dispatch');
    expect(outcomes[0].ok).toBe(true);
  });

  it('does not misattribute an id-less outcome when action name does not match the in-flight dispatch', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.action === 'SEARCH') {
          // An unrelated id-less outcome for a different action is reported mid-dispatch
          reportActionOutcome({
            action: 'ADD_TO_CART',
            ok: false,
            reason: 'Unrelated cart failure',
            code: 'INVALID_PRODUCT_OR_OPTIONS',
          });

          // The real outcome for the in-flight SEARCH action is reported
          reportActionOutcome({
            action: 'SEARCH',
            ok: true,
            applied: true,
          });
        }
      }),
    );

    // Dispatch an id-less SEARCH action
    dispatchAgentAction({ action: 'SEARCH', query: 'jacket' });

    expect(outcomes).toHaveLength(2);
    // Unrelated ADD_TO_CART outcome was emitted without stealing the SEARCH dispatch context
    const cartOutcome = outcomes.find((o) => o.action === 'ADD_TO_CART');
    expect(cartOutcome).toEqual({
      action: 'ADD_TO_CART',
      ok: false,
      reason: 'Unrelated cart failure',
      code: 'INVALID_PRODUCT_OR_OPTIONS',
    });

    // Real SEARCH outcome was NOT suppressed by the unrelated ADD_TO_CART outcome
    const searchOutcome = outcomes.find((o) => o.action === 'SEARCH');
    expect(searchOutcome).toEqual({
      action: 'SEARCH',
      ok: true,
      applied: true,
    });
  });

  it('ensures unsubscribe is idempotent and prevents subscriber count drift or spurious NO_SUBSCRIBER', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    // First subscriber
    const unsub1 = subscribeToAgentActions(() => {});
    unsubscribes.push(unsub1);

    // Second subscriber that handles SEARCH
    const unsub2 = subscribeToAgentActions((payload) => {
      if (payload.action === 'SEARCH') {
        reportActionOutcome({ action: payload.action, ok: true, applied: true });
      }
    });
    unsubscribes.push(unsub2);

    // Repeated calls to unsub1 should be idempotent and not decrement activeSubscriberCount below 1
    unsub1();
    unsub1();
    unsub1();

    // Dispatching SEARCH must still reach subscriber 2 and NOT trigger NO_SUBSCRIBER
    dispatchAgentAction({ id: 'idemp-1', action: 'SEARCH', query: 'shoes' });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toEqual({
      id: 'idemp-1',
      action: 'SEARCH',
      ok: true,
      applied: true,
    });
  });

  it('does not mutate input outcome object even when frozen', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    const frozenInput: AgentActionOutcome = Object.freeze({
      action: 'SEARCH',
      ok: true,
      applied: true,
    });

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.action === 'SEARCH') {
          expect(() => reportActionOutcome(frozenInput)).not.toThrow();
        }
      }),
    );

    dispatchAgentAction({ id: 'frozen-id-1', action: 'SEARCH', query: 'dress' });

    expect(frozenInput.id).toBeUndefined();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].id).toBe('frozen-id-1');
  });

  it('sanitizes caller-supplied id at dispatch so raw addEventListener consumers see valid string or undefined', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rawEvents: AgentActionOutcome[] = [];
    const rawListener = (e: Event) => {
      rawEvents.push((e as CustomEvent<AgentActionOutcome>).detail);
    };
    window.addEventListener('onix:agent-action-outcome', rawListener);
    unsubscribes.push(() => window.removeEventListener('onix:agent-action-outcome', rawListener));

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.action === 'SEARCH') {
          reportActionOutcome({ action: payload.action, ok: true, applied: true });
        }
      }),
    );

    // Dispatch with non-string id
    dispatchAgentAction({ id: 12345 as unknown as string, action: 'SEARCH', query: 'dress' });
    expect(rawEvents).toHaveLength(1);
    expect(rawEvents[0].id).toBeUndefined();

    // Dispatch with oversized string id
    const oversizedId = 'x'.repeat(300);
    dispatchAgentAction({ id: oversizedId, action: 'SEARCH', query: 'dress' });
    expect(rawEvents).toHaveLength(2);
    expect(rawEvents[1].id).toBe('x'.repeat(200));
  });

  it('maintains exactly-one-outcome guarantee when caller id is changed by sanitization', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions((payload) => {
        if (payload.action === 'SEARCH') {
          // Handlers report with payload id (already sanitized)
          reportActionOutcome({ id: payload.id, action: payload.action, ok: true, applied: true });
        } else if (payload.action === 'OPEN_CART') {
          // Or handler reports with raw unsanitized id directly
          reportActionOutcome({ id: '   ', action: payload.action, ok: true, applied: true });
        }
      }),
    );

    // 1. Whitespace-only id
    dispatchAgentAction({ id: '   ', action: 'SEARCH', query: 'shoes' });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      action: 'SEARCH',
      ok: true,
      applied: true,
    });
    expect(outcomes[0].id).toBeUndefined();

    // 2. Non-string id
    dispatchAgentAction({ id: 12345 as unknown as string, action: 'SEARCH', query: 'shoes' });
    expect(outcomes).toHaveLength(2);
    expect(outcomes[1]).toMatchObject({
      action: 'SEARCH',
      ok: true,
      applied: true,
    });
    expect(outcomes[1].id).toBeUndefined();

    // 3. Oversized string id (over 200 chars)
    const longId = 'a'.repeat(300);
    dispatchAgentAction({ id: longId, action: 'SEARCH', query: 'shoes' });
    expect(outcomes).toHaveLength(3);
    expect(outcomes[2]).toMatchObject({
      id: 'a'.repeat(200),
      action: 'SEARCH',
      ok: true,
      applied: true,
    });

    // 4. Handler reporting with raw whitespace id for action
    dispatchAgentAction({ id: '   ', action: 'OPEN_CART' });
    expect(outcomes).toHaveLength(4);
    expect(outcomes[3]).toMatchObject({
      action: 'OPEN_CART',
      ok: true,
      applied: true,
    });
    expect(outcomes[3].id).toBeUndefined();
  });

  it('maintains exactly-one-outcome guarantee when handler throws with sanitized caller id', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const outcomes = collectOutcomes();

    unsubscribes.push(
      subscribeToAgentActions(() => {
        throw new Error('Explosion');
      }),
    );

    // 1. Whitespace id on throwing handler
    dispatchAgentAction({ id: '   ', action: 'SEARCH', query: 'crash' });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      action: 'SEARCH',
      ok: false,
      code: 'HANDLER_THREW',
    });
    expect(outcomes[0].id).toBeUndefined();

    // 2. Oversized id on throwing handler
    dispatchAgentAction({ id: 'b'.repeat(300), action: 'SEARCH', query: 'crash' });
    expect(outcomes).toHaveLength(2);
    expect(outcomes[1]).toMatchObject({
      id: 'b'.repeat(200),
      action: 'SEARCH',
      ok: false,
      code: 'HANDLER_THREW',
    });

    // 3. Non-string id on throwing handler
    dispatchAgentAction({ id: 9999 as unknown as string, action: 'SEARCH', query: 'crash' });
    expect(outcomes).toHaveLength(3);
    expect(outcomes[2]).toMatchObject({
      action: 'SEARCH',
      ok: false,
      code: 'HANDLER_THREW',
    });
    expect(outcomes[2].id).toBeUndefined();
  });
});
