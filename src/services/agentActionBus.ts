import { Product } from '../types/product';

export type AgentActionType =
  | 'ADD_TO_CART'
  | 'OPEN_CART'
  | 'CLOSE_CART'
  | 'OPEN_PRODUCT'
  | 'NAVIGATE_COLLECTION'
  | 'APPLY_PROMO'
  | 'CLEAR_FILTERS'
  | 'SEARCH';

/**
 * Cart and promo actions are handled by CartContext's subscriber; everything else
 * by AppContent's. Naming the split here keeps each subscriber from treating the
 * other's actions as unknown, and lets the contract test assert the union is
 * covered without grepping for subscribers.
 */
export const CART_OWNED_ACTIONS = [
  'OPEN_CART',
  'CLOSE_CART',
  'APPLY_PROMO',
] as const satisfies readonly AgentActionType[];

export interface AgentActionPayload {
  /** Optional caller-supplied correlation ID returned in the outcome envelope */
  id?: string;
  action: AgentActionType;
  /** Canonical product ID resolved against the store catalog */
  productId?: number;
  /** @deprecated Untrusted: Storefront resolves by productId only against canonical catalog */
  productTitle?: string;
  /** @deprecated Untrusted: Storefront resolves by productId only against canonical catalog */
  product?: Product;
  size?: string;
  color?: string;
  quantity?: number;
  collection?: 'women' | 'men' | 'accessories' | 'new' | 'sale';
  promoCode?: string;
  query?: string;
}

/** Caps what a rejection or outcome can put on screen/bus, since anything in the page can emit one. */
const MAX_REPORTED_LENGTH = 200;

export type AgentActionOutcomeCode =
  | 'NO_SUBSCRIBER'
  | 'HANDLER_THREW'
  | 'UNHANDLED_ACTION'
  | 'UNRECOGNIZED_ACTION'
  | 'INVALID_PRODUCT_OR_OPTIONS'
  | 'PRODUCT_NOT_FOUND'
  | 'MISSING_COLLECTION'
  | 'INVALID_QUERY'
  | 'MISSING_PROMO'
  | 'INVALID_PROMO';

export interface AgentActionOutcome {
  id?: string;
  action: AgentActionType | string;
  ok: boolean;
  applied?: boolean;
  reason?: string;
  code?: AgentActionOutcomeCode | string;
}

export interface AgentActionRejection {
  id?: string;
  action: string;
  reason: string;
  code?: AgentActionOutcomeCode | string;
}

let activeSubscriberCount = 0;

interface ActiveDispatchContext {
  id?: string;
  action: string;
  outcomeCount: number;
}

const dispatchStack: ActiveDispatchContext[] = [];

export function getActiveSubscriberCount(): number {
  return activeSubscriberCount;
}

export function resetAgentActionBusForTesting(): void {
  activeSubscriberCount = 0;
  dispatchStack.length = 0;
}

/** Sanitizes and bounds correlation IDs consistently across dispatches and outcomes. */
function sanitizeId(id: unknown): string | undefined {
  if (typeof id === 'string') {
    const trimmed = id.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, MAX_REPORTED_LENGTH);
    }
  }
  return undefined;
}

/**
 * Report the outcome of an action dispatch. Emits onix:agent-action-outcome
 * envelope for every dispatch, and onix:agent-action-rejected if not ok.
 * Deduplicates multiple reports for the same active dispatch.
 */
export function reportActionOutcome(outcome: AgentActionOutcome): void {
  const sanitizedOutcomeId = sanitizeId(outcome.id);

  // Correlate with active dispatch context when called during a dispatch
  let matchedContext: ActiveDispatchContext | undefined;
  if (dispatchStack.length > 0) {
    if (sanitizedOutcomeId !== undefined) {
      for (let i = dispatchStack.length - 1; i >= 0; i--) {
        if (dispatchStack[i].id === sanitizedOutcomeId) {
          matchedContext = dispatchStack[i];
          break;
        }
      }
    } else {
      for (let i = dispatchStack.length - 1; i >= 0; i--) {
        if (dispatchStack[i].action === String(outcome.action)) {
          matchedContext = dispatchStack[i];
          break;
        }
      }
    }

    if (matchedContext) {
      if (matchedContext.outcomeCount > 0) {
        // Enforce exactly one outcome per dispatch: suppress secondary outcomes
        // (e.g. if a handler reported success and subsequently threw)
        console.warn(
          `[AgentActionBus] Suppressing duplicate outcome for action ${outcome.action} (id: ${sanitizedOutcomeId ?? matchedContext.id}): already reported`,
        );
        return;
      }
      matchedContext.outcomeCount++;
    }
  }

  const resolvedId = sanitizedOutcomeId ?? matchedContext?.id;

  if (!outcome.ok) {
    console.warn(
      `[AgentActionBus] Declined ${outcome.action}: ${outcome.reason ?? outcome.code ?? 'unknown'}`,
    );
  }
  if (typeof window !== 'undefined') {
    const envelope: AgentActionOutcome = {
      action: outcome.action,
      ok: outcome.ok,
    };
    if (resolvedId !== undefined) envelope.id = resolvedId;
    if (outcome.applied !== undefined) envelope.applied = outcome.applied;
    if (outcome.reason !== undefined) envelope.reason = outcome.reason;
    if (outcome.code !== undefined) envelope.code = outcome.code;

    window.dispatchEvent(
      new CustomEvent<AgentActionOutcome>('onix:agent-action-outcome', {
        detail: envelope,
      }),
    );

    if (!outcome.ok) {
      window.dispatchEvent(
        new CustomEvent<AgentActionRejection>('onix:agent-action-rejected', {
          detail: {
            id: resolvedId,
            action: String(outcome.action),
            reason: outcome.reason ?? 'Action was not applied',
            code: outcome.code,
          },
        }),
      );
    }
  }
}

/**
 * Report that an action was received but not applied.
 * Maintained for backwards compatibility; forwards to reportActionOutcome.
 */
export function reportActionRejected(
  action: string,
  reason: string,
  id?: string,
  code?: AgentActionOutcomeCode | string,
): void {
  reportActionOutcome({
    id,
    action,
    ok: false,
    applied: false,
    reason,
    code,
  });
}

/**
 * Dispatch an autonomous agent action to the client application.
 * Called by Gemini Enterprise web components, embed iframes, or local assistant widgets.
 * Guarantees exactly one outcome envelope is emitted for every dispatch.
 */
export function dispatchAgentAction(action: AgentActionPayload): void {
  if (typeof window === 'undefined') return;

  const sanitizedId = sanitizeId(action.id);
  const outboundAction: AgentActionPayload =
    action.id === sanitizedId ? action : { ...action, id: sanitizedId };

  if (activeSubscriberCount === 0) {
    reportActionOutcome({
      id: sanitizedId,
      action: action.action,
      ok: false,
      applied: false,
      reason: 'No subscriber was mounted to handle this action',
      code: 'NO_SUBSCRIBER',
    });
    return;
  }

  const context: ActiveDispatchContext = {
    id: sanitizedId,
    action: String(action.action),
    outcomeCount: 0,
  };
  dispatchStack.push(context);

  try {
    window.dispatchEvent(
      new CustomEvent<AgentActionPayload>('onix:agent-action', { detail: outboundAction }),
    );

    if (context.outcomeCount === 0) {
      reportActionOutcome({
        id: sanitizedId,
        action: action.action,
        ok: false,
        applied: false,
        reason: `Action ${String(action.action)} was not handled by any subscriber`,
        code: 'UNHANDLED_ACTION',
      });
    }
  } finally {
    const popped = dispatchStack.pop();
    if (popped !== context) {
      const idx = dispatchStack.indexOf(context);
      if (idx !== -1) {
        dispatchStack.splice(idx, 1);
      }
    }
  }
}

/**
 * Subscribe to agent actions within React application lifecycle.
 */
export function subscribeToAgentActions(handler: (action: AgentActionPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  activeSubscriberCount++;
  let unsubscribed = false;

  const listener = (event: Event) => {
    const customEvt = event as CustomEvent<AgentActionPayload>;
    if (!customEvt.detail) return;
    try {
      handler(customEvt.detail);
    } catch (error) {
      // The handler runs inline in this listener, so without this an exception
      // downstream escapes to window.onerror: the action is not applied and
      // nothing reports it, which is the one path that would contradict the
      // rejection channel being the single place outcomes are reported.
      // Deliberately does not say the action was not applied. A handler can throw
      // after it has already changed state, so the honest report is that the
      // outcome is unknown; telling an agent it failed invites a retry that
      // applies it twice.
      reportActionOutcome({
        id: customEvt.detail.id,
        action: String(customEvt.detail.action),
        ok: false,
        reason: 'The storefront errored while handling this action and its outcome is unknown',
        code: 'HANDLER_THREW',
      });
      console.error('[AgentActionBus] Handler threw', error);
    }
  };
  window.addEventListener('onix:agent-action', listener);
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    activeSubscriberCount = Math.max(0, activeSubscriberCount - 1);
    window.removeEventListener('onix:agent-action', listener);
  };
}

/**
 * Subscribe to outcomes so callers or UI can observe the result of actions.
 */
export function subscribeToOutcomes(handler: (outcome: AgentActionOutcome) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let unsubscribed = false;
  const listener = (event: Event) => {
    const customEvt = event as CustomEvent<AgentActionOutcome>;
    const detail = customEvt.detail;
    // Anything in the page can emit on this bus, so accept only bounded
    // strings rather than whatever a third-party integration happens to attach.
    if (
      !detail ||
      typeof detail !== 'object' ||
      typeof detail.action !== 'string' ||
      typeof detail.ok !== 'boolean'
    ) {
      return;
    }
    const sanitized: AgentActionOutcome = {
      action: detail.action.slice(0, MAX_REPORTED_LENGTH),
      ok: detail.ok,
    };
    if (detail.id !== undefined) {
      const sanitizedId = sanitizeId(detail.id);
      if (sanitizedId !== undefined) {
        sanitized.id = sanitizedId;
      }
    }
    if (typeof detail.applied === 'boolean') {
      sanitized.applied = detail.applied;
    }
    if (typeof detail.reason === 'string') {
      sanitized.reason = detail.reason.slice(0, MAX_REPORTED_LENGTH);
    }
    if (typeof detail.code === 'string') {
      sanitized.code = detail.code.slice(0, MAX_REPORTED_LENGTH) as AgentActionOutcomeCode;
    }
    handler(sanitized);
  };
  window.addEventListener('onix:agent-action-outcome', listener);
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    window.removeEventListener('onix:agent-action-outcome', listener);
  };
}

/**
 * Subscribe to rejections so one place in the UI can surface them.
 */
export function subscribeToActionRejections(
  handler: (rejection: AgentActionRejection) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  let unsubscribed = false;
  const listener = (event: Event) => {
    const customEvt = event as CustomEvent<AgentActionRejection>;
    const detail = customEvt.detail;
    // Anything in the page can emit on this bus, and the reason is rendered in
    // trusted storefront chrome, so accept only bounded strings rather than
    // whatever a third-party integration happens to attach.
    if (
      !detail ||
      typeof detail !== 'object' ||
      typeof detail.action !== 'string' ||
      typeof detail.reason !== 'string'
    ) {
      return;
    }
    const sanitized: AgentActionRejection = {
      action: detail.action.slice(0, MAX_REPORTED_LENGTH),
      reason: detail.reason.slice(0, MAX_REPORTED_LENGTH),
    };
    if (detail.id !== undefined) {
      const sanitizedId = sanitizeId(detail.id);
      if (sanitizedId !== undefined) {
        sanitized.id = sanitizedId;
      }
    }
    if (typeof detail.code === 'string') {
      sanitized.code = detail.code.slice(0, MAX_REPORTED_LENGTH) as AgentActionOutcomeCode;
    }
    handler(sanitized);
  };
  window.addEventListener('onix:agent-action-rejected', listener);
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    window.removeEventListener('onix:agent-action-rejected', listener);
  };
}

/**
 * Broadcast current cart and catalog status to external agent listeners.
 */
export function notifyCartState(cartDetail: {
  itemCount: number;
  subtotal: number;
  total: number;
  items: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    size: string;
    color: string;
  }>;
}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('onix:cart-updated', { detail: cartDetail }));
  }
}

declare global {
  interface Window {
    onixStore?: {
      dispatch: typeof dispatchAgentAction;
      subscribe: typeof subscribeToAgentActions;
      subscribeOutcomes: typeof subscribeToOutcomes;
      version: string;
      help: () => void;
    };
  }
}

// Attach to window for Google FDE console testing and headless iframe bridge
if (typeof window !== 'undefined') {
  window.onixStore = {
    dispatch: dispatchAgentAction,
    subscribe: subscribeToAgentActions,
    subscribeOutcomes: subscribeToOutcomes,
    version: '1.1.0',
    help: () => {
      console.log(`
🤖 Onix Wares - Gemini Enterprise Client Action Bus:
  - window.onixStore.dispatch({ action: 'ADD_TO_CART', productId: 16, size: 'M', quantity: 1 })
  - window.onixStore.dispatch({ action: 'OPEN_PRODUCT', productId: 16 })
  - window.onixStore.dispatch({ action: 'NAVIGATE_COLLECTION', collection: 'sale' })
  - window.onixStore.dispatch({ action: 'OPEN_CART' })
  - window.onixStore.dispatch({ action: 'APPLY_PROMO', promoCode: 'SAVE20' })
  - window.onixStore.dispatch({ action: 'SEARCH', query: 'jacket' })

Correlation & Outcomes:
  Supply an optional 'id' on dispatch to correlate responses.
  Listen for 'onix:agent-action-outcome' or window.onixStore.subscribeOutcomes((outcome) => ...):
  { id, action, ok, reason?, code?, applied? }
      `);
    },
  };
  try {
    window.dispatchEvent(new CustomEvent('onix:store-ready'));
  } catch {
    // Ignore in non-browser test environments without full CustomEvent support
  }
}
