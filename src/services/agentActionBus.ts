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

export interface AgentActionPayload {
  action: AgentActionType;
  productId?: number;
  productTitle?: string;
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
    window.dispatchEvent(new CustomEvent<AgentActionPayload>('onix:agent-action', { detail: action }));
  }
}

/**
 * Subscribe to agent actions within React application lifecycle.
 */
export function subscribeToAgentActions(handler: (action: AgentActionPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const customEvt = event as CustomEvent<AgentActionPayload>;
    if (customEvt.detail) {
      handler(customEvt.detail);
    }
  };
  window.addEventListener('onix:agent-action', listener);
  return () => window.removeEventListener('onix:agent-action', listener);
}

/**
 * Broadcast current cart and catalog status to external agent listeners.
 */
export function notifyCartState(cartDetail: {
  itemCount: number;
  subtotal: number;
  total: number;
  items: Array<{ id: string; title: string; price: number; quantity: number; size: string; color: string }>;
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
  - window.onixStore.dispatch({ action: 'ADD_TO_CART', productId: 16, size: 'M', color: 'Onyx Black', quantity: 1 })
  - window.onixStore.dispatch({ action: 'OPEN_PRODUCT', productId: 16 })
  - window.onixStore.dispatch({ action: 'NAVIGATE_COLLECTION', collection: 'sale' })
  - window.onixStore.dispatch({ action: 'OPEN_CART' })
  - window.onixStore.dispatch({ action: 'APPLY_PROMO', promoCode: 'SAVE20' })
  - window.onixStore.dispatch({ action: 'SEARCH', query: 'jacket' })
      `);
    }
  };
}
