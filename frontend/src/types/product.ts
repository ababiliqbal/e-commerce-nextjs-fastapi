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
  images?: ProductImage[];
  created_at?: string;
}

export {
  FALLBACK_PRODUCT_IMAGE,
  getPrimaryProductImage,
} from "@/lib/api";

