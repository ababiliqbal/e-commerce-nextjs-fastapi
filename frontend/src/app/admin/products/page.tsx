'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Archive,
  RotateCcw,
  UploadCloud,
  ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  X,
  Store,
  Layers,
  Loader2,
  Star,
  EyeOff,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  archiveAdminProduct,
  uploadProductImage,
  getPrimaryProductImage,
  Product,
  ProductAdminWriteRequest,
  ProductImageInput,
  FALLBACK_PRODUCT_IMAGE,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TabFilter = "ALL" | "ACTIVE" | "ARCHIVED";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
  images: ProductImageInput[];
}

const emptyFormData: ProductFormData = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "0",
  is_active: true,
  images: [],
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Image Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [manualUrlInput, setManualUrlInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Action Loading state for per-row toggle
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Format IDR Currency
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // 1. Fetch Products
  const loadProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchAdminProducts(undefined, true);
      setProducts(data);
      if (isRefresh) {
        toast.success("Daftar katalog produk berhasil diperbarui.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memuat katalog produk.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, [loadProducts]);

  // Tab Counts Calculation
  const counts = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active !== false).length;
    const archived = products.filter((p) => p.is_active === false).length;
    return { total, active, archived };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Tab Status Filter
      if (activeTab === "ACTIVE" && product.is_active === false) return false;
      if (activeTab === "ARCHIVED" && product.is_active !== false) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = product.name?.toLowerCase().includes(q);
        const matchDesc = product.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      return true;
    });
  }, [products, activeTab, searchQuery]);

  // 2. Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setManualUrlInput("");
    setIsModalOpen(true);
  };

  // 3. Open Modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    const existingImages: ProductImageInput[] =
      product.images && product.images.length > 0
        ? product.images.map((img, idx) => ({
            id: img.id,
            image_url: img.image_url,
            is_primary: img.is_primary,
            display_order: img.display_order ?? idx,
          }))
        : product.image_url
        ? [
            {
              image_url: product.image_url,
              is_primary: true,
              display_order: 0,
            },
          ]
        : [];

    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock_quantity: String(product.stock_quantity),
      is_active: product.is_active ?? true,
      images: existingImages,
    });
    setFormErrors({});
    setManualUrlInput("");
    setIsModalOpen(true);
  };

  // Close Modal
  const handleCloseModal = () => {
    if (isSubmitting || isUploadingImage) return;
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // 4. Archive / Reactivate Handler (Row action)
  const handleToggleArchive = async (product: Product) => {
    const isCurrentlyActive = product.is_active !== false;
    setActionLoadingId(product.id);

    try {
      if (isCurrentlyActive) {
        // Soft delete (archive)
        await archiveAdminProduct(product.id);
        toast.success(`Produk '${product.name}' berhasil diarsipkan.`);
      } else {
        // Reactivate
        const payload: ProductAdminWriteRequest = {
          name: product.name,
          description: product.description || null,
          price: Number(product.price),
          stock_quantity: Number(product.stock_quantity),
          is_active: true,
          image_url: product.image_url || null,
          images: (product.images || []).map((img, idx) => ({
            id: img.id,
            image_url: img.image_url,
            is_primary: img.is_primary,
            display_order: img.display_order ?? idx,
          })),
        };
        await updateAdminProduct(product.id, payload);
        toast.success(`Produk '${product.name}' berhasil diaktifkan kembali.`);
      }
      // Re-fetch products silently
      const refreshed = await fetchAdminProducts(undefined, true);
      setProducts(refreshed);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status arsip produk.";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Image Upload Handler
  const handleUploadFile = async (file: File) => {
    // Client-side validations
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format berkas tidak didukung. Harap pilih .jpg, .png, atau .webp.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Ukuran berkas melebihi 5 MB.");
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading("Mengunggah foto ke Cloud Object Storage...");

    try {
      const uploadRes = await uploadProductImage(file);
      toast.dismiss(toastId);
      toast.success("Foto berhasil diunggah.");

      setFormData((prev) => {
        const isFirst = prev.images.length === 0;
        const newImg: ProductImageInput = {
          image_url: uploadRes.image_url,
          is_primary: isFirst,
          display_order: prev.images.length,
        };
        return {
          ...prev,
          images: [...prev.images, newImg],
        };
      });
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const msg =
        err instanceof Error ? err.message : "Gagal mengunggah foto ke Cloud Storage.";
      toast.error(msg);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 6. Manual URL Addition
  const handleAddManualUrl = () => {
    const trimmed = manualUrlInput.trim();
    if (!trimmed) {
      toast.error("Masukkan URL gambar yang valid.");
      return;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      toast.error("URL gambar harus diawali dengan http:// atau https://");
      return;
    }

    setFormData((prev) => {
      const isFirst = prev.images.length === 0;
      const newImg: ProductImageInput = {
        image_url: trimmed,
        is_primary: isFirst,
        display_order: prev.images.length,
      };
      return {
        ...prev,
        images: [...prev.images, newImg],
      };
    });

    setManualUrlInput("");
    toast.success("Gambar dari tautan berhasil ditambahkan ke galeri.");
  };

  // 7. Gallery Item Actions: Make Primary, Move Up, Move Down, Delete
  const handleSetPrimary = (index: number) => {
    setFormData((prev) => {
      const targetImg = prev.images[index];
      if (!targetImg) return prev;

      // Pindahkan gambar terpilih ke urutan terdepan dan set is_primary = true
      const remaining = prev.images.filter((_, i) => i !== index);
      const updatedList = [
        { ...targetImg, is_primary: true },
        ...remaining.map((img) => ({ ...img, is_primary: false })),
      ].map((img, idx) => ({ ...img, display_order: idx }));

      return {
        ...prev,
        images: updatedList,
      };
    });
  };

  const handleMoveOrder = (index: number, direction: "UP" | "DOWN") => {
    setFormData((prev) => {
      const targetIndex = direction === "UP" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.images.length) return prev;

      const newList = [...prev.images];
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;

      return {
        ...prev,
        images: newList.map((img, idx) => ({ ...img, display_order: idx })),
      };
    });
  };

  const handleDeleteImage = (index: number) => {
    setFormData((prev) => {
      const wasPrimary = prev.images[index]?.is_primary;
      const remaining = prev.images.filter((_, i) => i !== index);

      // Jika yang dihapus adalah primary dan masih ada gambar tersisa, jadikan gambar pertama sebagai primary
      if (wasPrimary && remaining.length > 0) {
        remaining[0].is_primary = true;
      }

      return {
        ...prev,
        images: remaining.map((img, idx) => ({ ...img, display_order: idx })),
      };
    });
  };

  // 8. Submit Form (Save Product)
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    // Validasi Anti-XSS & field wajib
    if (!formData.name.trim()) {
      errors.name = "Nama produk wajib diisi.";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Nama produk minimal 3 karakter.";
    } else if (formData.name.includes("<") || formData.name.includes(">")) {
      errors.name = "Nama produk tidak boleh mengandung karakter '<' atau '>'.";
    }

    if (
      formData.description &&
      (formData.description.includes("<") || formData.description.includes(">"))
    ) {
      errors.description = "Deskripsi produk tidak boleh mengandung karakter '<' atau '>'.";
    }

    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      errors.price = "Harga satuan harus berupa angka lebih besar dari Rp 0.";
    }

    const numStock = parseInt(formData.stock_quantity, 10);
    if (isNaN(numStock) || numStock < 0) {
      errors.stock_quantity = "Stok gudang harus berupa bilangan bulat >= 0.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Mohon perbaiki isian formulir yang belum valid.");
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      // Normalisasi susunan galeri gambar
      let normalizedImages = [...formData.images];

      // Jika galeri kosong, tambahkan gambar fallback otomatis
      if (normalizedImages.length === 0) {
        normalizedImages = [
          {
            image_url: FALLBACK_PRODUCT_IMAGE,
            is_primary: true,
            display_order: 0,
          },
        ];
      }

      // Pastikan ada tepat 1 primary
      const hasPrimary = normalizedImages.some((img) => img.is_primary);
      if (!hasPrimary) {
        normalizedImages[0].is_primary = true;
      }

      const primaryImg =
        normalizedImages.find((img) => img.is_primary) || normalizedImages[0];

      // Format rapi display_order
      const finalImagesList = normalizedImages.map((img, idx) => ({
        id: img.id,
        image_url: img.image_url,
        is_primary: img.image_url === primaryImg.image_url,
        display_order: idx,
      }));

      const payload: ProductAdminWriteRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() ? formData.description.trim() : null,
        price: numPrice,
        stock_quantity: numStock,
        is_active: formData.is_active,
        image_url: primaryImg.image_url,
        images: finalImagesList,
      };

      if (editingProduct) {
        await updateAdminProduct(editingProduct.id, payload);
        toast.success(`Produk '${payload.name}' berhasil diperbarui.`);
      } else {
        await createAdminProduct(payload);
        toast.success(`Produk '${payload.name}' berhasil ditambahkan ke katalog.`);
      }

      setIsModalOpen(false);
      setEditingProduct(null);

      // Reload products list
      const refreshed = await fetchAdminProducts(undefined, true);
      setProducts(refreshed);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan data produk.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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
        <span className="font-semibold text-foreground">Katalog & Inventaris</span>
      </div>

      {/* 2. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Package className="h-4 w-4" />
            </span>
            <Badge
              variant="outline"
              className="bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 text-[10px] font-bold"
            >
              CMS & INVENTORY V1.3.0
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Manajemen Katalog & Inventaris Produk
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Atur ketersediaan etalase, sesuaikan stok fisik gudang, unggah galeri multi-foto ke Cloud Storage, dan lakukan pengarsipan aman.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProducts(true)}
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

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-semibold text-xs shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tambah Produk Baru</span>
          </Button>
        </div>
      </div>

      {/* 3. Search Bar & Status Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-4 rounded-2xl border border-border/70 shadow-xs">
        {/* Bilah Pencarian Real-Time */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama atau deskripsi produk..."
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
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "ALL"
                ? "bg-background text-violet-700 dark:text-violet-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Semua Produk</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground font-bold"
            >
              {counts.total}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "ACTIVE"
                ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Aktif di Etalase</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold"
            >
              {counts.active}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("ARCHIVED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "ARCHIVED"
                ? "bg-background text-zinc-700 dark:text-zinc-300 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex h-2 w-2 rounded-full bg-zinc-400" />
            <span>Diarsipkan</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-bold"
            >
              {counts.archived}
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
            onClick={() => loadProducts(true)}
            className="rounded-xl border-destructive/30 hover:bg-destructive/20 text-xs shrink-0"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* 5. Tabel Inventaris Produk */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[40%]">Info Produk</th>
                <th className="py-3.5 px-4 w-[18%]">Harga Satuan</th>
                <th className="py-3.5 px-4 w-[16%]">Stok Gudang</th>
                <th className="py-3.5 px-4 w-[14%]">Status Etalase</th>
                <th className="py-3.5 px-4 w-[12%] text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-muted rounded-md w-3/4" />
                          <div className="h-2.5 bg-muted rounded-md w-1/2" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-muted rounded-md w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-muted rounded-full w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-muted rounded-full w-20" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-8 bg-muted rounded-xl w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                      <Package className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="font-bold text-sm text-foreground">
                      Tidak ada produk yang cocok
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? `Tidak ditemukan produk dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                        : activeTab === "ARCHIVED"
                        ? "Belum ada produk yang diarsipkan saat ini."
                        : activeTab === "ACTIVE"
                        ? "Belum ada produk aktif di etalase."
                        : "Katalog produk Anda masih kosong. Tekan tombol Tambah Produk Baru untuk memulai."}
                    </p>
                    {searchQuery ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="mt-4 rounded-xl text-xs"
                      >
                        Reset Pencarian
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleOpenAddModal}
                        className="mt-4 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Tambah Produk Sekarang
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                // Data Rows
                filteredProducts.map((product) => {
                  const primaryImageUrl = getPrimaryProductImage(product);
                  const galleryCount =
                    product.images && product.images.length > 0
                      ? product.images.length
                      : product.image_url
                      ? 1
                      : 0;

                  const isArchived = product.is_active === false;
                  const isActionLoading = actionLoadingId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isArchived ? "opacity-75 bg-muted/10" : ""
                      }`}
                    >
                      {/* Kolom 1: Info Produk */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-border/80 bg-muted shrink-0 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={primaryImageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  FALLBACK_PRODUCT_IMAGE;
                              }}
                            />
                            {galleryCount > 1 && (
                              <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                                <ImageIcon className="h-2.5 w-2.5" />
                                <span>{galleryCount}</span>
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground text-xs sm:text-sm line-clamp-1">
                                {product.name}
                              </span>
                              {galleryCount > 0 && (
                                <span className="hidden lg:inline-flex text-[10px] text-muted-foreground font-medium">
                                  ({galleryCount} foto)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {product.description || "Tidak ada deskripsi produk."}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kolom 2: Harga Satuan */}
                      <td className="py-4 px-4 align-middle">
                        <span className="font-bold text-foreground text-xs sm:text-sm">
                          {formatRupiah(product.price)}
                        </span>
                      </td>

                      {/* Kolom 3: Stok Gudang */}
                      <td className="py-4 px-4 align-middle">
                        {product.stock_quantity === 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 text-[11px] font-bold px-2.5 py-0.5"
                          >
                            Habis (0)
                          </Badge>
                        ) : product.stock_quantity <= 5 ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 text-[11px] font-bold px-2.5 py-0.5"
                          >
                            Kritis ({product.stock_quantity})
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-0.5"
                          >
                            Tersedia ({product.stock_quantity})
                          </Badge>
                        )}
                      </td>

                      {/* Kolom 4: Status Etalase */}
                      <td className="py-4 px-4 align-middle">
                        {!isArchived ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            <span>Aktif</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-zinc-200/80 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1 w-fit"
                          >
                            <EyeOff className="h-3 w-3" />
                            <span>Diarsipkan (Hidden)</span>
                          </Badge>
                        )}
                      </td>

                      {/* Kolom 5: Aksi Cepat */}
                      <td className="py-4 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Edit */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(product)}
                            className="h-8 px-2.5 rounded-lg border-border/80 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40 text-xs font-semibold"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            <span>Edit</span>
                          </Button>

                          {/* Tombol Toggle Arsip / Aktifkan Kembali */}
                          {!isArchived ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleToggleArchive(product)}
                              className="h-8 px-2.5 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 text-xs font-semibold"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Archive className="h-3.5 w-3.5 mr-1" />
                                  <span>Arsipkan</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleToggleArchive(product)}
                              className="h-8 px-2.5 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs font-semibold"
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  <span>Aktifkan</span>
                                </>
                              )}
                            </Button>
                          )}
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
          6. Modal Tambah / Edit Produk dengan Multi-Image Gallery Manager
          ========================================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-3xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 p-5 bg-card">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    <Package className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                    {editingProduct ? "Edit Informasi Produk" : "Entri Produk Baru"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                  {editingProduct
                    ? `Perbarui: ${editingProduct.name}`
                    : "Tambah Produk Baru ke Katalog"}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting || isUploadingImage}
                className="h-8 w-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitProduct}>
              <div className="max-h-[72vh] overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* 1. Informasi Dasar Produk */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-violet-700" />
                    <span>Informasi Dasar Produk</span>
                  </h3>

                  {/* Nama Produk */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Nama Produk <strong className="text-red-500">*</strong></span>
                      <span className="text-[10px] text-muted-foreground">Min. 3 karakter, Anti-XSS</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: MechKeyboard Tech Violet Pro Wireless"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className={`text-xs h-10 rounded-xl ${
                        formErrors.name
                          ? "border-red-500 focus-visible:ring-red-500"
                          : "focus-visible:ring-violet-600"
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Deskripsi Produk */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Deskripsi Produk (Opsional)</span>
                      <span className="text-[10px] text-muted-foreground">Anti-XSS</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan spesifikasi, keunggulan, atau kelengkapan paket produk..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className={`w-full rounded-xl border border-input bg-background p-3 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-600 transition-all ${
                        formErrors.description
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                    />
                    {formErrors.description && (
                      <p className="text-[11px] text-red-500">
                        {formErrors.description}
                      </p>
                    )}
                  </div>

                  {/* Baris Harga & Stok */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Harga Satuan */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Harga Satuan (IDR) <strong className="text-red-500">*</strong>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          Rp
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Contoh: 450000"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, price: e.target.value }))
                          }
                          className={`pl-10 text-xs h-10 rounded-xl ${
                            formErrors.price
                              ? "border-red-500 focus-visible:ring-red-500"
                              : "focus-visible:ring-violet-600"
                          }`}
                        />
                      </div>
                      {formErrors.price && (
                        <p className="text-[11px] text-red-500">{formErrors.price}</p>
                      )}
                    </div>

                    {/* Stok Gudang */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Jumlah Stok Gudang <strong className="text-red-500">*</strong>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Contoh: 25"
                        value={formData.stock_quantity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            stock_quantity: e.target.value,
                          }))
                        }
                        className={`text-xs h-10 rounded-xl ${
                          formErrors.stock_quantity
                            ? "border-red-500 focus-visible:ring-red-500"
                            : "focus-visible:ring-violet-600"
                        }`}
                      />
                      {formErrors.stock_quantity && (
                        <p className="text-[11px] text-red-500">
                          {formErrors.stock_quantity}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Switch / Checkbox is_active */}
                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_active: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded-md border-border text-violet-700 focus:ring-violet-600 accent-violet-700 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground block">
                          Tampilkan produk ini di etalase publik (Aktif)
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Jika tidak dicentang, produk akan disimpan dalam status arsip (hidden) dan tidak dapat dibeli pelanggan.
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          formData.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
                            : "bg-zinc-100 text-zinc-600 border-zinc-300 text-[10px]"
                        }
                      >
                        {formData.is_active ? "Aktif" : "Diarsipkan"}
                      </Badge>
                    </label>
                  </div>
                </div>

                {/* 2. Pengelola Galeri Multi-Gambar (1:N) */}
                <div className="space-y-4 pt-4 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-violet-700" />
                        <span>Galeri Foto Produk (Multi-Gambar 1:N)</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Unggah foto ke Cloud Storage atau masukkan tautan URL langsung.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {formData.images.length} Foto Ditambahkan
                    </Badge>
                  </div>

                  {/* Area Drag-and-Drop & File Picker */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUploadFile(file);
                    }}
                    onClick={() => {
                      if (!isUploadingImage) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-violet-600 bg-violet-50/60 dark:bg-violet-950/40 ring-4 ring-violet-600/10"
                        : "border-border/80 hover:border-violet-500/60 hover:bg-muted/30"
                    } ${isUploadingImage ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file);
                      }}
                    />

                    {isUploadingImage ? (
                      <div className="py-2 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-7 w-7 text-violet-700 animate-spin" />
                        <span className="text-xs font-bold text-violet-700">
                          Mengunggah ke Cloud Storage...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 flex items-center justify-center">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Tarik & Lepas foto produk di sini, atau{" "}
                            <span className="text-violet-700 underline">pilih dari komputer</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Mendukung berkas JPG, PNG, atau WebP (Maksimal 5 MB per foto)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Opsi Tambah via URL Eksternal */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="Atau tempel URL gambar eksternal (https://...)"
                        value={manualUrlInput}
                        onChange={(e) => setManualUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddManualUrl();
                          }
                        }}
                        className="pl-9 text-xs h-9 rounded-xl focus-visible:ring-violet-600"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddManualUrl}
                      className="rounded-xl h-9 text-xs font-semibold hover:bg-violet-50 hover:text-violet-700 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Tambah URL
                    </Button>
                  </div>

                  {/* Daftar Pratinjau Gambar Galeri */}
                  {formData.images.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Pratinjau Galeri & Urutan Tampilan
                      </span>

                      <div className="space-y-2">
                        {formData.images.map((img, idx) => {
                          const isPrimary = img.is_primary === true;
                          return (
                            <div
                              key={`img-item-${idx}-${img.image_url.slice(-10)}`}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                isPrimary
                                  ? "border-violet-400 bg-violet-50/40 dark:bg-violet-950/20 shadow-xs"
                                  : "border-border/70 bg-card hover:bg-muted/30"
                              }`}
                            >
                              {/* Urutan Badge */}
                              <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                                #{idx + 1}
                              </span>

                              {/* Thumbnail */}
                              <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border/80 bg-muted shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.image_url}
                                  alt={`Galeri ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      FALLBACK_PRODUCT_IMAGE;
                                  }}
                                />
                              </div>

                              {/* URL & Status */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {isPrimary ? (
                                    <Badge className="bg-violet-700 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                                      <Star className="h-2.5 w-2.5 fill-current" />
                                      <span>Foto Utama (Cover)</span>
                                    </Badge>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                      Foto Tambahan
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                                  {img.image_url}
                                </p>
                              </div>

                              {/* Kontrol Aksi Gambar */}
                              <div className="flex items-center gap-1 shrink-0">
                                {!isPrimary && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSetPrimary(idx)}
                                    className="h-7 px-2 rounded-lg text-[10px] font-semibold text-violet-700 border-violet-200 hover:bg-violet-100/60 dark:hover:bg-violet-950/60"
                                  >
                                    <Star className="h-3 w-3 mr-1" />
                                    Jadikan Utama
                                  </Button>
                                )}

                                {/* Naikkan urutan */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveOrder(idx, "UP")}
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>

                                {/* Turunkan urutan */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === formData.images.length - 1}
                                  onClick={() => handleMoveOrder(idx, "DOWN")}
                                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>

                                {/* Hapus Foto */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteImage(idx)}
                                  className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-border/70 p-4 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSubmitting || isUploadingImage}
                  className="rounded-xl text-xs font-semibold h-10 px-4"
                >
                  Batal
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold h-10 px-5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      <span>{editingProduct ? "Perbarui Produk" : "Simpan Produk"}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
