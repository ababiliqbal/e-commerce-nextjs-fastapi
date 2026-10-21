import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, getPrimaryProductImage } from '@/types/product';

export interface CartItem extends Product {
  quantity: number;
}

export interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  lastOrderId: string | null;
  setLastOrderId: (orderId: string | null) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastOrderId: null,

      setLastOrderId: (orderId: string | null) => {
        set({ lastOrderId: orderId });
      },

      addItem: (product: Product, quantity = 1) => {
        if (quantity <= 0) return;

        const primaryImage = getPrimaryProductImage(product);
        const productImages = product.images || [];

        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? {
                      ...item,
                      image_url: primaryImage,
                      images: productImages.length > 0 ? productImages : item.images,
                      quantity: Math.min(
                        item.quantity + quantity,
                        product.stock_quantity
                      ),
                    }
                  : item
              ),
            };
          }

          if (product.stock_quantity > 0) {
            return {
              items: [
                ...state.items,
                {
                  ...product,
                  image_url: primaryImage,
                  images: productImages,
                  quantity: Math.min(quantity, product.stock_quantity),
                },
              ],
            };
          }

          return state;
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          set((state) => ({
            items: state.items.filter((item) => item.id !== productId),
          }));
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity: Math.min(quantity, item.stock_quantity),
                }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'ecommerce-cart-storage',
    }
  )
);
