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
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900 via-purple-800 to-indigo-900 p-8 sm:p-10 mb-10 text-white shadow-lg">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-violet-200 backdrop-blur-sm mb-4 border border-white/10">
                ✨ Koleksi Produk Pilihan
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
                Temukan Produk Berkualitas dengan Transaksi Cepat & Aman
              </h1>
              <p className="mt-4 text-base sm:text-lg text-violet-100/90 leading-relaxed">
                Jelajahi berbagai pilihan produk unggulan kami. Dapatkan kemudahan pemesanan instan dan pembayaran digital terpercaya hari ini.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a
                  href="#katalog"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-100"
                >
                  Lihat Katalog Produk ↓
                </a>
              </div>
            </div>
          </section>

          <div id="katalog" className="mb-8 scroll-mt-20">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Produk Unggulan
            </h2>
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
