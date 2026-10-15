'use client';

import React from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  snapToken: string;
}

export function PayButton({ snapToken }: PayButtonProps) {
  const router = useRouter();

  const handlePay = () => {
    if (typeof window !== 'undefined' && window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: () => router.refresh(),
        onPending: () => router.refresh(),
        onError: () => router.refresh(),
        onClose: () => router.refresh(),
      });
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
        onClick={handlePay}
        size="lg"
        className="w-full cursor-pointer font-bold text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-98"
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Bayar Sekarang
      </Button>
    </>
  );
}

export default PayButton;
