import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Product } from "@/types/product";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let products: Product[] = [];

  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/products", {
      cache: "no-store",
    });

    if (res.ok) {
      products = await res.json();
    }
  } catch (error) {
    console.error("Gagal mengambil data produk:", error);
  }

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Produk tidak ditemukan
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Produk dengan ID &quot;{id}&quot; tidak ditemukan dalam katalog kami.
            </p>
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link href="/" className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Tombol Kembali */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </div>

          {/* Layout Split: 2 Kolom di md ke atas, 1 Kolom di mobile */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
            {/* Kolom Kiri: Gambar Produk */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
              <div className="aspect-square w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    product.image_url ||
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Kolom Kanan: Detail Informasi Produk */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        product.stock_quantity > 0 ? "secondary" : "destructive"
                      }
                      className="text-xs"
                    >
                      {product.stock_quantity > 0
                        ? `Sisa Stok: ${product.stock_quantity}`
                        : "Stok Habis"}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    {product.name}
                  </h1>
                </div>

                <div className="text-2xl font-bold text-primary sm:text-3xl">
                  {formattedPrice}
                </div>

                <div className="border-t border-border/60 pt-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Deskripsi Lengkap
                  </h2>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Tombol Tambah ke Keranjang */}
              <div className="pt-4">
                <AddToCartButton product={product} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
