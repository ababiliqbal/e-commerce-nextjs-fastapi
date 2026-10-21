'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  TrendingUp,
  Banknote,
  ShoppingBag,
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchAdminAnalytics,
  AdminAnalyticsResponse,
  FALLBACK_PRODUCT_IMAGE,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAnalytics();
      setData(res);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memuat analitik admin.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Format Mata Uang Rupiah Indonesia (Rp ...)
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Format Tanggal & Waktu Pembaruan
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Kontrol Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
              Control Panel & Reporting
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Ringkasan Eksekutif & Analitik Penjualan
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {lastUpdated ? (
              <span>
                Terakhir diperbarui:{" "}
                <strong className="text-foreground font-semibold">
                  {formatDateTime(lastUpdated)} WIB
                </strong>
              </span>
            ) : (
              <span>Memuat pembaruan data sistem...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={loadAnalytics}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="rounded-xl border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-violet-700" : ""}`} />
            <span>{isLoading ? "Memperbarui..." : "Muat Ulang Data"}</span>
          </Button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && !isLoading && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">
                Gagal Memuat Data Analitik
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={loadAnalytics}
            size="sm"
            variant="destructive"
            className="rounded-xl text-xs font-semibold shadow-xs"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Skeleton Loading State */}
      {isLoading && !data && (
        <div className="space-y-8">
          {/* Skeleton 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 animate-pulse shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-10 w-10 bg-violet-700/15 rounded-xl" />
                </div>
                <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-3 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>

          {/* Skeleton Chart */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-5 animate-pulse shadow-xs">
            <div className="h-5 w-60 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-6 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-4">
              {[1, 2, 3, 4, 5].map((k) => (
                <div key={k} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Skeleton 2 Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/70 bg-card p-6 h-72 animate-pulse" />
            <div className="rounded-2xl border border-border/70 bg-card p-6 h-72 animate-pulse" />
          </div>
        </div>
      )}

      {/* Loaded Content */}
      {data && (
        <div className="space-y-8">
          {/* 2. Empat Kartu KPI Utama (Grid 4 Kolom Responsif) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Kartu 1 — Total Pendapatan Bersih (Gross Revenue) */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs hover:border-violet-700/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Pendapatan
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 group-hover:scale-105 transition-transform">
                    <Banknote className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {formatRupiah(data.total_revenue)}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-700" />
                Akumulasi pesanan PAID, SHIPPED & COMPLETED
              </p>
            </div>

            {/* Kartu 2 — Total Pesanan & Rasio Konversi */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs hover:border-violet-700/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Transaksi
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    {data.total_orders}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    pesanan
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 text-[11px] font-bold px-2 py-0.5 ml-auto"
                  >
                    {data.conversion_rate.toFixed(1)}% Konversi
                  </Badge>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                Rasio pesanan terbayar terhadap total pesanan
              </p>
            </div>

            {/* Kartu 3 — Status Katalog Inventaris */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs hover:border-violet-700/40 transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Katalog Inventaris
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 group-hover:scale-105 transition-transform">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    {data.active_products_count}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    aktif
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-[11px] font-bold px-2 py-0.5 ml-auto"
                  >
                    Etalase Publik
                  </Badge>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {data.archived_products_count} produk diarsipkan (soft-delete)
              </p>
            </div>

            {/* Kartu 4 — Peringatan Stok Menipis (Low-Stock Alert) */}
            {(() => {
              const lowStockCount = data.low_stock_products?.length || 0;
              const hasAlert = lowStockCount > 0;
              return (
                <div
                  className={`rounded-2xl border p-5 sm:p-6 shadow-xs transition-all group flex flex-col justify-between ${
                    hasAlert
                      ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800"
                      : "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Peringatan Stok
                      </span>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl group-hover:scale-105 transition-transform ${
                          hasAlert
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}
                      >
                        {hasAlert ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span
                        className={`text-2xl sm:text-3xl font-black tracking-tight ${
                          hasAlert ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {lowStockCount}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        produk
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 ml-auto uppercase ${
                          hasAlert
                            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {hasAlert ? "Perlu Restock" : "Stok Aman"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        hasAlert ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    {hasAlert
                      ? "Stok ≤ 5 unit membutuhkan restock"
                      : "Semua stok dalam ambang batas aman"}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* 3. Visualisasi Performa & Distribusi Status Pesanan (Grafik Bar Proporsional) */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Distribusi Siklus Hidup Pesanan (Order Funnel & Status Breakdown)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualisasi proporsi status transaksi pelanggan dari checkout hingga selesai
                </p>
              </div>
              <div className="text-xs font-bold text-muted-foreground">
                Total: <span className="text-foreground">{data.total_orders} Pesanan</span>
              </div>
            </div>

            {/* Multi-segmented Stacked Horizontal Bar */}
            <div className="space-y-2">
              <div className="h-5 w-full rounded-xl bg-muted/60 overflow-hidden flex shadow-inner p-0.5 gap-0.5">
                {(() => {
                  const total = data.total_orders || 1;
                  const statuses = [
                    { key: "PENDING", count: data.orders_by_status.PENDING || 0, color: "bg-amber-500" },
                    { key: "PAID", count: data.orders_by_status.PAID || 0, color: "bg-indigo-600" },
                    { key: "SHIPPED", count: data.orders_by_status.SHIPPED || 0, color: "bg-violet-700" },
                    { key: "COMPLETED", count: data.orders_by_status.COMPLETED || 0, color: "bg-emerald-600" },
                    { key: "CANCELLED", count: data.orders_by_status.CANCELLED || 0, color: "bg-rose-500" },
                  ];

                  if (data.total_orders === 0) {
                    return (
                      <div className="w-full h-full bg-muted/80 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                        Belum ada data pesanan
                      </div>
                    );
                  }

                  return statuses.map((item) => {
                    const pct = (item.count / total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={item.key}
                        style={{ width: `${pct}%` }}
                        className={`${item.color} h-full rounded-md transition-all duration-500 first:rounded-l-lg last:rounded-r-lg`}
                        title={`${item.key}: ${item.count} pesanan (${pct.toFixed(1)}%)`}
                      />
                    );
                  });
                })()}
              </div>

              {/* Status Breakdown Row Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                {[
                  {
                    name: "PENDING",
                    label: "Menunggu Pembayaran",
                    count: data.orders_by_status.PENDING || 0,
                    dotColor: "bg-amber-500",
                    barColor: "bg-amber-500",
                    bgBadge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
                  },
                  {
                    name: "PAID",
                    label: "Terbayar / Diproses",
                    count: data.orders_by_status.PAID || 0,
                    dotColor: "bg-indigo-600",
                    barColor: "bg-indigo-600",
                    bgBadge: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
                  },
                  {
                    name: "SHIPPED",
                    label: "Dalam Pengiriman",
                    count: data.orders_by_status.SHIPPED || 0,
                    dotColor: "bg-violet-700",
                    barColor: "bg-violet-700",
                    bgBadge: "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300",
                  },
                  {
                    name: "COMPLETED",
                    label: "Selesai Diterima",
                    count: data.orders_by_status.COMPLETED || 0,
                    dotColor: "bg-emerald-600",
                    barColor: "bg-emerald-600",
                    bgBadge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                  },
                  {
                    name: "CANCELLED",
                    label: "Dibatalkan / Kadaluarsa",
                    count: data.orders_by_status.CANCELLED || 0,
                    dotColor: "bg-rose-500",
                    barColor: "bg-rose-500",
                    bgBadge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
                  },
                ].map((item) => {
                  const pct =
                    data.total_orders > 0
                      ? ((item.count / data.total_orders) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <div
                      key={item.name}
                      className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.dotColor}`} />
                          <span className="font-bold text-xs text-foreground">
                            {item.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0 ${item.bgBadge}`}
                        >
                          {pct}%
                        </Badge>
                      </div>

                      <div className="my-1">
                        <span className="text-xl font-extrabold text-foreground">
                          {item.count}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          pesanan
                        </span>
                      </div>

                      <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden mt-2">
                        <div
                          className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, Number(pct)))}%` }}
                        />
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Dua Tabel Operasional Berdampingan (Grid 2 Kolom di bawah Grafik) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Kiri — Tabel Peringatan Stok Menipis (low_stock_products) */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Peringatan Stok Menipis
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Produk dengan persediaan ≤ 5 unit
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/admin/products"
                    className="inline-flex items-center text-xs font-semibold text-violet-700 dark:text-violet-400 hover:underline gap-1"
                  >
                    <span>Kelola Inventaris</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Konten Tabel Low Stock */}
                {!data.low_stock_products || data.low_stock_products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 mb-3">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Semua Stok Aman</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Semua stok produk dalam kondisi aman dan melimpah di etalase toko.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {data.low_stock_products.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Thumbnail Foto Produk */}
                          <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border/80 bg-muted">
                            <img
                              src={item.image_url || FALLBACK_PRODUCT_IMAGE}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate max-w-[180px] sm:max-w-xs">
                              {item.name}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                              {formatRupiah(item.price)}
                            </p>
                          </div>
                        </div>

                        {/* Badge Status Sisa Stok */}
                        <div className="shrink-0 text-right">
                          {item.stock_quantity === 0 ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 text-[10px] font-extrabold tracking-wider px-2 py-0.5">
                              STOK HABIS (0)
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5">
                              STOK KRITIS (sisa {item.stock_quantity})
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 pt-4 mt-4 text-center">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs font-semibold text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-xl"
                >
                  <Link href="/admin/products">
                    <span>Lihat & Perbarui Seluruh Stok di Katalog Produk →</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Panel Kanan — Tabel 5 Produk Terlaris (top_selling_products) */}
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        5 Produk Terlaris
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Peringkat produk dengan penjualan unit tertinggi
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 text-[10px] font-bold"
                  >
                    TOP PERFORMER
                  </Badge>
                </div>

                {/* Konten Tabel Top Selling */}
                {!data.top_selling_products || data.top_selling_products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                      <Layers className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Belum Ada Data Penjualan</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Transaksi pesanan terbayar akan muncul di peringkat produk terlaris secara otomatis.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {data.top_selling_products.map((item, index) => {
                      const rank = index + 1;
                      return (
                        <div
                          key={item.product_id}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Peringkat Badge */}
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-xs ${
                                rank === 1
                                  ? "bg-amber-400 text-amber-950 ring-2 ring-amber-400/30"
                                  : rank === 2
                                  ? "bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                                  : rank === 3
                                  ? "bg-amber-700/70 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              #{rank}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate max-w-[180px] sm:max-w-xs">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Kontribusi:{" "}
                                <strong className="text-foreground font-semibold">
                                  {formatRupiah(item.total_revenue)}
                                </strong>
                              </p>
                            </div>
                          </div>

                          {/* Total Sold Unit */}
                          <div className="shrink-0 text-right">
                            <span className="text-xs font-black text-violet-700 dark:text-violet-400">
                              {item.total_sold} unit
                            </span>
                            <p className="text-[10px] text-muted-foreground">terjual</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 pt-4 mt-4 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Data diperbarui otomatis berdasarkan pesanan berstatus PAID, SHIPPED & COMPLETED
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
