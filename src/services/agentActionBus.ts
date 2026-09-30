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

/**
 * Dispatch an autonomous agent action to the client application.
 * Called by Gemini Enterprise web components, embed iframes, or local assistant widgets.
 */
export function dispatchAgentAction(action: AgentActionPayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AgentActionPayload>('onix:agent-action', { detail: action }),
    );
  }
}

/**
 * Subscribe to agent actions within React application lifecycle.
 */
export function subscribeToAgentActions(handler: (action: AgentActionPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
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
      reportActionRejected(
        String(customEvt.detail.action),
        'The storefront errored while handling this action and its outcome is unknown',
      );
      console.error('[AgentActionBus] Handler threw', error);
    }
  };
  window.addEventListener('onix:agent-action', listener);
  return () => window.removeEventListener('onix:agent-action', listener);
}

/** Caps what a rejection can put on screen, since anything in the page can emit one. */
const MAX_REPORTED_LENGTH = 200;

export interface AgentActionRejection {
  action: string;
  reason: string;
}

/**
 * Report that an action was received but not applied.
 *
 * Rejections go through one channel so that every subscriber reports them the
 * same way, and so a dispatching agent can observe an outcome rather than
 * inferring one from the cart not changing. CartContext has no toast surface of
 * its own, so before this existed an APPLY_PROMO failure was visible only in the
 * console while AppContent's rejections raised a toast.
 */
export function reportActionRejected(action: string, reason: string): void {
  console.warn(`[AgentActionBus] Declined ${action}: ${reason}`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AgentActionRejection>('onix:agent-action-rejected', {
        detail: { action, reason },
      }),
    );
  }
}

/**
 * Subscribe to rejections so one place in the UI can surface them.
 */
export function subscribeToActionRejections(
  handler: (rejection: AgentActionRejection) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
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
    handler({
      action: detail.action.slice(0, MAX_REPORTED_LENGTH),
      reason: detail.reason.slice(0, MAX_REPORTED_LENGTH),
    });
  };
  window.addEventListener('onix:agent-action-rejected', listener);
  return () => window.removeEventListener('onix:agent-action-rejected', listener);
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

// Attach to window for Google FDE console testing and headless iframe bridge
if (typeof window !== 'undefined') {
  (window as any).onixStore = {
    dispatch: dispatchAgentAction,
    subscribe: subscribeToAgentActions,
    version: '1.0.0',
    help: () => {
      console.log(`
🤖 Onix Apparel - Gemini Enterprise Client Action Bus:
  - window.onixStore.dispatch({ action: 'ADD_TO_CART', productId: 16, size: 'M', quantity: 1 })
  - window.onixStore.dispatch({ action: 'OPEN_PRODUCT', productId: 16 })
  - window.onixStore.dispatch({ action: 'NAVIGATE_COLLECTION', collection: 'sale' })
  - window.onixStore.dispatch({ action: 'OPEN_CART' })
  - window.onixStore.dispatch({ action: 'APPLY_PROMO', promoCode: 'SAVE20' })
  - window.onixStore.dispatch({ action: 'SEARCH', query: 'jacket' })
      `);
    },
  };
}
