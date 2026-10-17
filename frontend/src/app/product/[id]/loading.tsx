import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumbs Navigation Skeleton */}
          <div className="mb-6 flex items-center space-x-2 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-16" />
            <span className="text-muted-foreground/40">&gt;</span>
            <Skeleton className="h-4 w-16" />
            <span className="text-muted-foreground/40">&gt;</span>
            <Skeleton className="h-4 w-36" />
          </div>

          {/* Layout Split: 2 Kolom */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
            {/* Kolom Kiri: Gambar Produk Skeleton */}
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
              <div className="aspect-square w-full">
                <Skeleton className="h-full w-full rounded-none" />
              </div>
            </div>

            {/* Kolom Kanan: Detail Informasi Produk Skeleton */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-10 w-4/5" />
                </div>

                <Skeleton className="h-8 w-44" />

                <div className="border-t border-border/60 pt-4 space-y-2.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              {/* Tombol Tambah ke Keranjang Skeleton */}
              <div className="pt-4">
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
