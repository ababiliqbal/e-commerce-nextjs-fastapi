import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './useCartStore';

export type UserRole = 'CUSTOMER' | 'ADMIN';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  auth_provider: AuthProvider;
}

export interface ShippingProfile {
  customer_phone: string;
  shipping_address: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  savedShipping: Record<string, ShippingProfile>;

  // Actions
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearAuth: () => void;
  saveShippingProfile: (userId: string, phone: string, address: string) => void;
  getShippingProfile: (userId: string) => ShippingProfile | undefined;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      savedShipping: {},

      setAuth: (user: User, accessToken: string) => {
        set({ user, accessToken });
        // Bersihkan state lastOrderId milik sesi sebelumnya agar tidak bocor lintas akun
        useCartStore.getState().setLastOrderId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('last_order_id');
          localStorage.removeItem('lastOrderId');
        }
      },

      setAccessToken: (accessToken: string | null) => {
        set({ accessToken });
      },

      clearAuth: () => {
        set({ user: null, accessToken: null });
        // Bersihkan state lastOrderId milik sesi sebelumnya saat logout
        useCartStore.getState().setLastOrderId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('last_order_id');
          localStorage.removeItem('lastOrderId');
        }
      },

      saveShippingProfile: (userId: string, phone: string, address: string) => {
        if (!userId) return;
        set((state) => ({
          savedShipping: {
            ...state.savedShipping,
            [userId]: {
              customer_phone: phone,
              shipping_address: address,
            },
          },
        }));
      },

      getShippingProfile: (userId: string) => {
        if (!userId) return undefined;
        return get().savedShipping[userId];
      },
    }),
    {
      name: 'ecommerce-auth-storage',
    }
  )
);
