import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Hero Section Skeleton */}
          <div className="relative overflow-hidden rounded-2xl bg-muted/60 p-8 sm:p-10 mb-10 shadow-sm border border-border/50 animate-pulse">
            <div className="max-w-2xl space-y-4">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-10 w-full sm:w-4/5" />
              <Skeleton className="h-5 w-full sm:w-3/5" />
              <Skeleton className="h-10 w-44 rounded-lg mt-4" />
            </div>
          </div>

          {/* Heading Skeleton */}
          <div className="mb-8 space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>

          {/* Product Grid Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-0 shadow-xs"
              >
                {/* Image Skeleton */}
                <div className="aspect-square w-full">
                  <Skeleton className="h-full w-full rounded-none" />
                </div>

                {/* Content Skeleton */}
                <div className="flex flex-1 flex-col gap-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                  </div>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>

                {/* Footer Skeleton */}
                <div className="flex items-center justify-between p-4 pt-0">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-7 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
