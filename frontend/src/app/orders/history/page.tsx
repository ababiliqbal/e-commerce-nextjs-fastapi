'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Package,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  Phone,
  User,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch, Product, getPrimaryProductImage } from "@/lib/api";

interface OrderItem {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
}

interface Order {
  id: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  payment_gateway_ref?: string | null;
  created_at: string;
  items: OrderItem[];
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Proteksi rute: jika unauthenticated, arahkan ke /login
  useEffect(() => {
    if (mounted && !user) {
      router.replace("/login");
    }
  }, [mounted, user, router]);

  // Fetch data pesanan milik pengguna
  useEffect(() => {
    if (!mounted || !user) return;

    let isSubscribed = true;

    async function loadOrdersAndProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [ordersRes, productsRes] = await Promise.all([
          apiFetch("/api/v1/orders/me"),
          apiFetch("/api/v1/products"),
        ]);

        if (!ordersRes.ok) {
          if (ordersRes.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error("Gagal mengambil riwayat pesanan.");
        }

        const ordersData: Order[] = await ordersRes.json();

        // Buat map produk untuk menampilkan gambar & nama item
        const pMap = new Map<string, Product>();
        if (productsRes.ok) {
          const productsData: Product[] = await productsRes.json();
          productsData.forEach((p) => pMap.set(p.id, p));
        }

        if (isSubscribed) {
          setOrders(ordersData);
          setProductsMap(pMap);
        }
      } catch (err) {
        if (isSubscribed) {
          setErrorMessage(
            err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memuat riwayat."
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadOrdersAndProducts();

    return () => {
      isSubscribed = false;
    };
  }, [mounted, user, router]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>PAID</span>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-destructive/10 text-destructive border border-destructive/30 gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>CANCELLED</span>
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>PENDING</span>
          </Badge>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header Halaman */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider mb-1">
              <Package className="w-4 h-4" />
              <span>Akun Pelanggan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Riwayat Pesanan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau status pembayaran dan histori seluruh transaksi belanja Anda di Amba Shop.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {errorMessage}
            </div>
          )}

          {/* Skeleton Loader Saat Memuat Data */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((idx) => (
                <Card key={idx} className="border border-border/80 shadow-xs rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-44 rounded-lg" />
                      <Skeleton className="h-4 w-32 rounded-lg" />
                    </div>
                    <Skeleton className="h-7 w-28 rounded-full" />
                  </div>
                  <div className="py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                      <div className="space-y-2 grow">
                        <Skeleton className="h-4 w-48 rounded-lg" />
                        <Skeleton className="h-3 w-28 rounded-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-border/60 gap-3">
                    <Skeleton className="h-4 w-40 rounded-lg" />
                    <Skeleton className="h-9 w-32 rounded-xl" />
                  </div>
                </Card>
              ))}
            </div>
          ) : orders.length === 0 ? (
            /* Empty State */
            <Card className="border border-border/80 shadow-xs rounded-2xl p-8 sm:p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700/10 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold">
                Belum Ada Riwayat Pesanan
              </CardTitle>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
                Anda belum pernah melakukan pemesanan. Jelajahi katalog pilihan kami dan lakukan transaksi pertama Anda sekarang!
              </p>
              <Button
                asChild
                className="bg-violet-700 hover:bg-violet-800 text-white rounded-xl h-11 px-6 font-semibold shadow-xs hover:shadow-violet-700/25 cursor-pointer"
              >
                <Link href="/" className="inline-flex items-center gap-2">
                  <span>Mulai Belanja</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </Card>
          ) : (
            /* Daftar Pesanan */
            <div className="space-y-5">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="border border-border/80 hover:border-violet-700/30 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden bg-card"
                >
                  {/* Card Header: ID Pesanan, Tanggal, & Badge Status */}
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md border border-border">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID Transaksi: <span className="font-mono">{order.id}</span>
                        </p>
                      </div>

                      {/* Badge Status (PENDING / PAID / CANCELLED) */}
                      <div>{renderStatusBadge(order.status)}</div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Daftar Item / Kuantitas */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Item Pesanan ({order.items.reduce((sum, item) => sum + item.quantity, 0)} produk)
                      </p>

                      <div className="divide-y divide-border/60">
                        {order.items.map((item, idx) => {
                          const product = productsMap.get(item.product_id);
                          const primaryImage = product
                            ? getPrimaryProductImage(product)
                            : null;

                          return (
                            <div
                              key={idx}
                              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Thumbnail Produk */}
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/60">
                                  {primaryImage ? (
                                    <Image
                                      src={primaryImage}
                                      alt={product?.name || "Produk"}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>

                                {/* Detail Item */}
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {product?.name || `Produk #${item.product_id.slice(0, 8)}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} x {formatPrice(item.price_at_purchase)}
                                  </p>
                                </div>
                              </div>

                              {/* Subtotal Item */}
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-foreground">
                                  {formatPrice(item.quantity * item.price_at_purchase)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Informasi Pengiriman */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <MapPin className="w-3.5 h-3.5 text-violet-700 dark:text-violet-400" />
                        <span>Alamat Pengiriman:</span>
                      </div>
                      <p className="text-muted-foreground pl-5 leading-relaxed">
                        {order.shipping_address}
                      </p>
                      <div className="flex items-center gap-4 pl-5 pt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {order.customer_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {order.customer_phone}
                        </span>
                      </div>
                    </div>

                    {/* Footer Kartu: Total Harga & Aksi */}
                    <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Total Pembayaran:</span>
                        <p className="text-lg font-black text-violet-700 dark:text-violet-400">
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 text-xs font-semibold hover:bg-violet-700/10 hover:text-violet-700 transition-colors cursor-pointer"
                        >
                          <Link href={`/order-success/${order.id}`}>
                            <span>Detail Pesanan</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
