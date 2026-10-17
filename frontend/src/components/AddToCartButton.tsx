'use client';

import React, { useState } from 'react';
import { ShoppingCart, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { Product } from '@/types/product';

interface AddToCartButtonProps {
  product: Product;
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const isOutOfStock = product.stock_quantity <= 0;

  const handleAddToCart = async () => {
    if (isOutOfStock || isLoading) return;

    setIsLoading(true);

    try {
      // Micro-interaction delay to show loading state and prevent rapid double-clicks
      await new Promise((resolve) => setTimeout(resolve, 400));

      addItem(product, 1);
      setIsAdded(true);

      toast.success("Produk berhasil ditambahkan ke keranjang!", {
        description: product.name,
      });
    } catch (error) {
      console.error("Gagal menambahkan ke keranjang:", error);
      toast.error("Gagal menambahkan produk ke keranjang.");
    } finally {
      setIsLoading(false);
    }

    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <Button
      size="lg"
      className="w-full cursor-pointer text-base font-semibold transition-all duration-200"
      disabled={isOutOfStock || isLoading}
      onClick={handleAddToCart}
    >
      {isOutOfStock ? (
        'Stok Habis'
      ) : isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Menambahkan...
        </>
      ) : isAdded ? (
        <>
          <Check className="mr-2 h-5 w-5" />
          Ditambahkan ke Keranjang
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Tambah ke Keranjang
        </>
      )}
    </Button>
  );
}

export default AddToCartButton;
