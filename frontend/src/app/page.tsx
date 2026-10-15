import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/types/product";
import { getServerApiUrl } from "@/lib/api";

export default async function Home() {
  let products: Product[] = [];

  try {
    const apiUrl = getServerApiUrl();
    const res = await fetch(`${apiUrl}/api/v1/products`, {
      cache: "no-store",
    });

    if (res.ok) {
      products = await res.json();
    }
  } catch (error) {
    console.error("Gagal mengambil data produk:", error);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Produk Unggulan
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Jelajahi koleksi produk berkualitas tinggi terbaik untuk kebutuhan harian Anda.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="rounded-lg border border-border/60 p-8 text-center text-muted-foreground">
              Tidak ada produk yang tersedia saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
