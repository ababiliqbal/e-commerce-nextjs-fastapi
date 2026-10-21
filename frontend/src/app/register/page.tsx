'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { toast } from "sonner";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { resolveApiUrl } from "@/lib/api";

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(3, "Nama lengkap minimal 3 karakter")
      .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
    email: z
      .string()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid")
      .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        "Kata sandi harus mengandung kombinasi huruf dan angka"
      )
      .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
    confirm_password: z
      .string()
      .min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, accessToken, setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Jika sudah terautentikasi, alihkan ke halaman utama
  useEffect(() => {
    if (user && accessToken) {
      router.replace("/");
    }
  }, [user, accessToken, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const registerUrl = resolveApiUrl("/api/v1/auth/register");
      const res = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        let detail = "Gagal mendaftarkan akun baru";
        try {
          const errData = await res.json();
          if (errData.detail) {
            detail =
              typeof errData.detail === "string"
                ? errData.detail
                : JSON.stringify(errData.detail);
          }
        } catch {
          // fallback
        }
        setErrorMessage(detail);
        toast.error(detail);
        setIsLoading(false);
        return;
      }

      const authData = await res.json();
      setAuth(authData.user, authData.access_token);
      toast.success(
        `Selamat datang di Amba Shop, ${authData.user.full_name}! Akun Anda berhasil dibuat.`
      );
      router.push("/");
    } catch {
      const msg = "Terjadi gangguan koneksi ke server. Silakan coba lagi.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Token kredensial Google tidak ditemukan.");
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const googleAuthUrl = resolveApiUrl("/api/v1/auth/google");
      const res = await fetch(googleAuthUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id_token: credentialResponse.credential,
        }),
      });

      if (!res.ok) {
        let detail = "Pendaftaran via Google gagal diproses oleh server";
        try {
          const errData = await res.json();
          if (errData.detail) {
            detail =
              typeof errData.detail === "string"
                ? errData.detail
                : JSON.stringify(errData.detail);
          }
        } catch {
          // fallback
        }
        setErrorMessage(detail);
        toast.error(detail);
        setIsGoogleLoading(false);
        return;
      }

      const authData = await res.json();
      setAuth(authData.user, authData.access_token);
      toast.success(
        `Pendaftaran via Google berhasil! Selamat datang di Amba Shop, ${authData.user.full_name}`
      );
      router.push("/");
    } catch {
      const msg = "Gagal memproses autentikasi Google. Silakan coba kembali.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-linear-to-b from-background via-violet-950/5 to-background">
      <div className="w-full max-w-md">
        {/* Tombol Kembali */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-violet-700 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Kartu Registrasi */}
        <Card className="border border-border/80 shadow-2xl rounded-2xl backdrop-blur-xs bg-card/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700/10 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-1 ring-violet-700/20">
              <UserPlus className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              Buat Akun Baru
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Bergabung bersama kami di{" "}
              <span className="font-semibold text-violet-700 dark:text-violet-400">
                Amba Shop
              </span>{" "}
              dan nikmati kemudahan bertransaksi
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Banner Error */}
            {errorMessage && (
              <div
                role="alert"
                className="p-3 text-xs sm:text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2"
              >
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Opsi Cepat: Google SSO */}
            <div className="space-y-3">
              <div className="flex justify-center w-full min-h-[44px]">
                {isGoogleLoading ? (
                  <div className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-input text-sm text-muted-foreground bg-muted/40 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-700" />
                    <span>Mendaftarkan akun Google...</span>
                  </div>
                ) : (
                  <div className="w-full flex justify-center [&>div]:w-full [&>div>iframe]:mx-auto">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        toast.error("Pendaftaran via Google gagal atau dibatalkan.");
                      }}
                      shape="rectangular"
                      theme="outline"
                      size="large"
                      width="100%"
                      text="signup_with"
                    />
                  </div>
                )}
              </div>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-border"></div>
                <span className="shrink-0 mx-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  atau daftar dengan email
                </span>
                <div className="grow border-t border-border"></div>
              </div>
            </div>

            {/* Form Registrasi Akun Baru */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Field Nama Lengkap */}
              <div className="space-y-1.5">
                <Label htmlFor="register-name" className="text-xs font-semibold text-foreground">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Contoh: Budi Santoso"
                    className="pl-9 h-11 text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
                    disabled={isLoading || isGoogleLoading}
                    aria-invalid={!!errors.full_name}
                    {...register("full_name")}
                  />
                </div>
                {errors.full_name && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              {/* Field Email */}
              <div className="space-y-1.5">
                <Label htmlFor="register-email" className="text-xs font-semibold text-foreground">
                  Alamat Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@domain.com"
                    className="pl-9 h-11 text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
                    disabled={isLoading || isGoogleLoading}
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Field Kata Sandi */}
              <div className="space-y-1.5">
                <Label htmlFor="register-password" className="text-xs font-semibold text-foreground">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 8 karakter (huruf & angka)"
                    className="pl-9 pr-10 h-11 text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
                    disabled={isLoading || isGoogleLoading}
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    id="register-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Field Konfirmasi Kata Sandi */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="register-confirm-password"
                  className="text-xs font-semibold text-foreground"
                >
                  Konfirmasi Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Ulangi kata sandi Anda"
                    className="pl-9 pr-10 h-11 text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
                    disabled={isLoading || isGoogleLoading}
                    aria-invalid={!!errors.confirm_password}
                    {...register("confirm_password")}
                  />
                  <button
                    id="register-confirm-toggle"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={
                      showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-xs font-medium text-destructive mt-1">
                    {errors.confirm_password.message}
                  </p>
                )}
              </div>

              {/* Tombol Submit */}
              <Button
                id="register-submit-button"
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-11 mt-2 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-violet-700/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membuat Akun...</span>
                  </span>
                ) : (
                  <span>Daftar Akun Baru</span>
                )}
              </Button>
            </form>

            {/* Navigasi ke Halaman Login */}
            <div className="pt-2 text-center text-xs sm:text-sm text-muted-foreground">
              Sudah memiliki akun?{" "}
              <Link
                id="register-to-login-link"
                href="/login"
                className="font-bold text-violet-700 dark:text-violet-400 hover:underline transition-all"
              >
                Masuk di Sini
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
