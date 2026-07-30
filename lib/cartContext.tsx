'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  imageUrl: string;
  quantity: number;
  installmentCount?: number;
  installmentAmount?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getSubtotal: () => number;
  getDiscountTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved) as CartItem[]);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id
            ? { ...i, ...item, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setItems(prevItems => prevItems.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(prevItems =>
      prevItems.map(i => (i.id === id ? { ...i, quantity } : i))
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getSubtotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.originalPrice || item.price;
      return total + price * item.quantity;
    }, 0);
  }, [items]);

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }, [items]);

  const getDiscountTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.originalPrice || item.price;
      return total + price * item.quantity;
    }, 0) - items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getSubtotal,
    getDiscountTotal,
  }), [items, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getSubtotal, getDiscountTotal]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
