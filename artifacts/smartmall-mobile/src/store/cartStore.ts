import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  productId: number;
  mallId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  unit?: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: number, mallId: number, quantity: number) => void;
  removeItem: (productId: number, mallId: number) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (entry) => entry.productId === item.productId && entry.mallId === item.mallId,
          );
          return existing
            ? {
                items: state.items.map((entry) =>
                  entry === existing
                    ? { ...entry, quantity: entry.quantity + item.quantity }
                    : entry,
                ),
              }
            : { items: [...state.items, item] };
        }),
      updateQuantity: (productId, mallId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (entry) => entry.productId !== productId || entry.mallId !== mallId,
                )
              : state.items.map((entry) =>
                  entry.productId === productId && entry.mallId === mallId
                    ? { ...entry, quantity }
                    : entry,
                ),
        })),
      removeItem: (productId, mallId) =>
        set((state) => ({
          items: state.items.filter(
            (entry) => entry.productId !== productId || entry.mallId !== mallId,
          ),
        })),
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    }),
    {
      name: 'smartmall-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);