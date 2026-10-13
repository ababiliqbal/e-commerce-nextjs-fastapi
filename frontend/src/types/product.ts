export interface Product {
  id: string; // UUID v4
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  created_at?: string;
}
