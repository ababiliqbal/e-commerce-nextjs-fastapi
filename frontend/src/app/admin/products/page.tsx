'use client';

import React from "react";
import Link from "next/link";
import { Package, ArrowLeft, Store, Sparkles, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminProductsPlaceholderPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-violet-700 transition-colors">
          Panel Admin
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Katalog Produk</span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Package className="h-4 w-4" />
            </span>
            <Badge
              variant="outline"
              className="bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 text-[10px] font-bold"
            >
              SPRINT 15 PREVIEW
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Manajemen Katalog & Inventaris Produk
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Kelola seluruh katalog produk aktif, unggah galeri multi-foto ke Supabase Storage, kontrol stok satuan, dan arsipkan produk.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold"
          >
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Kembali ke Analitik</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold"
          >
            <Link href="/" target="_blank">
              <Store className="h-4 w-4 mr-1.5 text-violet-700 dark:text-violet-400" />
              <span>Lihat Etalase</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Placeholder Preview Card */}
      <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/50 bg-linear-to-b from-card to-violet-50/30 dark:to-violet-950/20 p-8 sm:p-12 text-center shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700/10 text-violet-700 dark:text-violet-400 mb-5 ring-8 ring-violet-700/5">
          <Sparkles className="h-8 w-8" />
        </div>

        <Badge className="bg-violet-700 text-white font-bold text-xs px-3 py-1 mb-3">
          SEGERA HADIR DI SPRINT 15
        </Badge>

        <h2 className="text-xl sm:text-2xl font-black text-foreground max-w-lg mx-auto">
          Modul CRUD Katalog & Upload Gambar Sedang Dipersiapkan
        </h2>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto mt-2 leading-relaxed">
          Pada Sprint 15, modul ini akan dilengkapi dengan tabel data interaktif, formulir tambah/edit produk dengan multi-image uploader (Supabase Storage), filter status aktif/arsip, dan restock cepat.
        </p>

        {/* Feature Teasers */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          <div className="p-4 rounded-xl border border-border/80 bg-background/80">
            <Plus className="h-5 w-5 text-violet-700 mb-2" />
            <p className="font-bold text-xs text-foreground">Atomic CRUD</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tambah & update produk beserta relasi galeri fotonya secara atomik.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-background/80">
            <Search className="h-5 w-5 text-violet-700 mb-2" />
            <p className="font-bold text-xs text-foreground">Pencarian Cepat</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Filter instan berdasarkan nama, rentang harga, dan status inventaris.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-background/80">
            <Filter className="h-5 w-5 text-violet-700 mb-2" />
            <p className="font-bold text-xs text-foreground">Soft-Delete Aman</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Arsipkan produk tanpa merusak riwayat transaksi pesanan terdahulu.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-semibold text-xs shadow-xs">
            <Link href="/admin">
              <span>Buka Dashboard Analitik Utama</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
