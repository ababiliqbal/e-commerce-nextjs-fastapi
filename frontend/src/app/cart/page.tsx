'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  Truck,
  Scale,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  apiFetch,
  getProvinces,
  getCities,
  getShippingRates,
  checkoutOrder,
  formatWeight,
  ProvinceDTO,
  CityDTO,
  ShippingServiceOptionDTO,
  ShippingRateResponseDTO,
  CheckoutPayload,
} from "@/lib/api";
import { getPrimaryProductImage } from "@/types/product";
import { toast } from "sonner";

// Daftar ekspedisi kurir resmi yang didukung V2.0.0
const COURIER_OPTIONS = [
  { code: "jne", name: "JNE Express", tag: "JNE" },
  { code: "jnt", name: "J&T Express", tag: "J&T" },
  { code: "sicepat", name: "SiCepat Ekspres", tag: "SiCepat" },
  { code: "pos", name: "POS Indonesia", tag: "POS" },
] as const;

type CourierCode = (typeof COURIER_OPTIONS)[number]["code"];

const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(3, "Nama lengkap minimal 3 karakter")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
  customer_email: z.string().email("Format email tidak valid"),
  customer_phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit angka")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)")
    .regex(/^\d+$/, "Nomor telepon hanya boleh berisi angka"),
  shipping_address: z
    .string()
    .min(10, "Alamat pengiriman minimal 10 karakter")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
  shipping_province_id: z.string().min(1, "Silakan pilih provinsi tujuan"),
  shipping_city_id: z.string().min(1, "Silakan pilih kota/kabupaten tujuan"),
  shipping_postal_code: z
    .string()
    .min(5, "Kode pos minimal 5 digit angka")
    .regex(/^\d+$/, "Kode pos hanya boleh berisi angka"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cart Store
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getTotalWeightGrams,
    getChargeableWeightKg,
    setLastOrderId,
  } = useCartStore();

  // Auth Store
  const { user, accessToken, getShippingProfile, saveShippingProfile } = useAuthStore();

  // Logistics State (Cascading Dropdown & Rates)
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);

  const [cities, setCities] = useState<CityDTO[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const [selectedCourier, setSelectedCourier] = useState<CourierCode>("jne");
  const [shippingRatesData, setShippingRatesData] = useState<ShippingRateResponseDTO | null>(null);
  const [selectedService, setSelectedService] = useState<ShippingServiceOptionDTO | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const totalWeightGrams = getTotalWeightGrams();
  const chargeableWeightKg = getChargeableWeightKg();

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      shipping_province_id: "",
      shipping_city_id: "",
      shipping_postal_code: "",
      shipping_address: "",
    },
  });

  const selectedProvinceId = watch("shipping_province_id");
  const selectedCityId = watch("shipping_city_id");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format IDR Currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // 1. Fetch Provinces saat mount
  useEffect(() => {
    let active = true;
    async function loadProvinces() {
      setIsLoadingProvinces(true);
      try {
        const data = await getProvinces();
        if (active) {
          setProvinces(data);
        }
      } catch (err) {
        console.error("Gagal memuat daftar provinsi:", err);
        toast.error("Gagal memuat daftar provinsi pengiriman.");
      } finally {
        if (active) setIsLoadingProvinces(false);
      }
    }
    loadProvinces();
    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch Cities saat Province berubah
  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([]);
      return;
    }

    let active = true;
    async function loadCities() {
      setIsLoadingCities(true);
      try {
        const data = await getCities(selectedProvinceId);
        if (active) {
          setCities(data);
        }
      } catch (err) {
        console.error("Gagal memuat kota:", err);
        toast.error("Gagal memuat daftar kota/kabupaten.");
      } finally {
        if (active) setIsLoadingCities(false);
      }
    }
    loadCities();
    return () => {
      active = false;
    };
  }, [selectedProvinceId]);

  // 3. Smart Auto-Fill dari Profil / Pesanan Terakhir
  useEffect(() => {
    let isSubscribed = true;

    async function autoFillUserData() {
      if (!user) return;

      const profile = getShippingProfile(user.id);
      let phone = profile?.phone || profile?.customer_phone || "";
      let address = profile?.address || profile?.shipping_address || "";
      const provinceId = profile?.province_id || "";
      let cityId = profile?.city_id || "";
      let postalCode = profile?.postal_code || "";
      let courier = (profile?.courier_code as CourierCode) || "jne";

      // Jika store belum memiliki preferensi wilayah, coba ambil dari pesanan terakhir
      if ((!phone || !address || !cityId) && accessToken) {
        try {
          const res = await apiFetch("/api/v1/orders/me");
          if (res.ok) {
            const myOrders = await res.json();
            if (Array.isArray(myOrders) && myOrders.length > 0) {
              const latestOrder = myOrders[0];
              if (!phone && latestOrder.customer_phone) phone = latestOrder.customer_phone;
              if (!address && latestOrder.shipping_address) address = latestOrder.shipping_address;
              if (!cityId && latestOrder.shipping_city_id) cityId = latestOrder.shipping_city_id;
              if (!postalCode && latestOrder.shipping_postal_code) postalCode = latestOrder.shipping_postal_code;
              if (latestOrder.courier_code) courier = latestOrder.courier_code as CourierCode;
            }
          }
        } catch {
          // Abaikan jika histori pesanan gagal diambil
        }
      }

      if (isSubscribed) {
        if (user.full_name) setValue("customer_name", user.full_name);
        if (user.email) setValue("customer_email", user.email);
        if (phone) setValue("customer_phone", phone);
        if (address) setValue("shipping_address", address);
        if (postalCode) setValue("shipping_postal_code", postalCode);
        if (courier && ["jne", "jnt", "sicepat", "pos"].includes(courier)) {
          setSelectedCourier(courier);
        }

        // Jika ada provinceId tersimpan
        if (provinceId) {
          setValue("shipping_province_id", provinceId);
        }

        // Jika ada cityId tersimpan
        if (cityId) {
          setValue("shipping_city_id", cityId);
        }
      }
    }

    autoFillUserData();

    return () => {
      isSubscribed = false;
    };
  }, [user, accessToken, getShippingProfile, setValue]);

  // 4. Kalkulator Ongkir Dinamis: Trigger saat city, courier, atau totalWeightGrams berubah
  const fetchRates = useCallback(async () => {
    if (!selectedCityId || totalWeightGrams <= 0) {
      setShippingRatesData(null);
      setSelectedService(null);
      setRatesError(null);
      return;
    }

    setIsLoadingRates(true);
    setRatesError(null);

    try {
      const response = await getShippingRates({
        destination_city_id: selectedCityId,
        weight_grams: totalWeightGrams,
        courier_code: selectedCourier,
      });

      setShippingRatesData(response);

      // Otomatis pilih layanan pertama secara mulus
      if (response.services && response.services.length > 0) {
        setSelectedService(response.services[0]);
      } else {
        setSelectedService(null);
        setRatesError("Tidak ada pilihan layanan pengiriman yang tersedia untuk rute ini.");
      }
    } catch (err: unknown) {
      console.error("Gagal menghitung ongkir:", err);
      const msg =
        err instanceof Error ? err.message : "Gagal menghitung tarif ongkos kirim.";
      setRatesError(msg);
      setSelectedService(null);
      setShippingRatesData(null);
    } finally {
      setIsLoadingRates(false);
    }
  }, [selectedCityId, totalWeightGrams, selectedCourier]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Handle pergantian Provinsi secara eksplisit dari UI
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setValue("shipping_province_id", pId, { shouldValidate: true });
    setValue("shipping_city_id", "", { shouldValidate: false });
    setValue("shipping_postal_code", "", { shouldValidate: false });
    setCities([]);
    setShippingRatesData(null);
    setSelectedService(null);
    setRatesError(null);
  };

  // Handle pergantian Kota secara eksplisit dari UI
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    setValue("shipping_city_id", cId, { shouldValidate: true });

    // Otomatis isi kode pos dari data kota yang dipilih
    const matchedCity = cities.find((c) => c.city_id === cId);
    if (matchedCity?.postal_code) {
      setValue("shipping_postal_code", matchedCity.postal_code, {
        shouldValidate: true,
      });
    }
  };

  // Hitung total pembayaran akhir (Subtotal Produk + Ongkos Kirim)
  const shippingCost = selectedService ? selectedService.cost : 0;
  const finalTotalPayment = totalPrice + shippingCost;

  // Nama provinsi & kota terpilih untuk payload
  const selectedProvinceName = useMemo(() => {
    return provinces.find((p) => p.province_id === selectedProvinceId)?.province_name || "";
  }, [provinces, selectedProvinceId]);

  const selectedCityName = useMemo(() => {
    const c = cities.find((city) => city.city_id === selectedCityId);
    return c ? `${c.type} ${c.city_name}` : "";
  }, [cities, selectedCityId]);

  // 5. Submit Handler Checkout
  const onSubmit = async (data: CheckoutFormValues) => {
    if (!selectedService) {
      toast.error("Silakan pilih salah satu layanan kurir pengiriman.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CheckoutPayload = {
        customer_name: data.customer_name.trim(),
        customer_email: data.customer_email.trim(),
        customer_phone: data.customer_phone.trim(),
        shipping_province: selectedProvinceName,
        shipping_city_id: data.shipping_city_id,
        shipping_city_name: selectedCityName,
        shipping_postal_code: data.shipping_postal_code.trim(),
        shipping_address: data.shipping_address.trim(),
        courier_code: selectedCourier,
        courier_service: selectedService.service,
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const orderData = await checkoutOrder(payload);

      // Simpan preferensi pengiriman untuk sesi pengguna terdaftar
      if (user) {
        saveShippingProfile(user.id, {
          phone: data.customer_phone.trim(),
          address: data.shipping_address.trim(),
          province_id: data.shipping_province_id,
          province_name: selectedProvinceName,
          city_id: data.shipping_city_id,
          city_name: selectedCityName,
          postal_code: data.shipping_postal_code.trim(),
          courier_code: selectedCourier,
        });
        setLastOrderId(null);
      } else {
        // Tamu (guest)
        setLastOrderId(orderData.id);
      }

      clearCart();
      toast.success("Pesanan berhasil dibuat!");

      // Eksekusi Pop-up Midtrans Snap jika token tersedia
      const snapToken = orderData.payment_gateway_ref;
      if (snapToken && typeof window !== "undefined" && window.snap) {
        try {
          window.snap.pay(snapToken, {
            onSuccess: () => {
              router.push(`/orders/${orderData.id}`);
            },
            onPending: () => {
              router.push(`/orders/${orderData.id}`);
            },
            onError: (err) => {
              console.error("Pembayaran Midtrans gagal:", err);
              toast.error("Pembayaran gagal atau dibatalkan.");
              router.push(`/orders/${orderData.id}`);
            },
            onClose: () => {
              // Jika ditutup, arahkan ke halaman detail pesanan untuk bayar nanti
              router.push(`/orders/${orderData.id}`);
            },
          });
        } catch (snapErr) {
          console.error("Gagal meluncurkan Midtrans Snap:", snapErr);
          router.push(`/orders/${orderData.id}`);
        }
      } else {
        // Fallback langsung ke halaman detail pesanan
        router.push(`/orders/${orderData.id}`);
      }
    } catch (err: unknown) {
      console.error("Gagal melakukan checkout:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Gagal memproses pesanan. Pastikan server backend aktif di port 8000.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-700 border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  // Tampilan jika keranjang belanja kosong
  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="text-center max-w-md animate-in fade-in duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Keranjang belanja Anda masih kosong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sepertinya Anda belum menambahkan produk apapun ke dalam keranjang belanja.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" className="bg-violet-700 hover:bg-violet-800 text-white font-semibold">
                <Link href="/">Mulai Belanja Sekarang</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Script Midtrans Snap Sandbox SDK */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header & Back Navigation */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-violet-700 transition-colors mb-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Lanjut Belanja Produk Lain
              </Link>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Keranjang Belanja & Checkout
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-violet-50 dark:bg-violet-950/50 px-3.5 py-1.5 border border-violet-200 dark:border-violet-900 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <ShieldCheck className="h-4 w-4 text-violet-600 shrink-0" />
              <span>Checkout Aman & Zero-Trust Pricing</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* ================================================================ */}
            {/* KOLOM KIRI (7 Col): Daftar Item Keranjang */}
            {/* ================================================================ */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
                <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/30">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-violet-700" />
                    <span>Daftar Barang Belanjaan ({totalItems} item)</span>
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Scale className="h-3.5 w-3.5 text-violet-700" />
                    <span>Total Bobot: {formatWeight(totalWeightGrams)}</span>
                  </div>
                </div>

                <div className="divide-y divide-border/60">
                  {items.map((item) => {
                    const itemWeight = item.weight_grams ?? 1000;
                    const subtotalItemWeight = itemWeight * item.quantity;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getPrimaryProductImage(item)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-bold text-foreground text-sm line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Harga Satuan: {formatPrice(item.price)}
                            </p>
                            {/* Rincian Berat Satuan & Subtotal Baris Item */}
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-md border border-violet-100 dark:border-violet-900">
                              <Scale className="h-3 w-3 shrink-0" />
                              <span>
                                Berat: {itemWeight.toLocaleString("id-ID")} gr × {item.quantity} = {subtotalItemWeight.toLocaleString("id-ID")} gr
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          {/* Kontrol Kuantitas */}
                          <div className="flex items-center gap-1.5 border border-border/80 rounded-lg p-0.5 bg-background shadow-2xs">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-7 w-7 rounded cursor-pointer hover:bg-muted"
                              aria-label="Kurangi kuantitas"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-7 text-center text-xs font-bold">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock_quantity}
                              className="h-7 w-7 rounded cursor-pointer hover:bg-muted disabled:opacity-50"
                              aria-label="Tambah kuantitas"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Subtotal Item */}
                          <div className="text-right min-w-24">
                            <p className="text-sm font-bold text-violet-700 dark:text-violet-400">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>

                          {/* Tombol Hapus */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg"
                            aria-label="Hapus item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bantuan Informasi Pengiriman */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-violet-700" />
                  <span>Kalkulasi Otomatis Bobot Tagihan (Volumetrik & Berat Nyata)</span>
                </p>
                <p>
                  Sesuai standar ekspedisi logistik Indonesia, bobot total dihitung berdasarkan pembulatan ke atas per kilogram berikutnya. Bobot total belanja Anda saat ini adalah <strong>{formatWeight(totalWeightGrams)}</strong> dengan bobot tagihan resmi <strong>{chargeableWeightKg} kg</strong>.
                </p>
              </div>
            </div>

            {/* ================================================================ */}
            {/* KOLOM KANAN (5 Col): Form Alamat, Kurir & Ringkasan Checkout */}
            {/* ================================================================ */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/70 py-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-violet-700" />
                    <span>Data Pengiriman & Pemilihan Kurir</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* 1. Kontak Penerima */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Informasi Penerima
                      </h4>

                      <div className="space-y-1">
                        <Label htmlFor="customer_name" className="text-xs font-semibold">
                          Nama Lengkap Penerima <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="customer_name"
                          placeholder="Contoh: Budi Santoso"
                          disabled={isSubmitting}
                          aria-invalid={!!errors.customer_name}
                          className="text-xs h-9 rounded-xl focus-visible:ring-violet-600"
                          {...register("customer_name")}
                        />
                        {errors.customer_name && (
                          <p className="text-[11px] font-medium text-destructive">
                            {errors.customer_name.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customer_email" className="text-xs font-semibold">
                            Alamat Email <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customer_email"
                            type="email"
                            placeholder="budi@example.com"
                            disabled={isSubmitting}
                            aria-invalid={!!errors.customer_email}
                            className="text-xs h-9 rounded-xl focus-visible:ring-violet-600"
                            {...register("customer_email")}
                          />
                          {errors.customer_email && (
                            <p className="text-[11px] font-medium text-destructive">
                              {errors.customer_email.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="customer_phone" className="text-xs font-semibold">
                            Nomor WhatsApp / HP <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customer_phone"
                            type="tel"
                            placeholder="081234567890"
                            disabled={isSubmitting}
                            aria-invalid={!!errors.customer_phone}
                            className="text-xs h-9 rounded-xl focus-visible:ring-violet-600"
                            {...register("customer_phone")}
                          />
                          {errors.customer_phone && (
                            <p className="text-[11px] font-medium text-destructive">
                              {errors.customer_phone.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Pemilih Wilayah Berjenjang (Cascading Dropdown) */}
                    <div className="space-y-3 pt-3 border-t border-border/70">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Wilayah Tujuan Pengiriman</span>
                        {isLoadingCities && (
                          <span className="text-[10px] text-violet-700 flex items-center gap-1 font-normal lowercase">
                            <Loader2 className="h-3 w-3 animate-spin" /> memuat kota...
                          </span>
                        )}
                      </h4>

                      {/* Dropdown Provinsi */}
                      <div className="space-y-1">
                        <Label htmlFor="shipping_province_id" className="text-xs font-semibold">
                          Provinsi Tujuan <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <select
                            id="shipping_province_id"
                            value={selectedProvinceId}
                            onChange={handleProvinceChange}
                            disabled={isLoadingProvinces || isSubmitting}
                            className="w-full h-9 px-3 pr-8 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all disabled:opacity-50 cursor-pointer appearance-none"
                          >
                            <option value="">
                              {isLoadingProvinces
                                ? "Memuat daftar provinsi..."
                                : "-- Pilih Provinsi Tujuan --"}
                            </option>
                            {provinces.map((prov) => (
                              <option key={prov.province_id} value={prov.province_id}>
                                {prov.province_name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        {errors.shipping_province_id && (
                          <p className="text-[11px] font-medium text-destructive">
                            {errors.shipping_province_id.message}
                          </p>
                        )}
                      </div>

                      {/* Dropdown Kota / Kabupaten */}
                      <div className="space-y-1">
                        <Label htmlFor="shipping_city_id" className="text-xs font-semibold">
                          Kota / Kabupaten Tujuan <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <select
                            id="shipping_city_id"
                            value={selectedCityId}
                            onChange={handleCityChange}
                            disabled={!selectedProvinceId || isLoadingCities || isSubmitting}
                            className="w-full h-9 px-3 pr-8 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all disabled:opacity-50 cursor-pointer appearance-none"
                          >
                            <option value="">
                              {!selectedProvinceId
                                ? "-- Pilih provinsi terlebih dahulu --"
                                : isLoadingCities
                                ? "Memuat daftar kota/kabupaten..."
                                : cities.length === 0
                                ? "Tidak ada kota ditemukan"
                                : "-- Pilih Kota/Kabupaten --"}
                            </option>
                            {cities.map((city) => (
                              <option key={city.city_id} value={city.city_id}>
                                {city.type} {city.city_name} {city.postal_code ? `(${city.postal_code})` : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                        {errors.shipping_city_id && (
                          <p className="text-[11px] font-medium text-destructive">
                            {errors.shipping_city_id.message}
                          </p>
                        )}
                      </div>

                      {/* Kode Pos */}
                      <div className="space-y-1">
                        <Label htmlFor="shipping_postal_code" className="text-xs font-semibold">
                          Kode Pos <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="shipping_postal_code"
                          placeholder="Contoh: 12190"
                          maxLength={5}
                          disabled={isSubmitting}
                          aria-invalid={!!errors.shipping_postal_code}
                          className="text-xs h-9 rounded-xl focus-visible:ring-violet-600"
                          {...register("shipping_postal_code")}
                        />
                        {errors.shipping_postal_code && (
                          <p className="text-[11px] font-medium text-destructive">
                            {errors.shipping_postal_code.message}
                          </p>
                        )}
                      </div>

                      {/* Alamat Lengkap */}
                      <div className="space-y-1">
                        <Label htmlFor="shipping_address" className="text-xs font-semibold">
                          Alamat Lengkap Rumah / Kantor <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="shipping_address"
                          placeholder="Nama jalan, nomor rumah/kantor, RT/RW, kelurahan, kecamatan, dan patokan alamat..."
                          rows={2}
                          disabled={isSubmitting}
                          aria-invalid={!!errors.shipping_address}
                          className="text-xs rounded-xl focus-visible:ring-violet-600 resize-none"
                          {...register("shipping_address")}
                        />
                        {errors.shipping_address && (
                          <p className="text-[11px] font-medium text-destructive">
                            {errors.shipping_address.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 3. Pemilihan Kurir & Layanan Pengiriman */}
                    <div className="space-y-3 pt-3 border-t border-border/70">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-violet-700" />
                          <span>Pilih Ekspedisi Kurir</span>
                        </h4>
                        {shippingRatesData?.provider_mode && (
                          <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground px-1.5 py-0">
                            {shippingRatesData.provider_mode === "LIVE_RAJAONGKIR" ? "Live RajaOngkir" : "Engine V2"}
                          </Badge>
                        )}
                      </div>

                      {/* Segmented Buttons 4 Kurir */}
                      <div className="grid grid-cols-4 gap-2">
                        {COURIER_OPTIONS.map((c) => {
                          const isSelected = selectedCourier === c.code;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => setSelectedCourier(c.code)}
                              className={`p-2 rounded-xl text-center border font-bold text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 shadow-xs ring-1 ring-violet-600"
                                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              }`}
                            >
                              <span className="block text-xs font-extrabold">{c.tag}</span>
                              <span className="text-[9px] font-normal opacity-80 block truncate">
                                {c.name.split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Kartu Pilihan Layanan Kurir */}
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-semibold">
                          Layanan Pengiriman Tersedia:
                        </Label>

                        {/* State Loading Tarif */}
                        {isLoadingRates ? (
                          <div className="p-6 rounded-xl border border-dashed border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 text-center space-y-2">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-violet-700" />
                            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                              Menghitung ongkir resmi {selectedCourier.toUpperCase()}...
                            </p>
                          </div>
                        ) : ratesError ? (
                          <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>{ratesError} Silakan pilih kurir lain.</span>
                          </div>
                        ) : !selectedCityId ? (
                          <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                            Pilih kota/kabupaten tujuan di atas untuk melihat pilihan tarif ongkir.
                          </div>
                        ) : shippingRatesData?.services && shippingRatesData.services.length > 0 ? (
                          <div className="space-y-2">
                            {shippingRatesData.services.map((svc) => {
                              const isChecked = selectedService?.service === svc.service;
                              return (
                                <div
                                  key={svc.service}
                                  onClick={() => setSelectedService(svc)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                    isChecked
                                      ? "border-violet-600 bg-violet-50/60 dark:bg-violet-950/40 shadow-xs ring-1 ring-violet-600"
                                      : "border-border/80 bg-card hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        isChecked
                                          ? "border-violet-700 bg-violet-700 text-white"
                                          : "border-muted-foreground/40 bg-background"
                                      }`}
                                    >
                                      {isChecked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-xs text-foreground">
                                          {selectedCourier.toUpperCase()} - {svc.service}
                                        </span>
                                        {svc.etd && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                                            <Clock className="h-2.5 w-2.5" />
                                            <span>ETD: {svc.etd} hari</span>
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {svc.description}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-xs font-bold text-violet-700 dark:text-violet-400">
                                      {formatPrice(svc.cost)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                            Tidak ada layanan ongkir yang tersedia.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Rincian Ringkasan Biaya Real-Time */}
                    <div className="space-y-2 pt-3 border-t border-border/70">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Ringkasan Pembayaran
                      </h4>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal Produk ({totalItems} barang)</span>
                          <span className="font-semibold text-foreground">{formatPrice(totalPrice)}</span>
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>Bobot Paket</span>
                          <span className="font-semibold text-foreground">
                            {formatWeight(totalWeightGrams)} ({chargeableWeightKg} kg tagihan)
                          </span>
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>
                            Ongkos Kirim
                            {selectedService && ` (${selectedCourier.toUpperCase()} - ${selectedService.service})`}
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedService ? formatPrice(selectedService.cost) : "Pilih kota & kurir"}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline pt-2 border-t border-border/70">
                          <span className="text-sm font-bold text-foreground">Total Tagihan Akhir</span>
                          <span className="text-lg font-extrabold text-violet-700 dark:text-violet-400">
                            {formatPrice(finalTotalPayment)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Alert Error Backend */}
                    {errorMessage && (
                      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Tombol Eksekusi Checkout */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || !selectedCityId || !selectedService}
                      className="w-full h-11 bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyiapkan Pembayaran Midtrans...
                        </>
                      ) : !selectedCityId ? (
                        "Pilih Kota Tujuan Terlebih Dahulu"
                      ) : !selectedService ? (
                        "Pilih Layanan Pengiriman"
                      ) : (
                        `Bayar ${formatPrice(finalTotalPayment)} Sekarang`
                      )}
                    </Button>

                    <p className="text-[10px] text-center text-muted-foreground">
                      Pembayaran aman terintegrasi otomatis dengan Midtrans Payment Gateway.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
