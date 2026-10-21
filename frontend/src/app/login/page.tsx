'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { resolveApiUrl } from "@/lib/api";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
  password: z
    .string()
    .min(1, "Kata sandi wajib diisi")
    .regex(/^[^<>]*$/, "Input tidak boleh mengandung karakter tag HTML (< atau >)"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, accessToken, setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
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
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const loginUrl = resolveApiUrl("/api/v1/auth/login");
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        let detail = "Email atau kata sandi tidak sesuai";
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
      toast.success(`Selamat datang kembali, ${authData.user.full_name}!`);
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
        let detail = "Autentikasi Google gagal atau ditolak oleh server";
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
      toast.success(`Berhasil masuk via Google! Halo, ${authData.user.full_name}`);
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

        {/* Kartu Login */}
        <Card className="border border-border/80 shadow-2xl rounded-2xl backdrop-blur-xs bg-card/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700/10 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-1 ring-violet-700/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              Masuk ke Akun
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Akses riwayat pesanan dan belanja lebih cepat di{" "}
              <span className="font-semibold text-violet-700 dark:text-violet-400">
                Amba Shop
              </span>
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
                    <span>Memverifikasi akun Google...</span>
                  </div>
                ) : (
                  <div className="w-full flex justify-center [&>div]:w-full [&>div>iframe]:mx-auto">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        toast.error("Login Google gagal atau dibatalkan.");
                      }}
                      shape="rectangular"
                      theme="outline"
                      size="large"
                      width="100%"
                      text="signin_with"
                    />
                  </div>
                )}
              </div>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-border"></div>
                <span className="shrink-0 mx-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  atau masuk dengan email
                </span>
                <div className="grow border-t border-border"></div>
              </div>
            </div>

            {/* Form Login Kredensial Lokal */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Field Email */}
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold text-foreground">
                  Alamat Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-email"
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                    Kata Sandi
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11 text-sm rounded-xl focus-visible:ring-violet-700/30 focus-visible:border-violet-700"
                    disabled={isLoading || isGoogleLoading}
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    id="login-password-toggle"
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

              {/* Tombol Submit */}
              <Button
                id="login-submit-button"
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-11 mt-2 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-violet-700/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </span>
                ) : (
                  <span>Masuk Sekarang</span>
                )}
              </Button>
            </form>

            {/* Navigasi ke Halaman Registrasi */}
            <div className="pt-2 text-center text-xs sm:text-sm text-muted-foreground">
              Belum memiliki akun?{" "}
              <Link
                id="login-to-register-link"
                href="/register"
                className="font-bold text-violet-700 dark:text-violet-400 hover:underline transition-all"
              >
                Daftar Sekarang
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
