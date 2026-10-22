'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  CreditCard,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Package,
  Store,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchAdminOrders,
  updateAdminOrderStatus,
  OrderResponse,
  OrderStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type StatusTab = "ALL" | OrderStatus;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Per-row Action Loading State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Format Currency in IDR
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Format Date in Indonesian Locale
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  // 1. Fetch Orders from Backend
  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchAdminOrders();
      setOrders(data);
      if (isRefresh) {
        toast.success("Daftar pesanan operasional berhasil dimuat ulang.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memuat daftar pesanan admin.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, [loadOrders]);

  // Tab Status Counts
  const statusCounts = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const paid = orders.filter((o) => o.status === "PAID").length;
    const shipped = orders.filter((o) => o.status === "SHIPPED").length;
    const completed = orders.filter((o) => o.status === "COMPLETED").length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    return { total, pending, paid, shipped, completed, cancelled };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Tab Filter
      if (activeTab !== "ALL" && order.status !== activeTab) {
        return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = order.id.toLowerCase().includes(q);
        const matchName = order.customer_name?.toLowerCase().includes(q);
        const matchEmail = order.customer_email?.toLowerCase().includes(q);
        const matchPhone = order.customer_phone?.toLowerCase().includes(q);

        if (!matchId && !matchName && !matchEmail && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // 2. FSM Status Transition Handler
  const handleUpdateStatus = async (
    orderId: string,
    targetStatus: "SHIPPED" | "COMPLETED" | "CANCELLED"
  ) => {
    setActionLoadingId(orderId);
    const toastId = toast.loading("Memperbarui status pesanan...");

    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, targetStatus);
      toast.dismiss(toastId);

      const statusLabels: Record<string, string> = {
        SHIPPED: "sedang dikirim (SHIPPED)",
        COMPLETED: "selesai (COMPLETED)",
        CANCELLED: "dibatalkan & stok direstock (CANCELLED)",
      };

      toast.success(
        `Pesanan #${orderId.slice(0, 8)} berhasil diubah menjadi ${
          statusLabels[targetStatus] || targetStatus
        }.`
      );

      // Update state secara lokal
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      );

      // Jika modal detail sedang terbuka untuk pesanan ini, sinkronkan data modal
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const msg =
        err instanceof Error ? err.message : "Gagal memperbarui status pesanan.";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy UUID to Clipboard
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("ID Pesanan disalin ke clipboard.");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Open Detail Modal
  const handleOpenDetail = (order: OrderResponse) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // Close Detail Modal
  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  };

  // Helper Render Status Badge
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
          >
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>Menunggu Pembayaran</span>
          </Badge>
        );
      case "PAID":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
          >
            <CreditCard className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span>Sudah Dibayar (Siap Dikirim)</span>
          </Badge>
        );
      case "SHIPPED":
        return (
          <Badge
            variant="outline"
            className="bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
          >
            <Truck className="h-3 w-3 text-violet-700 dark:text-violet-400" />
            <span>Sedang Dikirim</span>
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>Pesanan Selesai</span>
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
          >
            <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            <span>Dibatalkan</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-violet-700 transition-colors">
          Panel Admin
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Pemenuhan Pesanan</span>
      </div>

      {/* 2. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <Badge
              variant="outline"
              className="bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 text-[10px] font-bold"
            >
              ORDER FULFILLMENT & FSM
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Manajemen Operasional & Pemenuhan Pesanan (Order Fulfillment)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Kelola alur transisi siklus hidup pesanan (FSM) dari pembayaran, pengiriman paket ekspedisi, hingga konfirmasi selesai atau pembatalan aman.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrders(true)}
            disabled={isLoading || isRefreshing}
            className="rounded-xl border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 text-violet-700 dark:text-violet-400 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span>{isRefreshing ? "Memuat..." : "Muat Ulang"}</span>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex rounded-xl border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold"
          >
            <Link href="/" target="_blank">
              <Store className="h-4 w-4 mr-1.5 text-violet-700 dark:text-violet-400" />
              <span>Lihat Etalase</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Search Bar & Status Filter Tabs */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-2xl border border-border/70 shadow-xs">
        {/* Kolom Pencarian Real-Time */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari berdasarkan ID Pesanan, Nama Pelanggan, atau Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 rounded-xl text-xs h-10 border-border/80 bg-background focus-visible:ring-violet-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab Filter Status */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl text-xs overflow-x-auto">
          {/* Semua */}
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "ALL"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Semua</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground font-bold"
            >
              {statusCounts.total}
            </Badge>
          </button>

          {/* PENDING */}
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "PENDING"
                ? "bg-background text-amber-800 dark:text-amber-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            <span>Menunggu Pembayaran</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold"
            >
              {statusCounts.pending}
            </Badge>
          </button>

          {/* PAID */}
          <button
            onClick={() => setActiveTab("PAID")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "PAID"
                ? "bg-background text-blue-800 dark:text-blue-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-500" />
            <span>Perlu Dikirim</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold"
            >
              {statusCounts.paid}
            </Badge>
          </button>

          {/* SHIPPED */}
          <button
            onClick={() => setActiveTab("SHIPPED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "SHIPPED"
                ? "bg-background text-violet-800 dark:text-violet-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-violet-600" />
            <span>Dalam Pengiriman</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 font-bold"
            >
              {statusCounts.shipped}
            </Badge>
          </button>

          {/* COMPLETED */}
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "COMPLETED"
                ? "bg-background text-emerald-800 dark:text-emerald-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Selesai</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
            >
              {statusCounts.completed}
            </Badge>
          </button>

          {/* CANCELLED */}
          <button
            onClick={() => setActiveTab("CANCELLED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "CANCELLED"
                ? "bg-background text-rose-800 dark:text-rose-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-rose-500" />
            <span>Dibatalkan</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
            >
              {statusCounts.cancelled}
            </Badge>
          </button>
        </div>
      </div>

      {/* 4. Error Alert View */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadOrders(true)}
            className="rounded-xl border-destructive/30 hover:bg-destructive/20 text-xs shrink-0"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* 5. Tabel Operasional Pesanan */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[20%]">ID & Waktu Pesanan</th>
                <th className="py-3.5 px-4 w-[25%]">Pelanggan & Tipe</th>
                <th className="py-3.5 px-4 w-[18%]">Ringkasan Item & Total</th>
                <th className="py-3.5 px-4 w-[17%]">Status Saat Ini</th>
                <th className="py-3.5 px-4 w-[20%] text-right">Aksi Pemenuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-28" />
                        <div className="h-3 bg-muted rounded-md w-36" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-32" />
                        <div className="h-3 bg-muted rounded-md w-40" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-24" />
                        <div className="h-3 bg-muted rounded-md w-16" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-muted rounded-full w-28" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-8 bg-muted rounded-xl w-32 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                      <ShoppingBag className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="font-bold text-sm text-foreground">
                      Tidak ada pesanan yang sesuai
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? `Tidak ditemukan pesanan dengan kata kunci "${searchQuery}". Coba kata kunci ID atau nama lain.`
                        : activeTab !== "ALL"
                        ? `Belum ada pesanan dengan status ${activeTab} saat ini.`
                        : "Belum ada pesanan yang masuk dari pelanggan."}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="mt-4 rounded-xl text-xs"
                      >
                        Reset Pencarian
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                // Data Rows
                filteredOrders.map((order) => {
                  const isActionLoading = actionLoadingId === order.id;
                  const totalItems = order.items.reduce(
                    (sum, it) => sum + it.quantity,
                    0
                  );
                  const isMember = order.user_id !== null;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Kolom 1: ID & Waktu Pesanan */}
                      <td className="py-4 px-4 align-middle">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground text-xs sm:text-sm">
                              #{order.id.slice(0, 8)}
                            </span>
                            <button
                              onClick={() => handleCopyId(order.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                              title="Salin UUID lengkap"
                            >
                              {copiedId === order.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-muted-foreground/70" />
                            <span>{formatDateTime(order.created_at)} WIB</span>
                          </p>
                        </div>
                      </td>

                      {/* Kolom 2: Pelanggan & Tipe Checkout */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                              {order.customer_name}
                            </span>
                            {isMember ? (
                              <Badge
                                variant="outline"
                                className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 text-[9px] font-bold px-1.5 py-0"
                              >
                                MEMBER
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-bold px-1.5 py-0"
                              >
                                GUEST
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {order.customer_email}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {order.customer_phone}
                          </p>
                        </div>
                      </td>

                      {/* Kolom 3: Ringkasan Item & Total */}
                      <td className="py-4 px-4 align-middle">
                        <div>
                          <span className="font-bold text-foreground text-xs sm:text-sm block">
                            {formatRupiah(order.total_amount)}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Package className="h-3 w-3 text-muted-foreground/70" />
                            <span>{totalItems} item produk</span>
                          </span>
                        </div>
                      </td>

                      {/* Kolom 4: Status Saat Ini */}
                      <td className="py-4 px-4 align-middle">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* Kolom 5: Aksi Pemenuhan (FSM) */}
                      <td className="py-4 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* FSM: PAID -> SHIPPED */}
                          {order.status === "PAID" && (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(order.id, "SHIPPED")
                              }
                              className="h-8 px-2.5 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold shadow-xs"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Truck className="h-3.5 w-3.5 mr-1" />
                                  <span>Kirim Barang</span>
                                </>
                              )}
                            </Button>
                          )}

                          {/* FSM: SHIPPED -> COMPLETED */}
                          {order.status === "SHIPPED" && (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(order.id, "COMPLETED")
                              }
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  <span>Selesaikan</span>
                                </>
                              )}
                            </Button>
                          )}

                          {/* FSM: PENDING -> CANCELLED */}
                          {order.status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() =>
                                handleUpdateStatus(order.id, "CANCELLED")
                              }
                              className="h-8 px-2.5 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  <span>Batalkan & Restock</span>
                                </>
                              )}
                            </Button>
                          )}

                          {/* Tombol Detail Modal */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(order)}
                            className="h-8 px-2.5 rounded-lg border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span>Detail</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          6. Modal Rincian Pesanan Pelanggan (Order Detail Modal)
          ========================================================================= */}
      {isDetailModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={handleCloseDetail}
        >
          <div
            className="relative w-full max-w-2xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 p-5 bg-card">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                    Rincian Lengkap Pesanan
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-foreground font-mono">
                    #{selectedOrder.id}
                  </h2>
                  <button
                    onClick={() => handleCopyId(selectedOrder.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                    title="Salin UUID"
                  >
                    {copiedId === selectedOrder.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {renderStatusBadge(selectedOrder.status)}
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="h-8 w-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[72vh] overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Waktu & Referensi Gateway */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-muted/30 border border-border/70 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-violet-700" />
                  <span>
                    Dibuat:{" "}
                    <strong className="text-foreground">
                      {formatDateTime(selectedOrder.created_at)} WIB
                    </strong>
                  </span>
                </div>
                {selectedOrder.payment_gateway_ref && (
                  <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Ref: {selectedOrder.payment_gateway_ref}</span>
                  </div>
                )}
              </div>

              {/* Data Pelanggan & Alamat Pengiriman */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-violet-700" />
                  <span>Informasi Pemesan & Pengiriman</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border/80 bg-card">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground block">
                      Nama Lengkap
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                      {selectedOrder.customer_name}
                    </span>
                    <div className="pt-1">
                      {selectedOrder.user_id ? (
                        <Badge
                          variant="outline"
                          className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] font-bold"
                        >
                          Akun Member Terdaftar
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] font-bold"
                        >
                          Checkout Tamu (Guest)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground block">
                      Kontak
                    </span>
                    <span className="text-xs text-foreground block">
                      {selectedOrder.customer_email}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono block">
                      {selectedOrder.customer_phone}
                    </span>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-violet-700 shrink-0" />
                      <span>Alamat Tujuan Pengiriman</span>
                    </span>
                    <p className="text-xs font-medium text-foreground bg-muted/20 p-2.5 rounded-lg border border-border/60">
                      {selectedOrder.shipping_address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Daftar Item Pesanan */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-violet-700" />
                  <span>
                    Daftar Produk yang Dibeli ({selectedOrder.items.length} jenis)
                  </span>
                </h3>

                <div className="rounded-xl border border-border/80 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/70 text-[10px] uppercase font-bold text-muted-foreground">
                        <th className="p-3">Produk</th>
                        <th className="p-3 text-center">Jumlah</th>
                        <th className="p-3 text-right">Harga Satuan</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {selectedOrder.items.map((item, idx) => {
                        const subtotal = item.quantity * item.price_at_purchase;
                        return (
                          <tr key={item.id || `item-${idx}`}>
                            <td className="p-3 font-semibold text-foreground">
                              {item.product_name || `Produk ID: ${item.product_id.slice(0, 8)}`}
                            </td>
                            <td className="p-3 text-center font-bold">
                              {item.quantity}x
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {formatRupiah(item.price_at_purchase)}
                            </td>
                            <td className="p-3 text-right font-bold text-foreground">
                              {formatRupiah(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border font-bold">
                        <td colSpan={3} className="p-3 text-right text-xs">
                          Total Pembayaran:
                        </td>
                        <td className="p-3 text-right text-sm text-violet-700 dark:text-violet-400">
                          {formatRupiah(selectedOrder.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer (Aksi Cepat Transisi Status) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/70 p-4 bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Status saat ini:{" "}
                <strong className="text-foreground">{selectedOrder.status}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDetail}
                  className="rounded-xl text-xs font-semibold h-9 px-4"
                >
                  Tutup
                </Button>

                {selectedOrder.status === "PAID" && (
                  <Button
                    size="sm"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, "SHIPPED")
                    }
                    className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold h-9 px-4 shadow-xs"
                  >
                    {actionLoadingId === selectedOrder.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Truck className="h-3.5 w-3.5 mr-1.5" />
                        <span>Kirim Barang (SHIPPED)</span>
                      </>
                    )}
                  </Button>
                )}

                {selectedOrder.status === "SHIPPED" && (
                  <Button
                    size="sm"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, "COMPLETED")
                    }
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-xs"
                  >
                    {actionLoadingId === selectedOrder.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        <span>Selesaikan Pesanan (COMPLETED)</span>
                      </>
                    )}
                  </Button>
                )}

                {selectedOrder.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, "CANCELLED")
                    }
                    className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold h-9 px-4"
                  >
                    {actionLoadingId === selectedOrder.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        <span>Batalkan & Restock</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
