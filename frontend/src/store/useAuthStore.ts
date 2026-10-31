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

export interface SavedShipping {
  phone: string;
  address: string;
  // Kompatibilitas mundur dengan schema profil sebelumnya
  customer_phone?: string;
  shipping_address?: string;
  // Preferensi wilayah & kurir pengiriman (V2.0.0)
  province_id?: string;
  province_name?: string;
  city_id?: string;
  city_name?: string;
  postal_code?: string;
  courier_code?: string;
}

export type ShippingProfile = SavedShipping;

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  savedShipping: Record<string, SavedShipping>;

  // Actions
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearAuth: () => void;
  saveShippingProfile: (
    userId: string,
    profileOrPhone: Partial<SavedShipping> | string,
    legacyAddress?: string
  ) => void;
  getShippingProfile: (userId: string) => SavedShipping | undefined;
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

      saveShippingProfile: (
        userId: string,
        profileOrPhone: Partial<SavedShipping> | string,
        legacyAddress?: string
      ) => {
        if (!userId) return;
        set((state) => {
          const existing = state.savedShipping[userId] || ({} as SavedShipping);
          let updated: SavedShipping;

          if (typeof profileOrPhone === 'string') {
            const phone = profileOrPhone;
            const address = legacyAddress || '';
            updated = {
              ...existing,
              phone,
              address,
              customer_phone: phone,
              shipping_address: address,
            };
          } else {
            const phone =
              profileOrPhone.phone ||
              profileOrPhone.customer_phone ||
              existing.phone ||
              existing.customer_phone ||
              '';
            const address =
              profileOrPhone.address ||
              profileOrPhone.shipping_address ||
              existing.address ||
              existing.shipping_address ||
              '';
            updated = {
              ...existing,
              ...profileOrPhone,
              phone,
              address,
              customer_phone: phone,
              shipping_address: address,
            };
          }

          return {
            savedShipping: {
              ...state.savedShipping,
              [userId]: updated,
            },
          };
        });
      },

      getShippingProfile: (userId: string) => {
        if (!userId) return undefined;
        const raw = get().savedShipping[userId];
        if (!raw) return undefined;
        // Normalisasi kompatibilitas mundur
        const phone = raw.phone || raw.customer_phone || '';
        const address = raw.address || raw.shipping_address || '';
        return {
          ...raw,
          phone,
          address,
          customer_phone: phone,
          shipping_address: address,
        };
      },
    }),
    {
      name: 'ecommerce-auth-storage',
    }
  )
);
