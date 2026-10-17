'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface PayButtonProps {
  snapToken?: string;
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => Promise<void> | void;
  children?: React.ReactNode;
  className?: string;
}

export function PayButton({
  snapToken,
  isLoading: externalLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className,
}: PayButtonProps) {
  const router = useRouter();
  const [internalLoading, setInternalLoading] = useState(false);

  const isSpinning = internalLoading || externalLoading;

  const handlePay = async () => {
    if (disabled || isSpinning) return;

    if (onClick) {
      try {
        setInternalLoading(true);
        await onClick();
      } catch (err) {
        console.error("Gagal memproses pembayaran:", err);
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses pembayaran.";
        toast.error(msg);
      } finally {
        setInternalLoading(false);
      }
      return;
    }

    if (type === 'submit') {
      return;
    }

    if (snapToken) {
      setInternalLoading(true);

      if (typeof window !== 'undefined' && window.snap) {
        try {
          window.snap.pay(snapToken, {
            onSuccess: () => {
              setInternalLoading(false);
              router.refresh();
            },
            onPending: () => {
              setInternalLoading(false);
              router.refresh();
            },
            onError: (result) => {
              console.error("Midtrans Snap onError:", result);
              setInternalLoading(false);
              toast.error("Pembayaran Midtrans gagal atau dibatalkan.");
              router.refresh();
            },
            onClose: () => {
              setInternalLoading(false);
            },
          });
        } catch (err) {
          console.error("Kesalahan eksekusi Midtrans Snap:", err);
          setInternalLoading(false);
          toast.error("Gagal membuka modul pembayaran Midtrans Snap.");
        }
      } else {
        setInternalLoading(false);
        toast.error("Modul Midtrans Snap belum siap. Silakan muat ulang halaman.");
      }
    }
  };

  return (
    <>
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
      <Button
        type={type}
        onClick={handlePay}
        size="lg"
        disabled={disabled || isSpinning}
        className={cn(
          "w-full cursor-pointer font-bold text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed",
          className
        )}
      >
        {isSpinning ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {children || "Menunggu Pembayaran..."}
          </>
        ) : children ? (
          children
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Bayar Sekarang
          </>
        )}
      </Button>
    </>
  );
}

export default PayButton;
