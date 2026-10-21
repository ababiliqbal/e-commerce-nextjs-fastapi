'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Receipt,
  User as UserIcon,
  Package,
  MapPin,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { resolveApiUrl } from "@/lib/api";
import { ShippingProfileModal } from "@/components/ShippingProfileModal";

export function Navbar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalItems = useCartStore((state) => state.getTotalItems());
  const lastOrderId = useCartStore((state) => state.lastOrderId);

  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      const logoutUrl = resolveApiUrl("/api/v1/auth/logout");
      await fetch(logoutUrl, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Abaikan jika network error saat logout, tetap clear client auth
    } finally {
      clearAuth();
      setDropdownOpen(false);
      toast.success("Berhasil keluar dari akun.");
      router.push("/");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-violet-700 dark:text-violet-400 font-black text-2xl tracking-tight transition-transform group-hover:scale-105">
              Amba Shop
            </span>
          </Link>

          {/* Sisi Kanan: Action Buttons & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tombol Cek Pesanan Terakhir */}
            {mounted && lastOrderId && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden md:inline-flex cursor-pointer gap-2 text-xs sm:text-sm font-medium hover:bg-violet-700/10 hover:text-violet-700 transition-colors rounded-xl"
              >
                <Link href={`/order-success/${lastOrderId}`}>
                  <Receipt className="h-4 w-4" />
                  <span>Cek Pesanan</span>
                </Link>
              </Button>
            )}

            {/* Tombol Keranjang Belanja */}
            <Button
              asChild
              variant="outline"
              size="icon"
              className="relative cursor-pointer transition-transform active:scale-95 hover:bg-violet-700/10 hover:text-violet-700 transition-colors rounded-xl"
              aria-label="Keranjang Belanja"
            >
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {mounted && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-700 px-1 text-[11px] font-bold text-white shadow-xs animate-in zoom-in-75">
                    {totalItems}
                  </span>
                )}
              </Link>
            </Button>

            {/* Auth State Menu */}
            {mounted && (
              <>
                {user ? (
                  /* User Sudah Login -> Tampilkan Profile Menu Dropdown */
                  <div className="relative" ref={dropdownRef}>
                    <button
                      id="navbar-profile-button"
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-border/80 hover:border-violet-700/40 bg-card hover:bg-violet-700/5 transition-all text-left cursor-pointer group"
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                    >
                      {/* Avatar Inisial */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-violet-700 to-purple-600 text-white font-bold text-xs shadow-xs ring-1 ring-violet-700/20 group-hover:ring-violet-700/50 transition-all">
                        {getInitials(user.full_name)}
                      </div>

                      {/* Nama User */}
                      <span className="hidden sm:inline-block max-w-[130px] truncate text-xs sm:text-sm font-medium text-foreground">
                        {user.full_name}
                      </span>

                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                          dropdownOpen ? "rotate-180 text-violet-700" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Container */}
                    {dropdownOpen && (
                      <div
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="navbar-profile-button"
                        className="absolute right-0 mt-2 w-72 rounded-2xl border border-border/80 bg-card p-2 text-card-foreground shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Header Info User: Nama, Email, & Badge Role */}
                        <div className="px-3 py-2.5 border-b border-border/70">
                          <p className="text-sm font-bold text-foreground truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {user.email}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <Badge
                              className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 uppercase ${
                                user.role === "ADMIN"
                                  ? "bg-violet-700 text-white border-transparent"
                                  : "bg-violet-700/10 text-violet-700 dark:text-violet-300 border-violet-700/20"
                              }`}
                            >
                              {user.role}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              • Akun {user.auth_provider}
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1 space-y-0.5">
                          {/* Item: Profil Pengiriman */}
                          <button
                            id="menu-shipping-profile"
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              setIsShippingModalOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs sm:text-sm rounded-xl text-foreground hover:bg-violet-700/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors text-left cursor-pointer"
                          >
                            <MapPin className="h-4 w-4 shrink-0 text-violet-700 dark:text-violet-400" />
                            <div>
                              <p className="font-medium">Profil Pengiriman Saya</p>
                              <p className="text-[11px] text-muted-foreground">
                                Telepon & alamat checkout default
                              </p>
                            </div>
                          </button>

                          {/* Item: Riwayat Pesanan */}
                          <Link
                            id="menu-orders-history"
                            role="menuitem"
                            href="/orders/history"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs sm:text-sm rounded-xl text-foreground hover:bg-violet-700/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                          >
                            <Package className="h-4 w-4 shrink-0 text-violet-700 dark:text-violet-400" />
                            <div>
                              <p className="font-medium">Riwayat Pesanan</p>
                              <p className="text-[11px] text-muted-foreground">
                                Lihat status & transaksi belanja
                              </p>
                            </div>
                          </Link>
                        </div>

                        {/* Separator & Logout */}
                        <div className="pt-1 mt-1 border-t border-border/70">
                          <button
                            id="menu-logout-button"
                            role="menuitem"
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs sm:text-sm rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer font-medium"
                          >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span>Keluar (Logout)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* User Belum Login -> Tombol Masuk & Daftar */
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      id="navbar-login-btn"
                      asChild
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-xs sm:text-sm font-semibold rounded-xl text-foreground hover:bg-violet-700/10 hover:text-violet-700 transition-colors h-9 px-3"
                    >
                      <Link href="/login">
                        <UserIcon className="w-4 h-4 sm:hidden" />
                        <span>Masuk</span>
                      </Link>
                    </Button>

                    <Button
                      id="navbar-register-btn"
                      asChild
                      size="sm"
                      className="cursor-pointer text-xs sm:text-sm font-semibold rounded-xl bg-violet-700 hover:bg-violet-800 text-white shadow-xs hover:shadow-violet-700/20 active:scale-95 transition-all h-9 px-3 sm:px-4"
                    >
                      <Link href="/register">
                        <span>Daftar</span>
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modal Pengaturan Profil Pengiriman Default */}
      <ShippingProfileModal
        isOpen={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
      />
    </>
  );
}

export default Navbar;
