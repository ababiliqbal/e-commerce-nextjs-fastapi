'use client';

import React, { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/useAuthStore";
import { resolveApiUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Ringkasan Analitik",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Manajemen Produk",
    href: "/admin/products",
    icon: Package,
    exact: false,
  },
  {
    name: "Manajemen Pesanan",
    href: "/admin/orders",
    icon: ShoppingBag,
    exact: false,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, clearAuth } = useAuthStore();

  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Tangani Zustand Hydration dengan aman
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. RBAC Guard & Authorization Check setelah mounted
  useEffect(() => {
    if (!isMounted) return;

    if (!user || !accessToken) {
      toast.warning("Silakan masuk menggunakan akun Administrator");
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      toast.error("Akses ditolak: Anda tidak memiliki izin Administrator (403)");
      router.replace("/");
      return;
    }
  }, [isMounted, user, accessToken, router]);

  // Handle Logout dari sidebar admin
  const handleLogout = async () => {
    try {
      const logoutUrl = resolveApiUrl("/api/v1/auth/logout");
      await fetch(logoutUrl, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Abaikan jika network error saat logout, tetap bersihkan auth client
    } finally {
      clearAuth();
      toast.success("Berhasil keluar dari sesi Administrator.");
      router.push("/");
    }
  };

  // Tutup menu mobile jika route berganti
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 3. Tampilkan Skeleton Loader selama hydration / validasi akses
  if (!isMounted || !user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Skeleton Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border/70 bg-card p-6 gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-700/20 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-3 pt-6">
            <div className="h-10 w-full bg-violet-700/10 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          <div className="mt-auto border-t border-border/70 pt-4 space-y-3">
            <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </aside>

        {/* Skeleton Content Area */}
        <main className="flex-1 p-6 md:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-9 w-32 bg-violet-700/20 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl border border-border/60 bg-card p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-8 w-36 bg-violet-700/15 rounded" />
              </div>
            ))}
          </div>
          <div className="h-80 w-full rounded-2xl border border-border/60 bg-card animate-pulse" />
        </main>
      </div>
    );
  }

  const isNavActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const initials = user.full_name
    ? user.full_name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  // Konten Sidebar Navigasi yang dapat dipakai ulang (Desktop & Drawer Mobile)
  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5">
      {/* Sisi Atas: Brand & Navigasi */}
      <div className="space-y-6">
        {/* Header Brand Sidebar */}
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white shadow-md shadow-violet-700/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                Amba Shop CMS
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant="outline"
                  className="bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-700 text-[9px] font-bold tracking-wider px-1.5 py-0 uppercase"
                >
                  INTERNAL ADMIN
                </Badge>
              </div>
            </div>
          </Link>
          {/* Tombol Tutup pada Drawer Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Tutup Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Navigasi Utama */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
            Menu Operasional
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  active
                    ? "bg-violet-700 text-white shadow-md shadow-violet-700/25"
                    : "text-muted-foreground hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                      active ? "text-white" : "text-violet-700 dark:text-violet-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {active && <ChevronRight className="h-4 w-4 opacity-80" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sisi Bawah: Info Profil Admin, Link Etalase, & Logout */}
      <div className="border-t border-border/70 pt-4 space-y-3">
        {/* Kartu Profil Admin Login */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-violet-700 to-purple-600 text-white font-bold text-xs shadow-xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">
              {user.full_name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>

        {/* Tombol Aksi Bawah */}
        <div className="space-y-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs font-semibold text-muted-foreground hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 dark:hover:text-violet-300 rounded-xl"
          >
            <Link href="/">
              <Store className="h-4 w-4 mr-2 text-violet-700 dark:text-violet-400" />
              <span>Lihat Etalase Toko</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Keluar (Logout)</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col md:flex-row text-foreground">
      {/* 1. Sidebar Kiri Tetap (Desktop w-64) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col fixed inset-y-0 left-0 bg-card border-r border-border/80 z-30 shadow-xs">
        {renderSidebarContent()}
      </aside>

      {/* 2. Topbar Navigasi Mobile (md:hidden) */}
      <header className="md:hidden sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-700 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-black text-sm text-foreground">Amba CMS</span>
          <Badge
            variant="outline"
            className="bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300 text-[8px] font-bold px-1.5 py-0"
          >
            ADMIN
          </Badge>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-card text-foreground hover:bg-muted"
          aria-label="Toggle Menu Admin"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* 3. Mobile Sidebar Drawer Overlay (md:hidden) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Menu */}
          <div className="relative w-72 max-w-[85vw] bg-card h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* 4. Area Konten Utama (Offset w-64 pada Desktop) */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
