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
  is_active?: boolean;
  image_url?: string;
  images?: {
    id: string;
    image_url: string;
    is_primary: boolean;
    display_order: number;
  }[];
  created_at?: string;
}

export interface ProductImageInput {
  id?: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductAdminWriteRequest {
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  image_url?: string | null;
  images: ProductImageInput[];
}

export interface ImageUploadResponse {
  image_url: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id?: string;
  product_id: string;
  product_name?: string | null;
  quantity: number;
  price_at_purchase: number;
}

export interface OrderResponse {
  id: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  status: OrderStatus;
  payment_gateway_ref?: string | null;
  created_at: string;
  items: OrderItem[];
}

export type Order = OrderResponse;

export interface OrdersByStatus {
  PENDING: number;
  PAID: number;
  SHIPPED: number;
  COMPLETED: number;
  CANCELLED: number;
  [key: string]: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  price: number;
  image_url: string | null;
}

export interface TopSellingProduct {
  product_id: string;
  name: string;
  total_sold: number;
  total_revenue: number;
}

export interface AdminAnalyticsResponse {
  total_revenue: number;
  total_orders: number;
  orders_by_status: OrdersByStatus;
  conversion_rate: number;
  active_products_count: number;
  archived_products_count: number;
  low_stock_products: LowStockProduct[];
  top_selling_products: TopSellingProduct[];
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
  patch: (endpoint: string, body?: unknown, init?: RequestInit) =>
    apiFetch(endpoint, {
      ...init,
      method: "PATCH",
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
};

/**
 * Helper terpusat untuk memproses respons API Admin dan menangani error standar (401, 403, detail error JSON)
 */
async function handleApiResponse<T>(
  response: Response,
  defaultErrorMessage: string
): Promise<T> {
  if (response.status === 401) {
    throw new Error(
      "Sesi autentikasi telah berakhir atau Anda belum terautentikasi (401 Unauthorized)."
    );
  }

  if (response.status === 403) {
    throw new Error(
      "Akses ditolak: Anda tidak memiliki wewenang administrator (403 Forbidden)."
    );
  }

  if (!response.ok) {
    let errorMessage = `${defaultErrorMessage} (${response.status} ${response.statusText})`;
    try {
      const errData = await response.json();
      if (errData?.detail) {
        errorMessage =
          typeof errData.detail === "string"
            ? errData.detail
            : JSON.stringify(errData.detail);
      } else if (errData?.message) {
        errorMessage =
          typeof errData.message === "string"
            ? errData.message
            : JSON.stringify(errData.message);
      }
    } catch {
      // Abaikan jika respons bukan JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Mengambil ringkasan analitik eksekutif untuk Dashboard Admin
 * dari endpoint GET /api/v1/admin/analytics/summary menggunakan fetch berautentikasi.
 * Melempar error dengan pesan deskriptif jika server merespons 401 atau 403.
 */
export async function fetchAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  const response = await apiFetch("/api/v1/admin/analytics/summary", {
    method: "GET",
  });

  return handleApiResponse<AdminAnalyticsResponse>(
    response,
    "Gagal memuat analitik admin"
  );
}

// ============================================================================
// API Manajemen Katalog & Upload Admin (V1.3.0)
// ============================================================================

/**
 * Mengambil seluruh daftar produk untuk CMS Admin (termasuk produk nonaktif jika includeInactive=true)
 * Endpoint: GET /api/v1/admin/products
 */
export async function fetchAdminProducts(
  search?: string,
  includeInactive: boolean = true
): Promise<Product[]> {
  const params = new URLSearchParams();
  params.set("include_inactive", String(includeInactive));
  if (search && search.trim()) {
    params.set("search", search.trim());
  }

  const response = await apiFetch(`/api/v1/admin/products?${params.toString()}`, {
    method: "GET",
  });

  return handleApiResponse<Product[]>(
    response,
    "Gagal memuat katalog produk admin"
  );
}

/**
 * Membuat produk baru beserta galeri multi-gambar secara atomik
 * Endpoint: POST /api/v1/admin/products
 */
export async function createAdminProduct(
  payload: ProductAdminWriteRequest
): Promise<Product> {
  const response = await apiFetch("/api/v1/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleApiResponse<Product>(
    response,
    "Gagal menambahkan produk baru"
  );
}

/**
 * Memperbarui data produk, kuantitas stok, dan susunan galeri gambar
 * Endpoint: PUT /api/v1/admin/products/${productId}
 */
export async function updateAdminProduct(
  productId: string,
  payload: ProductAdminWriteRequest
): Promise<Product> {
  const response = await apiFetch(`/api/v1/admin/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleApiResponse<Product>(
    response,
    `Gagal memperbarui produk dengan ID ${productId}`
  );
}

/**
 * Melakukan soft-delete (pengarsipan) produk tanpa menghapus baris fisik database
 * Endpoint: DELETE /api/v1/admin/products/${productId}
 */
export async function archiveAdminProduct(
  productId: string
): Promise<{ status: string; product_id: string; is_active: boolean }> {
  const response = await apiFetch(`/api/v1/admin/products/${productId}`, {
    method: "DELETE",
  });

  return handleApiResponse<{ status: string; product_id: string; is_active: boolean }>(
    response,
    `Gagal mengarsipkan produk dengan ID ${productId}`
  );
}

/**
 * Mengunggah berkas gambar ke Cloud Object Storage (Supabase Storage) menggunakan FormData
 * Endpoint: POST /api/v1/admin/upload
 * 
 * PERINGATAN KRITIS: Header 'Content-Type' TIDAK disetel manual agar browser dapat
 * menentukan boundary multipart/form-data secara otomatis.
 */
export async function uploadProductImage(
  file: File
): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/api/v1/admin/upload", {
    method: "POST",
    body: formData,
  });

  return handleApiResponse<ImageUploadResponse>(
    response,
    "Gagal mengunggah gambar produk"
  );
}

// ============================================================================
// API Manajemen Pesanan Admin (Order Fulfillment FSM - V1.3.0)
// ============================================================================

/**
 * Mengambil seluruh daftar pesanan pelanggan dengan opsi filter status dan pencarian
 * Endpoint: GET /api/v1/admin/orders
 */
export async function fetchAdminOrders(
  statusFilter?: string,
  search?: string
): Promise<OrderResponse[]> {
  const params = new URLSearchParams();
  if (statusFilter && statusFilter.trim()) {
    params.set("status_filter", statusFilter.trim());
  }
  if (search && search.trim()) {
    params.set("search", search.trim());
  }

  const qs = params.toString();
  const endpoint = `/api/v1/admin/orders${qs ? `?${qs}` : ""}`;

  const response = await apiFetch(endpoint, {
    method: "GET",
  });

  return handleApiResponse<OrderResponse[]>(
    response,
    "Gagal memuat daftar pesanan admin"
  );
}

/**
 * Memperbarui status siklus hidup pesanan sesuai aturan Finite State Machine (FSM)
 * Endpoint: PATCH /api/v1/admin/orders/${orderId}/status
 */
export async function updateAdminOrderStatus(
  orderId: string,
  status: "SHIPPED" | "COMPLETED" | "CANCELLED"
): Promise<OrderResponse> {
  const response = await apiFetch(`/api/v1/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return handleApiResponse<OrderResponse>(
    response,
    `Gagal memperbarui status pesanan ${orderId}`
  );
}

export default apiFetch;
