// lib/billing/payment-method.ts

export type PaymentMethod = {
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
}

function isJsonObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parsePaymentMethod(
  paymentMethod: unknown
): PaymentMethod | null {
  if (!isJsonObject(paymentMethod)) return null

  return {
    brand: typeof paymentMethod.brand === 'string'
      ? paymentMethod.brand
      : undefined,
    last4: typeof paymentMethod.last4 === 'string'
      ? paymentMethod.last4
      : undefined,
    exp_month: typeof paymentMethod.exp_month === 'number'
      ? paymentMethod.exp_month
      : undefined,
    exp_year: typeof paymentMethod.exp_year === 'number'
      ? paymentMethod.exp_year
      : undefined,
  }
}
