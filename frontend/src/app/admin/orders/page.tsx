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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchAdminOrders,
  updateAdminOrderStatus,
  generateTrackingNumber,
  formatWeight,
  OrderResponse,
  OrderStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // Modal Input & Generate Resi (SHIPPED)
  const [shippingModalOrder, setShippingModalOrder] = useState<OrderResponse | null>(null);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState<boolean>(false);
  const [trackingInput, setTrackingInput] = useState<string>("");
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isSubmittingShipping, setIsSubmittingShipping] = useState<boolean>(false);

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
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "-";
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
        const matchTracking = order.tracking_number?.toLowerCase().includes(q);
        const matchCourier = order.courier_code?.toLowerCase().includes(q);

        if (
          !matchId &&
          !matchName &&
          !matchEmail &&
          !matchPhone &&
          !matchTracking &&
          !matchCourier
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // 2. FSM Status Transition Handler
  const handleUpdateStatus = async (
    orderId: string,
    targetStatus: "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED",
    trackingNumber?: string | null
  ) => {
    setActionLoadingId(orderId);
    const toastId = toast.loading("Memperbarui status pesanan...");

    try {
      const updatedOrder = await updateAdminOrderStatus(
        orderId,
        targetStatus,
        trackingNumber
      );
      toast.dismiss(toastId);

      const statusLabels: Record<string, string> = {
        PAID: "lunas (PAID)",
        SHIPPED: "sedang dikirim (SHIPPED)",
        COMPLETED: "selesai (COMPLETED)",
        CANCELLED: "dibatalkan & stok direstock (CANCELLED)",
      };

      toast.success(
        `Pesanan #${orderId.slice(0, 8)} berhasil diubah menjadi ${
          statusLabels[targetStatus] || targetStatus
        }.${
          targetStatus === "SHIPPED" && updatedOrder.tracking_number
            ? ` No. Resi: ${updatedOrder.tracking_number}`
            : ""
        }`
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

  // 3. Shipping Modal Handler (Kirim Barang / SHIPPED)
  const handleOpenShippingModal = (order: OrderResponse) => {
    setShippingModalOrder(order);
    // Jika belum ada resi, otomatis siapkan auto-generate atau resi yang sudah ada
    const initialTracking =
      order.tracking_number ||
      generateTrackingNumber(order.courier_code || "REG");
    setTrackingInput(initialTracking);
    setTrackingError(null);
    setIsShippingModalOpen(true);
  };

  const handleCloseShippingModal = () => {
    if (isSubmittingShipping) return;
    setIsShippingModalOpen(false);
    setShippingModalOrder(null);
    setTrackingInput("");
    setTrackingError(null);
  };

  const handleAutoGenerateClick = () => {
    if (!shippingModalOrder) return;
    const generated = generateTrackingNumber(
      shippingModalOrder.courier_code || "REG"
    );
    setTrackingInput(generated);
    setTrackingError(null);
    toast.info(`Nomor resi otomatis berhasil digenerate: ${generated}`);
  };

  const handleConfirmShipping = async () => {
    if (!shippingModalOrder) return;

    const cleanTracking = trackingInput.trim();
    if (!cleanTracking) {
      setTrackingError("Nomor resi pengiriman wajib diisi.");
      return;
    }
    if (cleanTracking.length < 5) {
      setTrackingError("Nomor resi minimal harus 5 karakter.");
      return;
    }
    if (/[<>]/.test(cleanTracking)) {
      setTrackingError("Karakter < dan > tidak diizinkan demi keamanan.");
      return;
    }

    setIsSubmittingShipping(true);
    try {
      await handleUpdateStatus(
        shippingModalOrder.id,
        "SHIPPED",
        cleanTracking
      );
      handleCloseShippingModal();
    } catch {
      // Error sudah ditangani di handleUpdateStatus
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  // Copy to Clipboard Helpers
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("ID Pesanan disalin ke clipboard.");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleCopyTracking = (trackingNum: string) => {
    navigator.clipboard.writeText(trackingNum);
    toast.success("Nomor resi berhasil disalin!");
  };

  // Open & Close Detail Modal
  const handleOpenDetail = (order: OrderResponse) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

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
            <Truck className="h-3 w-3 text-violet-600 dark:text-violet-400" />
            <span>Dalam Pengiriman</span>
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>Selesai (Pesanan Diterima)</span>
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
        <span className="font-semibold text-foreground">
          Operasional & Pemenuhan Pesanan (FSM V2)
        </span>
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
              Order Fulfillment Engine V2.0.0
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Daftar Pesanan & Manajemen Resi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Kelola siklus hidup pesanan (FSM), validasi nomor resi pengiriman kurir
            resmi, dan terbitkan status perjalanan logistik pelanggan secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOrders(true)}
            disabled={isRefreshing || isLoading}
            className="rounded-xl border-border/80 hover:bg-muted/60 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </Button>

          <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs font-semibold">
            <Link href="/" target="_blank">
              <Store className="h-3.5 w-3.5 mr-1.5 text-violet-700" />
              <span>Lihat Toko Publik</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Search & Status Tabs Filter */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari ID Pesanan, No. Resi, Nama, Email, No. HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs h-10 rounded-xl bg-card border-border/80 focus-visible:ring-violet-600 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 text-xs"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab Filter Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "ALL"
                ? "bg-violet-700 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            <span>Semua Pesanan</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                activeTab === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusCounts.total}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-400" />
            <span>Menunggu Bayar</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                activeTab === "PENDING"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusCounts.pending}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("PAID")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "PAID"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-400" />
            <span>Sudah Dibayar (Siap Kirim)</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                activeTab === "PAID"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusCounts.paid}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("SHIPPED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "SHIPPED"
                ? "bg-violet-700 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-violet-400" />
            <span>Sedang Dikirim</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                activeTab === "SHIPPED"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusCounts.shipped}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span>Selesai</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                activeTab === "COMPLETED"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {statusCounts.completed}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("CANCELLED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "CANCELLED"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-rose-400" />
            <span>Dibatalkan</span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
                activeTab === "CANCELLED"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
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

      {/* 5. Tabel Operasional Pesanan (6 Kolom V2.0.0) */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[16%]">ID & Waktu Pesanan</th>
                <th className="py-3.5 px-4 w-[19%]">Pelanggan</th>
                <th className="py-3.5 px-4 w-[21%]">Pengiriman & Resi</th>
                <th className="py-3.5 px-4 w-[15%]">Total Bayar</th>
                <th className="py-3.5 px-4 w-[13%]">Status</th>
                <th className="py-3.5 px-4 w-[16%] text-right">Aksi Pemenuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-24" />
                        <div className="h-3 bg-muted rounded-md w-32" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-28" />
                        <div className="h-3 bg-muted rounded-md w-36" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-32" />
                        <div className="h-3 bg-muted rounded-md w-20" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-muted rounded-md w-20" />
                        <div className="h-3 bg-muted rounded-md w-14" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-muted rounded-full w-24" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-8 bg-muted rounded-xl w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="py-16 text-center">
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
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
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
                            <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>{formatDateTime(order.created_at)}</span>
                          </p>
                        </div>
                      </td>

                      {/* Kolom 2: Pelanggan */}
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

                      {/* Kolom 3: Info Pengiriman & Resi (V2.0.0) */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                            <Truck className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400 shrink-0" />
                            <span>
                              {(order.courier_code || "JNE").toUpperCase()} -{" "}
                              {order.courier_service || "REG"}
                            </span>
                          </div>

                          <p
                            className="text-[11px] text-muted-foreground truncate max-w-[190px]"
                            title={order.shipping_city_name || order.shipping_address}
                          >
                            {order.shipping_city_name || order.shipping_province || "Alamat Terdaftar"}
                          </p>

                          <div className="text-[10px] text-muted-foreground flex items-center justify-between max-w-[190px]">
                            <span>Ongkir: {formatRupiah(order.shipping_cost || 0)}</span>
                            <span>• {formatWeight(order.shipping_weight_grams || 1000)}</span>
                          </div>

                          {/* Nomor Resi */}
                          {order.tracking_number ? (
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="font-mono text-[10px] bg-muted/80 text-foreground font-extrabold px-1.5 py-0.5 rounded border border-border/80 truncate max-w-[140px]">
                                {order.tracking_number}
                              </span>
                              <button
                                onClick={() => handleCopyTracking(order.tracking_number!)}
                                className="text-muted-foreground hover:text-violet-700 transition-colors p-0.5 rounded hover:bg-muted cursor-pointer"
                                title="Salin Nomor Resi"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/70 italic block">
                              Belum ada resi
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kolom 4: Total Bayar & Items */}
                      <td className="py-4 px-4 align-middle">
                        <div>
                          <span className="font-bold text-foreground text-xs sm:text-sm block">
                            {formatRupiah(order.total_amount)}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Package className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>{totalItems} item produk</span>
                          </span>
                        </div>
                      </td>

                      {/* Kolom 5: Status Saat Ini */}
                      <td className="py-4 px-4 align-middle">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* Kolom 6: Aksi Pemenuhan (FSM) */}
                      <td className="py-4 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* FSM: PENDING -> Simulasi Lunas (PAID) */}
                          {order.status === "PENDING" && (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleUpdateStatus(order.id, "PAID")}
                              className="h-8 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                              title="Simulasikan pelunasan pembayaran Midtrans Sandbox"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                                  <span>Simulasi Lunas</span>
                                </>
                              )}
                            </Button>
                          )}

                          {/* FSM: PAID -> SHIPPED (Buka Modal Input Resi) */}
                          {order.status === "PAID" && (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleOpenShippingModal(order)}
                              className="h-8 px-2.5 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              <Truck className="h-3.5 w-3.5 mr-1" />
                              <span>Kirim Barang</span>
                            </Button>
                          )}

                          {/* FSM: SHIPPED -> COMPLETED */}
                          {order.status === "SHIPPED" && (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
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
                              onClick={() => handleUpdateStatus(order.id, "CANCELLED")}
                              className="h-8 px-2 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  <span>Batalkan</span>
                                </>
                              )}
                            </Button>
                          )}

                          {/* Tombol Detail Modal */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(order)}
                            className="h-8 px-2.5 rounded-lg border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold cursor-pointer"
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
          6. Modal Konfirmasi Pengiriman & Input Resi (SHIPPED Modal V2.0.0)
          ========================================================================= */}
      {isShippingModalOpen && shippingModalOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleCloseShippingModal}
        >
          <div
            className="relative w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden my-8 p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/70 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Konfirmasi Pengiriman & Input Resi
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Pesanan #{shippingModalOrder.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseShippingModal}
                disabled={isSubmittingShipping}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Ringkasan Penerima & Ekspedisi */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Penerima:</span>
                <span className="font-bold text-foreground text-right">
                  {shippingModalOrder.customer_name} ({shippingModalOrder.customer_phone})
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Alamat Tujuan:</span>
                <span className="font-medium text-foreground text-right max-w-[280px]">
                  {shippingModalOrder.shipping_address},{" "}
                  {shippingModalOrder.shipping_city_name || ""} {shippingModalOrder.shipping_province || ""}{" "}
                  {shippingModalOrder.shipping_postal_code || ""}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Ekspedisi Kurir:</span>
                <Badge variant="outline" className="font-extrabold text-violet-700 border-violet-300 bg-violet-50 dark:bg-violet-950 dark:text-violet-300">
                  {(shippingModalOrder.courier_code || "JNE").toUpperCase()} - {shippingModalOrder.courier_service || "REG"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Berat Barang:</span>
                <span className="font-bold text-foreground">
                  {formatWeight(shippingModalOrder.shipping_weight_grams || 1000)}
                </span>
              </div>
            </div>

            {/* Form Input Resi & Generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tracking_input" className="text-xs font-bold text-foreground">
                  Nomor Resi Pengiriman (Airwaybill) <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoGenerateClick}
                  disabled={isSubmittingShipping}
                  className="h-7 px-2 text-xs rounded-lg border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300 font-semibold cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 mr-1 text-violet-600" />
                  <span>Auto-Generate Resi</span>
                </Button>
              </div>

              <Input
                id="tracking_input"
                type="text"
                placeholder="Contoh: AMBA-JNT-20261031-9F4A2B"
                value={trackingInput}
                onChange={(e) => {
                  setTrackingInput(e.target.value);
                  setTrackingError(null);
                }}
                disabled={isSubmittingShipping}
                className={`font-mono text-xs h-10 rounded-xl ${
                  trackingError ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-violet-600"
                }`}
              />

              {trackingError ? (
                <p className="text-[11px] font-medium text-red-500">{trackingError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Format resi minimal 5 karakter alfanumerik. Pelanggan dapat melacak paket dengan resi ini.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseShippingModal}
                disabled={isSubmittingShipping}
                className="rounded-xl text-xs font-semibold h-9 px-4 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmShipping}
                disabled={isSubmittingShipping}
                className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold h-9 px-4 shadow-sm cursor-pointer"
              >
                {isSubmittingShipping ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Menyimpan & Mengirim...
                  </>
                ) : (
                  <>
                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                    Konfirmasi & Kirim Paket
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. Modal Rincian Pesanan Pelanggan (Order Detail Modal V2.0.0)
          ========================================================================= */}
      {isDetailModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={handleCloseDetail}
        >
          <div
            className="relative w-full max-w-2xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200"
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
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted cursor-pointer"
                    title="Salin UUID"
                  >
                    {copiedId === selectedOrder.id ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Header Status & Waktu */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border/80 bg-muted/20">
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    Status Siklus Hidup Pesanan:
                  </span>
                  <div className="mt-1">
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                </div>

                <div className="sm:text-right text-xs text-muted-foreground">
                  <span className="block">Dibuat pada:</span>
                  <strong className="text-foreground">
                    {formatDateTime(selectedOrder.created_at)}
                  </strong>
                </div>
              </div>

              {/* Data Pelanggan & Alamat */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-violet-700" />
                  <span>Informasi Pelanggan & Pengiriman</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/80 p-4 text-xs bg-card">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground block">
                      Nama Penerima
                    </span>
                    <span className="font-bold text-foreground block">
                      {selectedOrder.customer_name}
                    </span>
                    <div>
                      {selectedOrder.user_id ? (
                        <Badge
                          variant="outline"
                          className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 text-[10px]"
                        >
                          Akun Terdaftar (Member)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 text-[10px]"
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
                      <span>Alamat Lengkap Tujuan Pengiriman</span>
                    </span>
                    <p className="text-xs font-medium text-foreground bg-muted/20 p-2.5 rounded-lg border border-border/60">
                      {selectedOrder.shipping_address},{" "}
                      {selectedOrder.shipping_city_name || ""} {selectedOrder.shipping_province || ""}{" "}
                      {selectedOrder.shipping_postal_code || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rincian Logistik & Resi (V2.0.0) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-violet-700" />
                  <span>Informasi Logistik & Resi Pengiriman</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border/80 bg-card text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Ekspedisi Kurir & Layanan:</span>
                    <span className="font-extrabold text-foreground text-sm">
                      {(selectedOrder.courier_code || "JNE").toUpperCase()} - {selectedOrder.courier_service || "REG"}
                    </span>
                    {selectedOrder.shipping_etd && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Estimasi Tiba: {selectedOrder.shipping_etd} hari
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">Bobot Total Paket:</span>
                    <span className="font-bold text-foreground">
                      {formatWeight(selectedOrder.shipping_weight_grams || 1000)}
                    </span>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Nomor Resi Pengiriman:</span>
                      {selectedOrder.tracking_number ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-black bg-muted px-2.5 py-1 rounded-lg border border-border text-foreground">
                            {selectedOrder.tracking_number}
                          </span>
                          <button
                            onClick={() => handleCopyTracking(selectedOrder.tracking_number!)}
                            className="text-violet-700 hover:text-violet-800 p-1 hover:bg-violet-50 rounded cursor-pointer"
                            title="Salin Nomor Resi"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Belum diterbitkan (status belum SHIPPED)
                        </span>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
                      {selectedOrder.shipped_at && (
                        <p>Dikirim: <strong className="text-foreground">{formatDateTime(selectedOrder.shipped_at)}</strong></p>
                      )}
                      {selectedOrder.completed_at && (
                        <p>Selesai: <strong className="text-foreground">{formatDateTime(selectedOrder.completed_at)}</strong></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Daftar Item Pesanan & Invoice Breakdown */}
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
                      <tr className="bg-muted/20 border-t border-border text-xs">
                        <td colSpan={3} className="p-3 text-right text-muted-foreground">
                          Subtotal Produk:
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {formatRupiah(
                            selectedOrder.total_amount - (selectedOrder.shipping_cost || 0)
                          )}
                        </td>
                      </tr>
                      <tr className="bg-muted/20 text-xs">
                        <td colSpan={3} className="p-3 text-right text-muted-foreground">
                          Ongkos Kirim ({(selectedOrder.courier_code || "JNE").toUpperCase()} - {selectedOrder.courier_service || "REG"}):
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {formatRupiah(selectedOrder.shipping_cost || 0)}
                        </td>
                      </tr>
                      <tr className="bg-muted/40 border-t border-border font-bold">
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

            {/* Modal Footer (Aksi Cepat Transisi Status FSM) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/70 p-4 bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Status saat ini:{" "}
                <strong className="text-foreground">{selectedOrder.status}</strong>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDetail}
                  className="rounded-xl text-xs font-semibold h-9 px-4 cursor-pointer"
                >
                  Tutup
                </Button>

                {/* Simulasi Lunas untuk status PENDING */}
                {selectedOrder.status === "PENDING" && (
                  <Button
                    size="sm"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, "PAID")}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 shadow-xs cursor-pointer"
                  >
                    {actionLoadingId === selectedOrder.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        <span>Simulasi Lunas (PAID)</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Kirim Barang untuk status PAID */}
                {selectedOrder.status === "PAID" && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenShippingModal(selectedOrder)}
                    className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold h-9 px-4 shadow-xs cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                    <span>Kirim Barang (SHIPPED)</span>
                  </Button>
                )}

                {/* Selesaikan untuk status SHIPPED */}
                {selectedOrder.status === "SHIPPED" && (
                  <Button
                    size="sm"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() =>
                      handleUpdateStatus(selectedOrder.id, "COMPLETED")
                    }
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-xs cursor-pointer"
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
