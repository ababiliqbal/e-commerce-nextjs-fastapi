import Link from "next/link";
import { Product } from "@/types/product";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-0 shadow-xs transition-all duration-300 hover:shadow-md">
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
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
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
        <p className="mt-1 text-lg font-bold text-primary">
          {formattedPrice}
        </p>
      </CardContent>

      {/* Bagian Bawah (Footer) */}
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full cursor-pointer font-medium" variant="default">
          <Link href={`/product/${product.id}`}>Lihat Detail</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ProductCard;
