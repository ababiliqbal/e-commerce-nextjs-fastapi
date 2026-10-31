'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  ShoppingBag,
  Package,
  Calendar,
  MapPin,
  User as UserIcon,
  ChevronRight,
  Truck,
  Copy,
  Check,
  RefreshCw,
  Scale,
  ShieldCheck,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PayButton } from "@/components/PayButton";
import { Product, getPrimaryProductImage, FALLBACK_PRODUCT_IMAGE } from "@/types/product";
import {
  apiFetch,
  getOrderTracking,
  formatWeight,
  OrderResponse,
  ShipmentTrackingResponseDTO,
} from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const { user, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Tracking State (V2.0.0)
  const [trackingData, setTrackingData] = useState<ShipmentTrackingResponseDTO | null>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // 1. Fetch Detail Pesanan
  useEffect(() => {
    if (!id || !mounted) return;

    let isSubscribed = true;

    async function fetchOrderDetail() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const [orderRes, productsRes] = await Promise.all([
          apiFetch(`/api/v1/orders/${id}`, { headers }),
          apiFetch("/api/v1/products"),
        ]);

        if (!isSubscribed) return;

        // Proteksi 403 Forbidden: Pesanan milik pengguna lain
        if (orderRes.status === 403) {
          if (user) {
            toast.error("Akses ditolak: Pesanan ini milik akun pengguna lain.");
            router.replace("/orders/history");
            return;
          }
        }

        if (orderRes.status === 404) {
          setOrder(null);
          setIsLoading(false);
          return;
        }

        if (!orderRes.ok) {
          throw new Error("Gagal mengambil detail pesanan.");
        }

        const orderData: OrderResponse = await orderRes.json();
        setOrder(orderData);

        if (productsRes.ok) {
          const productsData: Product[] = await productsRes.json();
          const pMap = new Map<string, Product>();
          productsData.forEach((p) => pMap.set(p.id, p));
          setProductsMap(pMap);
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat rincian pesanan.";
        setErrorMessage(msg);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchOrderDetail();

    return () => {
      isSubscribed = false;
    };
  }, [id, mounted, user, accessToken, router]);

  // 2. Fetch Tracking Data Manifes
  const loadTracking = useCallback(async (orderId: string, showToast = false) => {
    setIsLoadingTracking(true);
    setTrackingError(null);

    try {
      const data = await getOrderTracking(orderId);
      setTrackingData(data);
      if (showToast) {
        toast.success("Riwayat pelacakan paket berhasil diperbarui.");
      }
    } catch (err: unknown) {
      console.error("Gagal melacak pesanan:", err);
      const msg =
        err instanceof Error ? err.message : "Gagal memuat status pelacakan paket.";
      setTrackingError(msg);
      if (showToast) {
        toast.error(msg);
      }
    } finally {
      setIsLoadingTracking(false);
    }
  }, []);

  useEffect(() => {
    if (order?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTracking(order.id);
    }
  }, [order?.id, loadTracking]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const handleCopyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    setCopiedTracking(true);
    toast.success("Nomor resi berhasil disalin ke clipboard!");
    setTimeout(() => {
      setCopiedTracking(false);
    }, 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-8 sm:py-10">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs Navigasi */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground"
          >
            <Link
              href="/"
              className="font-medium hover:text-foreground transition-colors"
            >
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {user ? (
              <>
                <Link
                  href="/orders/history"
                  className="font-medium hover:text-foreground transition-colors"
                >
                  Riwayat Pesanan
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              </>
            ) : null}
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              Pesanan #{id ? id.slice(0, 8) : "..."}
            </span>
          </nav>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {errorMessage}
            </div>
          )}

          {/* Skeleton Loader */}
          {isLoading ? (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                <Skeleton className="h-8 w-64 mx-auto rounded-lg" />
                <Skeleton className="h-4 w-96 mx-auto rounded-lg" />
              </div>
              <Card className="border border-border/80 shadow-xs rounded-2xl p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              </Card>
            </div>
          ) : !order ? (
            /* 404 Pesanan Tidak Ditemukan */
            <Card className="border border-border/80 shadow-xs rounded-2xl p-8 sm:p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Package className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold">
                Pesanan Tidak Ditemukan
              </CardTitle>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
                Pesanan dengan ID &quot;{id}&quot; tidak dapat ditemukan di sistem kami.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {user && (
                  <Button asChild variant="outline" className="rounded-xl cursor-pointer">
                    <Link href="/orders/history">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Riwayat Pesanan
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  className="bg-violet-700 hover:bg-violet-800 text-white rounded-xl cursor-pointer"
                >
                  <Link href="/">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Kembali ke Beranda
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            /* Konten Rincian Pesanan & Tracking V2.0.0 */
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header Status & Hero Card */}
              <div className="text-center space-y-3">
                {order.status === "PAID" && (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 ring-1 ring-blue-500/20">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Pembayaran Berhasil!
                      </h1>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                        Terima kasih atas pesanan Anda. Kami telah menerima pembayaran dan pesanan sedang dikemas untuk diserahkan ke kurir ekspedisi.
                      </p>
                    </div>
                  </>
                )}

                {order.status === "SHIPPED" && (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 ring-1 ring-violet-500/20">
                      <Truck className="h-10 w-10" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Paket Sedang Dalam Pengiriman!
                      </h1>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                        Paket Anda telah diserahkan kepada kurir ekspedisi dan saat ini sedang menuju alamat tujuan Anda.
                      </p>
                    </div>
                  </>
                )}

                {order.status === "COMPLETED" && (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Pesanan Selesai!
                      </h1>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                        Paket telah sukses diterima oleh pelanggan. Terima kasih telah berbelanja kebutuhan teknologi di Amba Shop!
                      </p>
                    </div>
                  </>
                )}

                {order.status === "PENDING" && (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 ring-1 ring-amber-500/20">
                      <Clock className="h-10 w-10" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Menunggu Pembayaran
                      </h1>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                        Silakan selesaikan pembayaran tagihan Midtrans Anda agar pesanan dapat segera diproses ke gudang dan dikirimkan.
                      </p>
                    </div>
                  </>
                )}

                {order.status === "CANCELLED" && (
                  <>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive dark:bg-destructive/20 ring-1 ring-destructive/20">
                      <XCircle className="h-10 w-10" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Pesanan Dibatalkan
                      </h1>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                        Pesanan ini telah dibatalkan atau waktu pembayaran telah kedaluwarsa.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* ================================================================= */}
              {/* 1. KARTU INFORMASI PENGIRIMAN & NOMOR RESI (V2.0.0) */}
              {/* ================================================================= */}
              <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Truck className="h-4 w-4 text-violet-700" />
                      <span>Informasi Ekspedisi & Pengiriman</span>
                    </CardTitle>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-extrabold text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800 text-xs px-2.5 py-0.5">
                        {(order.courier_code || "JNE").toUpperCase()} - {order.courier_service || "REG"}
                      </Badge>
                      {order.shipping_etd && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          Estimasi: {order.shipping_etd} hari
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Bagian Nomor Resi (Airwaybill) Highlight */}
                  <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Nomor Resi Pengiriman (Airwaybill)
                      </span>
                      {order.tracking_number ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-base sm:text-lg font-black text-violet-900 dark:text-violet-200 tracking-wider">
                            {order.tracking_number}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-0.5">
                          Nomor resi akan diterbitkan saat paket diserahkan ke kurir ekspedisi.
                        </p>
                      )}
                    </div>

                    {order.tracking_number && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCopyTrackingNumber(order.tracking_number!)}
                        className="bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-xl text-xs h-9 px-3.5 shadow-xs cursor-pointer shrink-0"
                      >
                        {copiedTracking ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Salin Nomor Resi
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Rincian Penerima, Alamat & Berat */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-1">
                      <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                        <UserIcon className="w-3.5 h-3.5 text-violet-700" />
                        Penerima Paket:
                      </p>
                      <p className="font-bold text-foreground text-sm">
                        {order.customer_name}
                      </p>
                      <p className="text-muted-foreground font-mono">
                        {order.customer_phone} ({order.customer_email})
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                        <Scale className="w-3.5 h-3.5 text-violet-700" />
                        Total Berat Paket:
                      </p>
                      <p className="font-bold text-foreground">
                        {formatWeight(order.shipping_weight_grams || 1000)}
                      </p>
                      <p className="text-muted-foreground">
                        Biaya Ongkir: {formatPrice(order.shipping_cost || 0)}
                      </p>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-border/60">
                      <p className="text-muted-foreground flex items-center gap-1 font-semibold mb-1">
                        <MapPin className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                        Alamat Tujuan Pengiriman:
                      </p>
                      <p className="font-medium text-foreground bg-muted/20 p-2.5 rounded-lg border border-border/60">
                        {order.shipping_address},{" "}
                        {order.shipping_city_name || ""} {order.shipping_province || ""}{" "}
                        {order.shipping_postal_code || ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ================================================================= */}
              {/* 2. INTERACTIVE SHIPMENT TRACKING TIMELINE (V2.0.0) */}
              {/* ================================================================= */}
              <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20 py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-700" />
                    <span>Riwayat Perjalanan Paket (Tracking Timeline)</span>
                  </CardTitle>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => loadTracking(order.id, true)}
                    disabled={isLoadingTracking}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1.5 ${
                        isLoadingTracking ? "animate-spin" : ""
                      }`}
                    />
                    <span>Segarkan Status</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-6">
                  {isLoadingTracking ? (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    </div>
                  ) : trackingError ? (
                    <div className="p-4 rounded-xl border border-border text-center text-xs text-muted-foreground">
                      <p>{trackingError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadTracking(order.id, true)}
                        className="mt-2 text-xs rounded-lg"
                      >
                        Coba Lagi
                      </Button>
                    </div>
                  ) : trackingData?.manifest && trackingData.manifest.length > 0 ? (
                    <div className="relative pl-2 sm:pl-4">
                      {/* Vertical Line Container */}
                      <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:h-full before:w-0.5 before:bg-violet-200 dark:before:bg-violet-900">
                        {trackingData.manifest.map((item, index) => {
                          const isCurrent = item.is_current;

                          return (
                            <div key={index} className="relative flex items-start gap-4">
                              {/* Step Node Circle */}
                              <div className="relative z-10 shrink-0">
                                {isCurrent ? (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-700 text-white ring-4 ring-violet-200 dark:ring-violet-900 shadow-md">
                                    <CircleDot className="h-3.5 w-3.5 animate-pulse" />
                                  </div>
                                ) : (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>

                              {/* Step Content */}
                              <div className="flex-1 space-y-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <h4
                                    className={`text-xs sm:text-sm font-bold ${
                                      isCurrent
                                        ? "text-violet-700 dark:text-violet-300 font-extrabold"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {item.status_title}
                                  </h4>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {item.timestamp}
                                  </span>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {item.description}
                                </p>

                                {item.city && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/50 mt-0.5">
                                    <MapPin className="h-2.5 w-2.5 text-violet-700" />
                                    <span>{item.city}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">
                        Belum Ada Riwayat Perjalanan
                      </p>
                      <p className="mt-1 max-w-sm mx-auto">
                        {order.status === "PENDING"
                          ? "Pesanan masih menunggu pembayaran sebelum diproses ke kurir."
                          : order.status === "PAID"
                          ? "Pesanan Anda sedang dipersiapkan dan dikemas di gudang kami."
                          : "Status manifes pengiriman akan diperbarui otomatis saat kurir bergerak."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ================================================================= */}
              {/* 3. RINCIAN ITEM & INVOICE BREAKDOWN (V2.0.0) */}
              {/* ================================================================= */}
              <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-violet-700" />
                        <span>Daftar Produk yang Dipesan</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Dibuat pada: {formatDate(order.created_at)}</span>
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                      <ShieldCheck className="h-4 w-4 text-violet-700" />
                      <span>Tagihan Resmi Amba Shop</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                  {/* Daftar Item Pesanan */}
                  <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/10">
                    {order.items.map((item, index) => {
                      const product = productsMap.get(item.product_id);
                      const primaryImage =
                        item.product_image ||
                        (product ? getPrimaryProductImage(product) : null) ||
                        FALLBACK_PRODUCT_IMAGE;
                      const productName =
                        item.product_name ||
                        product?.name ||
                        `Produk #${item.product_id.slice(0, 8)}`;
                      const subtotal = item.price_at_purchase * item.quantity;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3.5 gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={primaryImage}
                                alt={productName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    FALLBACK_PRODUCT_IMAGE;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {productName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.quantity} x {formatPrice(item.price_at_purchase)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">
                              {formatPrice(subtotal)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rincian Tagihan Transparan (Invoice Breakdown) */}
                  <div className="space-y-2 border-t border-border/70 pt-4 text-xs sm:text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal Harga Barang ({order.items.reduce((s, it) => s + it.quantity, 0)} pcs)</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(
                          order.total_amount - (order.shipping_cost || 0)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Biaya Pengiriman ({(order.courier_code || "JNE").toUpperCase()} - {order.courier_service || "REG"})
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(order.shipping_cost || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/70 pt-3">
                      <span className="text-sm sm:text-base font-bold text-foreground">
                        Total Pembayaran
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-violet-700 dark:text-violet-400">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Midtrans Snap PayButton jika status PENDING */}
                  {order.status === "PENDING" && order.payment_gateway_ref && (
                    <div className="border-t border-border/60 pt-5 space-y-3">
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-center">
                        <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300">
                          Pesanan Anda belum dibayar. Klik tombol di bawah untuk menyelesaikan pembayaran via Midtrans Snap.
                        </p>
                      </div>
                      <PayButton snapToken={order.payment_gateway_ref} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tombol Aksi Bawah */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {user ? (
                  <Button asChild variant="outline" className="rounded-xl cursor-pointer">
                    <Link href="/orders/history">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Kembali ke Riwayat Pesanan
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-xl cursor-pointer">
                    <Link href="/">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Lanjut Belanja di Toko
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
