'use client';

import React, { useState, useMemo } from "react";
import { ProductImage, getPrimaryProductImage } from "@/types/product";

interface ProductImageGalleryProps {
  images?: ProductImage[];
  fallbackImageUrl?: string;
  productName: string;
}

export function ProductImageGallery({
  images,
  fallbackImageUrl,
  productName,
}: ProductImageGalleryProps) {
  // 1. Urutkan images dengan memprioritaskan is_primary lalu display_order ascending.
  // Jika images kosong, buat array 1 elemen dari fallback/getPrimaryProductImage
  const galleryList = useMemo(() => {
    if (images && images.length > 0) {
      return [...images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.display_order ?? 0) - (b.display_order ?? 0);
      });
    }

    const fallback =
      fallbackImageUrl ||
      getPrimaryProductImage(null);

    return [
      {
        id: "fallback-primary",
        image_url: fallback,
        is_primary: true,
        display_order: 0,
      },
    ];
  }, [images, fallbackImageUrl]);

  // 2. Prioritaskan gambar dengan is_primary === true sebagai gambar awal yang aktif
  const initialIndex = useMemo(() => {
    const idx = galleryList.findIndex((img) => img.is_primary);
    return idx !== -1 ? idx : 0;
  }, [galleryList]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const activeImage = galleryList[selectedIndex] || galleryList[0];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Bingkai Gambar Utama Beresolusi Tinggi */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/40 shadow-sm group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeImage.id || activeImage.image_url}
          src={activeImage.image_url}
          alt={`${productName} - Tampilan ${selectedIndex + 1}`}
          className="h-full w-full object-cover transition-all duration-300 ease-in-out group-hover:scale-105 animate-in fade-in duration-300"
          loading="eager"
        />

        {/* Indikator Badge Posisi Gambar */}
        {galleryList.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full shadow-xs">
            {selectedIndex + 1} / {galleryList.length}
          </div>
        )}
      </div>

      {/* Deretan Thumbnail Switcher (jika terdapat lebih dari 1 gambar) */}
      {galleryList.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
          {galleryList.map((img, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <button
                key={img.id || `${img.image_url}-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`Pilih gambar ${idx + 1}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-muted transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "ring-2 ring-violet-600 border-2 border-violet-600 shadow-md scale-102 opacity-100"
                    : "border border-border/80 opacity-70 hover:opacity-100 hover:border-violet-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProductImageGallery;

