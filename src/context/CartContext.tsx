import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, PromoCode } from '../types/product';
import { notifyCartState, subscribeToAgentActions } from '../services/agentActionBus';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, selectedSize: string, selectedColor: string, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  promoCode: PromoCode | null;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  totalItems: number;
  freeShippingThreshold: number;
  amountUntilFreeShipping: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const VALID_PROMOS: Record<string, PromoCode> = {
  SAVE20: {
    code: 'SAVE20',
    discountType: 'percentage',
    value: 0.20,
    description: '20% off entire order',
  },
  WELCOME10: {
    code: 'WELCOME10',
    discountType: 'percentage',
    value: 0.10,
    description: '10% off new customer discount',
  },
  FREESHIP: {
    code: 'FREESHIP',
    discountType: 'shipping',
    value: 0,
    description: 'Free standard shipping',
  },
};

const FREE_SHIPPING_THRESHOLD = 75;
const STANDARD_SHIPPING_COST = 8.50;
const TAX_RATE = 0.0825; // 8.25% standard sales tax

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('onix_cart') || localStorage.getItem('aura_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [promoCode, setPromoCode] = useState<PromoCode | null>(() => {
    try {
      const saved = localStorage.getItem('onix_promo') || localStorage.getItem('aura_promo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('onix_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to persist cart:', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (promoCode) {
        localStorage.setItem('onix_promo', JSON.stringify(promoCode));
      } else {
        localStorage.removeItem('onix_promo');
      }
    } catch (e) {
      console.error('Failed to persist promo:', e);
    }
  }, [promoCode]);

  const addToCart = (product: Product, selectedSize: string, selectedColor: string, quantity = 1) => {
    setCart((prev) => {
      const id = `${product.id}-${selectedSize}-${selectedColor}`;
      const existing = prev.find((item) => item.id === id);

      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }

      return [
        ...prev,
        {
          id,
          product,
          quantity,
          selectedSize,
          selectedColor,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode(null);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const applyPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (VALID_PROMOS[cleanCode]) {
      setPromoCode(VALID_PROMOS[cleanCode]);
      return { success: true, message: `Code applied: ${VALID_PROMOS[cleanCode].description}!` };
    }
    return { success: false, message: 'Invalid or expired promo code. Try SAVE20 or FREESHIP' };
  };

  const removePromoCode = () => {
    setPromoCode(null);
  };

  // Calculations
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  let discount = 0;
  if (promoCode) {
    if (promoCode.discountType === 'percentage') {
      discount = subtotal * promoCode.value;
    }
  }

  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || promoCode?.discountType === 'shipping';
  const shipping = cart.length === 0 ? 0 : qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_COST;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * TAX_RATE;
  const total = taxableAmount + shipping + tax;

  const amountUntilFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Subscribe to autonomous agent actions for cart open/close and promo codes
  useEffect(() => {
    return subscribeToAgentActions((action) => {
      if (action.action === 'OPEN_CART') {
        setIsCartOpen(true);
      } else if (action.action === 'CLOSE_CART') {
        setIsCartOpen(false);
      } else if (action.action === 'APPLY_PROMO' && action.promoCode) {
        applyPromoCode(action.promoCode);
      }
    });
  }, []);

  // Broadcast cart changes on the window bus so embedded AI agents stay synchronized
  useEffect(() => {
    notifyCartState({
      itemCount: totalItems,
      subtotal,
      total,
      items: cart.map((i) => ({
        id: i.id,
        title: i.product.title,
        price: i.product.price,
        quantity: i.quantity,
        size: i.selectedSize,
        color: i.selectedColor,
      })),
    });
  }, [cart, totalItems, subtotal, total]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
        promoCode,
        applyPromoCode,
        removePromoCode,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        totalItems,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        amountUntilFreeShipping,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
