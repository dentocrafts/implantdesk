import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'implantdesk_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(component, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.component.id === component.id);
      if (existing) {
        return prev.map(i =>
          i.component.id === component.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { component, quantity }];
    });
  }

  function removeItem(componentId) {
    setItems(prev => prev.filter(i => i.component.id !== componentId));
  }

  function updateQuantity(componentId, quantity) {
    if (quantity <= 0) {
      removeItem(componentId);
      return;
    }
    setItems(prev =>
      prev.map(i => i.component.id === componentId ? { ...i, quantity } : i)
    );
  }

  function clearCart() {
    setItems([]);
  }

  function reorderItems(orderItems) {
    orderItems.forEach(item => {
      if (item.implant_components) {
        addItem(item.implant_components, item.quantity);
      }
    });
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.component.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart, reorderItems,
      totalItems, totalAmount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
