import Link from "next/link";
import { CheckCircle2, Clock, XCircle, ArrowLeft, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PayButton } from "@/components/PayButton";
import { Product } from "@/types/product";

interface OrderItem {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
}

interface OrderResponse {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_gateway_ref?: string | null;
  created_at: string;
  items: OrderItem[];
}

interface OrderSuccessPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderSuccessPage({
  params,
}: OrderSuccessPageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let order: OrderResponse | null = null;
  const productsMap = new Map<string, Product>();

  try {
    const [orderRes, productsRes] = await Promise.all([
      fetch(`http://127.0.0.1:8000/api/v1/orders/${id}`, {
        cache: "no-store",
      }),
      fetch("http://127.0.0.1:8000/api/v1/products", {
        cache: "no-store",
      }),
    ]);

    if (orderRes.ok) {
      order = await orderRes.json();
    }

    if (productsRes.ok) {
      const products: Product[] = await productsRes.json();
      products.forEach((p) => {
        productsMap.set(p.id, p);
      });
    }
  } catch (error) {
    console.error("Gagal mengambil detail pesanan:", error);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-foreground">
              Pesanan Tidak Ditemukan
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pesanan dengan ID &quot;{id}&quot; tidak dapat ditemukan di sistem kami.
            </p>
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link href="/" className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Katalog
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header Status */}
          <div className="text-center space-y-4 mb-8">
            {order.status === "PAID" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Pembayaran Berhasil!
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Terima kasih atas pesanan Anda. Kami telah menerima pembayaran dan pesanan akan segera diproses.
                  </p>
                </div>
              </>
            )}

            {order.status === "PENDING" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                  <Clock className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Pesanan Berhasil Dibuat!
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Silakan selesaikan pembayaran Anda sebelum waktu habis untuk mengonfirmasi pesanan.
                  </p>
                </div>
              </>
            )}

            {order.status === "CANCELLED" && (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20">
                  <XCircle className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Pesanan Dibatalkan
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Pesanan ini telah dibatalkan atau kedaluwarsa. Stok barang telah dikembalikan ke katalog.
                  </p>
                </div>
              </>
            )}

            {order.status !== "PAID" &&
              order.status !== "PENDING" &&
              order.status !== "CANCELLED" && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                      Status Pesanan: {order.status}
                    </h1>
                  </div>
                </>
              )}
          </div>

          {/* Kartu Rincian Pesanan */}
          <Card className="border-border/60 shadow-xs mb-8">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Rincian Pesanan
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {order.id}
                  </p>
                </div>
                <div>
                  {order.status === "PAID" && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold uppercase tracking-wider">
                      LUNAS (PAID)
                    </Badge>
                  )}
                  {order.status === "PENDING" && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/40 font-semibold uppercase tracking-wider"
                    >
                      Menunggu Pembayaran
                    </Badge>
                  )}
                  {order.status === "CANCELLED" && (
                    <Badge
                      variant="destructive"
                      className="font-semibold uppercase tracking-wider"
                    >
                      DIBATALKAN / KEDALUWARSA
                    </Badge>
                  )}
                  {order.status !== "PAID" &&
                    order.status !== "PENDING" &&
                    order.status !== "CANCELLED" && (
                      <Badge
                        variant="secondary"
                        className="font-semibold uppercase tracking-wider"
                      >
                        {order.status}
                      </Badge>
                    )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Informasi Pembeli */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-border/60 pb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nama Pemesan</p>
                  <p className="font-medium text-foreground">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Pemesan</p>
                  <p className="font-medium text-foreground">{order.customer_email}</p>
                </div>
              </div>

              {/* Daftar Item */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Item yang Dibeli
                </h3>
                <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20">
                  {order.items.map((item, index) => {
                    const product = productsMap.get(item.product_id);
                    const subtotal = item.price_at_purchase * item.quantity;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3.5 text-sm"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">
                            {product ? product.name : `Produk (${item.product_id.slice(0, 8)}...)`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} x {formatPrice(item.price_at_purchase)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
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
                <span className="text-base font-bold text-foreground">
                  Total Pembayaran
                </span>
                <span className="text-xl font-extrabold text-primary">
                  {formatPrice(order.total_amount)}
                </span>
              </div>

              {/* Midtrans Snap PayButton jika status PENDING */}
              {order.status === "PENDING" && order.payment_gateway_ref && (
                <div className="border-t border-border/60 pt-6 space-y-3">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Pesanan Anda belum dibayar. Klik tombol di bawah untuk menyelesaikan pembayaran via Midtrans Snap.
                    </p>
                  </div>
                  <PayButton snapToken={order.payment_gateway_ref} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tombol Aksi */}
          <div className="flex justify-center">
            <Button asChild size="lg" variant="outline" className="cursor-pointer">
              <Link href="/" className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Kembali ke Katalog
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
