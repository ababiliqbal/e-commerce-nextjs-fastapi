import React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
            Amba Shop
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="relative cursor-pointer transition-transform active:scale-95"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
