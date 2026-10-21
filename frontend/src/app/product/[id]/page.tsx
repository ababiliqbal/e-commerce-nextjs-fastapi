import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { Product, ProductImage, getPrimaryProductImage } from "@/types/product";
import { getServerApiUrl } from "@/lib/api";

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

  let product: Product | null = null;

  try {
    const apiUrl = getServerApiUrl();

    // Coba ambil detail produk spesifik (dengan eager-loaded images)
    const singleRes = await fetch(`${apiUrl}/api/v1/products/${id}`, {
      cache: "no-store",
    });

    if (singleRes.ok) {
      product = await singleRes.json();
    } else {
      // Fallback: ambil semua produk lalu cari berdasarkan id
      const allRes = await fetch(`${apiUrl}/api/v1/products`, {
        cache: "no-store",
      });
      if (allRes.ok) {
        const products: Product[] = await allRes.json();
        product = products.find((p) => p.id === id) || null;
      }
    }
  } catch (error) {
    console.error("Gagal mengambil data produk:", error);
  }

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

  // Urutkan product.images dengan memprioritaskan is_primary lalu display_order ascending.
  // Jika product.images kosong, buat array 1 elemen dari [getPrimaryProductImage(product)].
  const galleryImages: ProductImage[] =
    product.images && product.images.length > 0
      ? [...product.images].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.display_order ?? 0) - (b.display_order ?? 0);
        })
      : [
          {
            id: `primary-${product.id}`,
            image_url: getPrimaryProductImage(product),
            is_primary: true,
            display_order: 0,
          },
        ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Navigasi Struktural Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
            >
              Beranda
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            <Link
              href="/"
              className="font-medium transition-colors hover:text-foreground"
            >
              Katalog
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            <span
              className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-md"
              aria-current="page"
            >
              {product.name}
            </span>
          </nav>

          {/* Layout Split: 2 Kolom di md ke atas, 1 Kolom di mobile */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
            {/* Kolom Kiri: Galeri Gambar Interaktif */}
            <div>
              <ProductImageGallery
                images={galleryImages}
                fallbackImageUrl={product.image_url}
                productName={product.name}
              />
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

                <div className="text-2xl font-bold text-violet-700 dark:text-violet-400 sm:text-3xl">
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
