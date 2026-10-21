import { useAuthStore } from "@/store/useAuthStore";

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

export interface Product {
  id: string; // UUID v4
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  images?: {
    id: string;
    image_url: string;
    is_primary: boolean;
    display_order: number;
  }[];
  created_at?: string;
}

export const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80";

/**
 * Mengembalikan URL gambar produk primer sesuai urutan prioritas:
 * 1. Gambar dari product.images dengan is_primary === true
 * 2. product.images[0]?.image_url jika ada
 * 3. product.image_url jika ada
 * 4. Fallback URL gambar Unsplash yang valid
 */
export function getPrimaryProductImage(
  product?:
    | {
        image_url?: string | null;
        images?: {
          id?: string;
          image_url: string;
          is_primary?: boolean;
          display_order?: number;
        }[];
      }
    | null
): string {
  if (!product) return FALLBACK_PRODUCT_IMAGE;

  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find((img) => img.is_primary === true);
    if (primary?.image_url && typeof primary.image_url === "string" && primary.image_url.trim()) {
      return primary.image_url;
    }

    const firstImg = product.images[0];
    if (firstImg?.image_url && typeof firstImg.image_url === "string" && firstImg.image_url.trim()) {
      return firstImg.image_url;
    }
  }

  if (product.image_url && typeof product.image_url === "string" && product.image_url.trim()) {
    return product.image_url;
  }

  return FALLBACK_PRODUCT_IMAGE;
}

export const getServerApiUrl = (): string => {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000"
  );
};

export const getClientApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};

export const SERVER_API_URL = getServerApiUrl();
export const CLIENT_API_URL = getClientApiUrl();

export const getBaseApiUrl = (): string => {
  if (typeof window !== "undefined") {
    return getClientApiUrl();
  }
  return getServerApiUrl();
};

export const resolveApiUrl = (endpointOrUrl: string): string => {
  if (endpointOrUrl.startsWith("http://") || endpointOrUrl.startsWith("https://")) {
    return endpointOrUrl;
  }
  const base = getBaseApiUrl().replace(/\/+$/, "");
  const path = endpointOrUrl.startsWith("/") ? endpointOrUrl : `/${endpointOrUrl}`;
  return `${base}${path}`;
};

// Mutex / promise sharing to avoid concurrent duplicate refresh calls
let refreshPromise: Promise<string | null> | null = null;

/**
 * Melakukan silent token refresh ke POST /api/v1/auth/refresh
 * menggunakan HttpOnly refresh_token cookie.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshUrl = resolveApiUrl("/api/v1/auth/refresh");
      const res = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        useAuthStore.getState().clearAuth();
        return null;
      }

      const data = await res.json();
      const newAccessToken = data.access_token;

      if (newAccessToken && typeof newAccessToken === "string") {
        const { user } = useAuthStore.getState();
        if (user) {
          useAuthStore.getState().setAuth(user, newAccessToken);
        } else {
          useAuthStore.getState().setAccessToken(newAccessToken);
        }
        return newAccessToken;
      } else {
        useAuthStore.getState().clearAuth();
        return null;
      }
    } catch {
      useAuthStore.getState().clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface CustomRequestInit extends RequestInit {
  _retry?: boolean;
}

/**
 * Helper fetch API terpusat dengan dukungan:
 * - credentials: 'include' otomatis (HttpOnly cookie)
 * - Header Authorization: Bearer ${accessToken} otomatis dari useAuthStore
 * - Silent Token Refresh otomatis saat menerima 401 Unauthorized
 */
export async function apiFetch(
  input: string | URL | Request,
  init?: CustomRequestInit
): Promise<Response> {
  let url: string;
  if (typeof input === "string") {
    url = resolveApiUrl(input);
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = resolveApiUrl(input.url);
  }

  const { accessToken } = useAuthStore.getState();

  const headers = new Headers(init?.headers);

  // Sisipkan header Authorization jika accessToken tersedia dan belum disetel
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const config: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  const response = await fetch(url, config);

  // Jangan coba silent refresh jika request awal adalah endpoint autentikasi
  // (misalnya saat login gagal karena password salah, atau saat refresh itu sendiri gagal)
  const isAuthEndpoint =
    url.includes("/api/v1/auth/refresh") ||
    url.includes("/api/v1/auth/login") ||
    url.includes("/api/v1/auth/register");

  // Jika 401 Unauthorized dan belum dicoba refresh
  if (response.status === 401 && !isAuthEndpoint && !init?._retry) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);

      const retryConfig: CustomRequestInit = {
        ...init,
        headers: retryHeaders,
        credentials: "include",
        _retry: true,
      };

      return fetch(url, retryConfig);
    } else {
      useAuthStore.getState().clearAuth();
    }
  }

  return response;
}

// Aliases for convenience
export const fetchWithAuth = apiFetch;
export const fetchApi = apiFetch;

export const apiClient = {
  get: (endpoint: string, init?: RequestInit) =>
    apiFetch(endpoint, { ...init, method: "GET" }),
  post: (endpoint: string, body?: unknown, init?: RequestInit) =>
    apiFetch(endpoint, {
      ...init,
      method: "POST",
      headers: {
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
      body:
        body instanceof FormData
          ? body
          : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),
  put: (endpoint: string, body?: unknown, init?: RequestInit) =>
    apiFetch(endpoint, {
      ...init,
      method: "PUT",
      headers: {
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
      body:
        body instanceof FormData
          ? body
          : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),
  delete: (endpoint: string, init?: RequestInit) =>
    apiFetch(endpoint, { ...init, method: "DELETE" }),
};

export default apiFetch;
