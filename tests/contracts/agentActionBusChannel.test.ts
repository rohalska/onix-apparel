/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  dispatchAgentAction,
  subscribeToAgentActions,
  subscribeToActionRejections,
  reportActionRejected,
  type AgentActionRejection,
} from '../../src/services/agentActionBus';

/**
 * The rejection channel is the only place an outcome is reported, so the cases
 * that would quietly bypass it are worth pinning: a handler that throws, and a
 * payload put on the public bus by something other than this module.
 */

const unsubscribes: Array<() => void> = [];

afterEach(() => {
  while (unsubscribes.length) unsubscribes.pop()!();
  vi.restoreAllMocks();
});

function collectRejections(): AgentActionRejection[] {
  const seen: AgentActionRejection[] = [];
  unsubscribes.push(subscribeToActionRejections((r) => seen.push(r)));
  return seen;
}

describe('a handler that throws', () => {
  it('is reported on the rejection channel rather than escaping', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen = collectRejections();
    unsubscribes.push(
      subscribeToAgentActions(() => {
        throw new Error('handler blew up');
      }),
    );

    expect(() => dispatchAgentAction({ action: 'OPEN_CART' })).not.toThrow();
    expect(seen).toHaveLength(1);
    expect(seen[0].action).toBe('OPEN_CART');
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
