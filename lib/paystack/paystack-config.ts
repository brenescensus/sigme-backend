// lib/paystack/paystack-config.ts

export const paystackConfig = {
  publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
  secretKey: process.env.PAYSTACK_SECRET_KEY!, // Only use this on server-side
  isTestMode: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.startsWith('pk_test_'),
};

// Validate keys on startup
if (!paystackConfig.publicKey) {
  console.error(' NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not set');
}

if (!paystackConfig.secretKey && typeof window === 'undefined') {
  console.error(' PAYSTACK_SECRET_KEY is not set');
}