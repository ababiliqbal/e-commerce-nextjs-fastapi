'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PayButton } from "@/components/PayButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { getPrimaryProductImage } from "@/types/product";
import { toast } from "sonner";

const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(3, "Nama lengkap minimal 3 karakter")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
  customer_email: z
    .string()
    .email("Format email tidak valid"),
  customer_phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit angka")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)")
    .regex(/^\d+$/, "Nomor telepon hanya boleh berisi angka"),
  shipping_address: z
    .string()
    .min(10, "Alamat pengiriman minimal 10 karakter")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { items, updateQuantity, removeItem, clearCart, getTotalPrice, setLastOrderId } =
    useCartStore();
  const { user, accessToken, getShippingProfile, saveShippingProfile } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      shipping_address: "",
    },
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Smart Auto-Fill: Isi otomatis dari profil pengguna atau pesanan terakhir
  useEffect(() => {
    let isSubscribed = true;

    async function autoFillUserData() {
      if (!user) return;

      const profile = getShippingProfile(user.id);
      let phone = profile?.customer_phone || "";
      let address = profile?.shipping_address || "";

      // Jika di store belum ada nomor HP atau alamat, coba ambil dari pesanan terakhir via GET /api/v1/orders/me
      if ((!phone || !address) && accessToken) {
        try {
          const res = await apiFetch("/api/v1/orders/me");
          if (res.ok) {
            const myOrders = await res.json();
            if (Array.isArray(myOrders) && myOrders.length > 0) {
              const latestOrder = myOrders[0];
              if (!phone && latestOrder.customer_phone) {
                phone = latestOrder.customer_phone;
              }
              if (!address && latestOrder.shipping_address) {
                address = latestOrder.shipping_address;
              }
              // Simpan data dari pesanan terakhir ke store
              if (phone && address) {
                saveShippingProfile(user.id, phone, address);
              }
            }
          }
        } catch {
          // Abaikan jika gagal mengambil histori pesanan
        }
      }

      if (isSubscribed) {
        reset({
          customer_name: user.full_name || "",
          customer_email: user.email || "",
          customer_phone: phone,
          shipping_address: address,
        });
      }
    }

    autoFillUserData();

    return () => {
      isSubscribed = false;
    };
  }, [user, accessToken, getShippingProfile, saveShippingProfile, reset]);



  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Keranjang belanja Anda masih kosong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sepertinya Anda belum menambahkan produk apapun ke dalam keranjang belanja.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link href="/">Mulai Belanja</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalPrice = getTotalPrice();

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        shipping_address: data.shipping_address,
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const res = await apiFetch("/api/v1/orders/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });


      if (!res.ok) {
        let detail = "Terjadi kesalahan saat memproses pesanan";
        try {
          const errorData = await res.json();
          if (errorData.detail) {
            detail =
              typeof errorData.detail === "string"
                ? errorData.detail
                : JSON.stringify(errorData.detail);
          }
        } catch {
          // fallback default detail
        }
        setErrorMessage(detail);
        toast.error(detail);
        setIsSubmitting(false);
        return;
      }

      const orderData = await res.json();
      setLastOrderId(orderData.id);

      // Otomatis simpan profil pengiriman ke useAuthStore untuk transaksi berikutnya jika user login
      if (user) {
        saveShippingProfile(user.id, data.customer_phone, data.shipping_address);
      }

      clearCart();
      router.push(`/order-success/${orderData.id}`);
    } catch (err) {
      console.error("Gagal melakukan checkout:", err);
      const errMsg =
        "Gagal terhubung ke server backend. Pastikan server berjalan di port 8000.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Lanjut Belanja
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Keranjang Belanja
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Kolom Kiri: Daftar Item Keranjang */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPrimaryProductImage(item)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Harga Satuan: {formatPrice(item.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sisa Stok: {item.stock_quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Kontrol Kuantitas */}
                      <div className="flex items-center gap-1.5 border border-border/60 rounded-md p-1 bg-background">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-7 w-7 rounded cursor-pointer"
                          aria-label="Kurangi kuantitas"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_quantity}
                          className="h-7 w-7 rounded cursor-pointer"
                          aria-label="Tambah kuantitas"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Subtotal Item */}
                      <div className="text-right min-w-24">
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>

                      {/* Tombol Hapus */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kolom Kanan: Ringkasan & Form Guest Checkout */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-border/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">
                    Ringkasan & Informasi Checkout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Rincian Harga */}
                  <div className="space-y-2 border-b border-border/60 pb-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total Item</span>
                      <span>{items.reduce((acc, curr) => acc + curr.quantity, 0)} barang</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-foreground pt-2">
                      <span>Total Pembayaran</span>
                      <span className="text-primary text-lg">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>

                  {/* Form Guest Checkout */}
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="customer_name">Nama Lengkap</Label>
                      <Input
                        id="customer_name"
                        placeholder="Contoh: Budi Santoso"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.customer_name}
                        {...register("customer_name")}
                      />
                      {errors.customer_name && (
                        <p className="text-xs font-medium text-destructive">
                          {errors.customer_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="customer_email">Alamat Email</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        placeholder="Contoh: budi@example.com"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.customer_email}
                        {...register("customer_email")}
                      />
                      {errors.customer_email && (
                        <p className="text-xs font-medium text-destructive">
                          {errors.customer_email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="customer_phone">Nomor Telepon / WhatsApp</Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.customer_phone}
                        {...register("customer_phone")}
                      />
                      {errors.customer_phone && (
                        <p className="text-xs font-medium text-destructive">
                          {errors.customer_phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="shipping_address">Alamat Pengiriman</Label>
                      <Textarea
                        id="shipping_address"
                        placeholder="Masukkan alamat lengkap pengiriman beserta kode pos"
                        rows={3}
                        disabled={isSubmitting}
                        aria-invalid={!!errors.shipping_address}
                        {...register("shipping_address")}
                      />
                      {errors.shipping_address && (
                        <p className="text-xs font-medium text-destructive">
                          {errors.shipping_address.message}
                        </p>
                      )}
                    </div>

                    {/* Alert Pesan Error Backend */}
                    {errorMessage && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                        {errorMessage}
                      </div>
                    )}

                    <PayButton
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Menyiapkan Pembayaran Midtrans..."
                      ) : (
                        `Bayar ${formatPrice(totalPrice)}`
                      )}
                    </PayButton>
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
