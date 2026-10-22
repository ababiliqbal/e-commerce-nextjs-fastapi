'use client';

import React, { useState, useEffect } from "react";
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
  Phone,
  User as UserIcon,
  ChevronRight,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PayButton } from "@/components/PayButton";
import { Product, getPrimaryProductImage } from "@/types/product";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface OrderItem {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
}

interface OrderDetail {
  id: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  status: string;
  payment_gateway_ref?: string | null;
  created_at: string;
  items: OrderItem[];
}

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
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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

        const orderData: OrderDetail = await orderRes.json();
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
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
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/orders/history">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Riwayat Pesanan
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  className="bg-violet-700 hover:bg-violet-800 text-white rounded-xl"
                >
                  <Link href="/">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Kembali ke Beranda
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            /* Konten Rincian Pesanan */
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header Status */}
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
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                        Terima kasih atas pesanan Anda. Kami telah menerima pembayaran dan pesanan sedang dipersiapkan untuk pengiriman.
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
                        Pesanan Sedang Dikirim!
                      </h1>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                        Paket Anda telah diserahkan ke kurir ekspedisi dan sedang dalam perjalanan menuju alamat tujuan.
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
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                        Paket telah sampai di alamat tujuan dan transaksi selesai. Terima kasih telah berbelanja di Amba Shop!
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
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                        Silakan selesaikan pembayaran Anda sebelum waktu habis untuk mengonfirmasi pesanan.
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
                      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                        Pesanan ini telah dibatalkan atau kedaluwarsa. Stok barang telah dikembalikan ke katalog.
                      </p>
                    </div>
                  </>
                )}

                {order.status !== "PAID" &&
                  order.status !== "SHIPPED" &&
                  order.status !== "COMPLETED" &&
                  order.status !== "PENDING" &&
                  order.status !== "CANCELLED" && (
                    <>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <Package className="h-10 w-10" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                          Status Pesanan: {order.status}
                        </h1>
                      </div>
                    </>
                  )}
              </div>

              {/* Kartu Rincian Pesanan */}
              <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                        <span>Rincian Pesanan</span>
                        <span className="font-mono text-xs font-normal text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div>
                      {order.status === "PAID" && (
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-semibold uppercase tracking-wider text-xs">
                          LUNAS (PAID)
                        </Badge>
                      )}
                      {order.status === "SHIPPED" && (
                        <Badge className="bg-violet-700 hover:bg-violet-700 text-white font-semibold uppercase tracking-wider text-xs flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          <span>SEDANG DIKIRIM (SHIPPED)</span>
                        </Badge>
                      )}
                      {order.status === "COMPLETED" && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold uppercase tracking-wider text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PESANAN SELESAI (COMPLETED)</span>
                        </Badge>
                      )}
                      {order.status === "PENDING" && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/40 font-semibold uppercase tracking-wider text-xs"
                        >
                          Menunggu Pembayaran
                        </Badge>
                      )}
                      {order.status === "CANCELLED" && (
                        <Badge
                          variant="destructive"
                          className="font-semibold uppercase tracking-wider text-xs"
                        >
                          DIBATALKAN
                        </Badge>
                      )}
                      {order.status !== "PAID" &&
                        order.status !== "SHIPPED" &&
                        order.status !== "COMPLETED" &&
                        order.status !== "PENDING" &&
                        order.status !== "CANCELLED" && (
                          <Badge variant="secondary" className="text-xs uppercase">
                            {order.status}
                          </Badge>
                        )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  {/* Info Pemesan & Pengiriman */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm border-b border-border/60 pb-5">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        Nama Penerima
                      </p>
                      <p className="font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        Nomor Telepon
                      </p>
                      <p className="font-medium text-foreground">{order.customer_phone}</p>
                      <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{order.shipping_address}</span>
                      </p>
                    </div>
                  </div>

                  {/* Daftar Item */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Item Pesanan ({order.items.reduce((sum, item) => sum + item.quantity, 0)} produk)
                    </h3>
                    <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/10">
                      {order.items.map((item, index) => {
                        const product = productsMap.get(item.product_id);
                        const primaryImage = product ? getPrimaryProductImage(product) : null;
                        const subtotal = item.price_at_purchase * item.quantity;

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3.5 gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                                {primaryImage ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={primaryImage}
                                    alt={product?.name || "Produk"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {product ? product.name : `Produk #${item.product_id.slice(0, 8)}`}
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
                  </div>

                  {/* Total Pembayaran */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <span className="text-sm sm:text-base font-bold text-foreground">
                      Total Pembayaran
                    </span>
                    <span className="text-lg sm:text-xl font-black text-violet-700 dark:text-violet-400">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>

                  {/* Midtrans Snap PayButton jika status PENDING */}
                  {order.status === "PENDING" && order.payment_gateway_ref && (
                    <div className="border-t border-border/60 pt-5 space-y-3">
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-center">
                        <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300">
                          Pesanan Anda belum dibayar. Klik tombol di bawah untuk menyelesaikan transaksi via Midtrans Snap.
                        </p>
                      </div>
                      <PayButton snapToken={order.payment_gateway_ref} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tombol Aksi */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {user ? (
                  <Button asChild variant="outline" className="rounded-xl cursor-pointer">
                    <Link href="/orders/history">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Riwayat Pesanan
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-xl cursor-pointer">
                    <Link href="/">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Lanjut Belanja
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
