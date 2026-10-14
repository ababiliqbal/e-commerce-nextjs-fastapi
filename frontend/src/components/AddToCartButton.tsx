'use client';

import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { Product } from '@/types/product';

interface AddToCartButtonProps {
  product: Product;
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const isOutOfStock = product.stock_quantity <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem(product, 1);
    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  return (
    <Button
      size="lg"
      className="w-full cursor-pointer text-base font-semibold transition-all duration-200"
      disabled={isOutOfStock}
      onClick={handleAddToCart}
    >
      {isOutOfStock ? (
        'Stok Habis'
      ) : isAdded ? (
        '✓ Ditambahkan ke Keranjang'
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
