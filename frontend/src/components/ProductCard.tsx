import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Product } from "@/types/product";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <Link className="group block h-full" href={`/product/${product.id}`}>
      <Card className="flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-0 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-primary/60 hover:-translate-y-1">
        {/* Bagian Atas (Header) */}
        <CardHeader className="p-0 overflow-hidden">
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                product.image_url ||
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"
              }
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </CardHeader>

        {/* Bagian Tengah (Content) */}
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>
            <Badge
              variant={product.stock_quantity > 0 ? "secondary" : "destructive"}
              className="shrink-0 text-xs font-normal"
            >
              {product.stock_quantity > 0 ? `Stok: ${product.stock_quantity}` : "Habis"}
            </Badge>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
        </CardContent>

        {/* Bagian Bawah (Footer) */}
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <span className="text-xl font-black text-primary">
            {formattedPrice}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-sm">
            Beli Sekarang <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default ProductCard;
