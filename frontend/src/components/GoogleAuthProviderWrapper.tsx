'use client';

import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface GoogleAuthProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Provider client-side untuk Google Identity Services OAuth 2.0.
 * Membungkus aplikasi agar komponen <GoogleLogin /> dapat digunakan di seluruh halaman.
 */
export function GoogleAuthProviderWrapper({
  children,
}: GoogleAuthProviderWrapperProps) {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '293601975323-mcf0osqa7gt318a0qcg86for107vip2b.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

export default GoogleAuthProviderWrapper;
