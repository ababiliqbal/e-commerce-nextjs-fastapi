'use client';

import React, { useState, useEffect } from "react";
import { X, MapPin, Phone, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/useAuthStore";

interface ShippingProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShippingProfileModal({
  isOpen,
  onClose,
}: ShippingProfileModalProps) {
  const { user, getShippingProfile, saveShippingProfile } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; address?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const existing = getShippingProfile(user.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhone(existing?.customer_phone || "");
      setAddress(existing?.shipping_address || "");
      setErrors({});
    }
  }, [isOpen, user, getShippingProfile]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { phone?: string; address?: string } = {};

    // Validasi Nomor Telepon
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      newErrors.phone = "Nomor telepon wajib diisi";
    } else if (cleanPhone.length < 10) {
      newErrors.phone = "Nomor telepon minimal 10 digit";
    } else if (!/^\d+$/.test(cleanPhone)) {
      newErrors.phone = "Nomor telepon hanya boleh berisi angka";
    } else if (/[<>]/.test(cleanPhone)) {
      newErrors.phone = "Karakter < dan > tidak diizinkan demi keamanan";
    }

    // Validasi Alamat
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      newErrors.address = "Alamat pengiriman wajib diisi";
    } else if (cleanAddress.length < 10) {
      newErrors.address = "Alamat pengiriman minimal 10 karakter";
    } else if (/[<>]/.test(cleanAddress)) {
      newErrors.address = "Karakter < dan > tidak diizinkan demi keamanan";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    saveShippingProfile(user.id, cleanPhone, cleanAddress);
    setIsSaving(false);
    toast.success("Profil pengiriman berhasil disimpan!");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shipping-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop click area */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border/80 rounded-2xl shadow-2xl p-6 sm:p-7 z-10 animate-in zoom-in-95 duration-200">
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-start gap-3 pb-4 border-b border-border">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-700/10 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="shipping-modal-title"
              className="text-lg font-bold text-foreground"
            >
              Profil Pengiriman Saya
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Simpan informasi kontak dan alamat default agar Anda tidak perlu
              mengetik ulang saat checkout.
            </p>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Field Nomor Telepon */}
          <div className="space-y-1.5">
            <Label
              htmlFor="shipping-phone"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Nomor Telepon Default</span>
            </Label>
            <Input
              id="shipping-phone"
              type="tel"
              placeholder="081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs font-medium text-destructive mt-1">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Field Alamat Pengiriman */}
          <div className="space-y-1.5">
            <Label
              htmlFor="shipping-address"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Alamat Lengkap Pengiriman</span>
            </Label>
            <Textarea
              id="shipping-address"
              rows={4}
              placeholder="Tuliskan nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, dan kode pos..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
              aria-invalid={!!errors.address}
            />
            {errors.address && (
              <p className="text-xs font-medium text-destructive mt-1">
                {errors.address}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer rounded-xl h-10 px-4"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              size="sm"
              className="cursor-pointer rounded-xl h-10 px-5 bg-violet-700 hover:bg-violet-800 text-white font-medium shadow-xs"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Simpan Profil</span>
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShippingProfileModal;
