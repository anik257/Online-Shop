/**
 * Payment Gateway Architecture for Outfit Avenue
 *
 * Implements real payment integration architecture:
 * - Cash on Delivery (active & operative)
 * - bKash Tokenized Checkout (via Edge Functions)
 * - Nagad Online Payment (via Edge Functions)
 * - Online / Debit & Credit Cards (SSLCommerz via Edge Functions)
 *
 * Security:
 * - Secret credentials (app keys, passwords, merchant keys) are NEVER exposed to client.
 * - Server-side Edge Functions handle gateway interaction and verification.
 * - Transactions only become "paid" upon verification from actual gateway API.
 */

import { supabase } from '../lib/supabase'

export type PaymentMethodCode = 'cod' | 'bkash' | 'nagad' | 'card'

export type GatewayIntegrationStatus = 'active' | 'configured' | 'pending_credentials'

export interface PaymentGatewayConfig {
  id: PaymentMethodCode
  name: string
  subtitle: string
  badge?: string
  status: GatewayIntegrationStatus
  description: string
  provider: string
  supportedCurrencies: string[]
  instructions: string
  feeNotice: string
  isSelectableForOrder: boolean
  requiredSecrets?: string[]
}

export const PAYMENT_GATEWAY_CONFIGS: Record<PaymentMethodCode, PaymentGatewayConfig> = {
  cod: {
    id: 'cod',
    name: 'Cash on Delivery',
    subtitle: 'Pay cash when you receive the parcel',
    badge: 'Available Nationwide',
    status: 'active',
    description: 'Pay cash directly to the delivery rider upon inspecting the parcel.',
    provider: 'In-house courier delivery partner (Steadfast / Pathao / RedX)',
    supportedCurrencies: ['BDT'],
    instructions: 'Please keep the exact cash amount ready for the delivery executive.',
    feeNotice: 'No additional collection fee.',
    isSelectableForOrder: true,
  },
  bkash: {
    id: 'bkash',
    name: 'bKash Direct',
    subtitle: 'Instant mobile payment via bKash gateway',
    badge: 'Edge Function Gateway',
    status: 'configured',
    description: 'Direct payment via bKash Merchant Payment Gateway (v1.2.0-pg tokenized checkout).',
    provider: 'bKash PGW (Merchant API)',
    supportedCurrencies: ['BDT'],
    instructions: 'You will be redirected to the secure bKash payment window to complete transaction with your bKash PIN.',
    feeNotice: 'Standard 1.5% gateway charge absorbed by Outfit Avenue.',
    isSelectableForOrder: true,
    requiredSecrets: ['BKASH_APP_KEY', 'BKASH_APP_SECRET', 'BKASH_USERNAME', 'BKASH_PASSWORD'],
  },
  nagad: {
    id: 'nagad',
    name: 'Nagad Online',
    subtitle: 'Pay securely using Nagad digital wallet',
    badge: 'Edge Function Gateway',
    status: 'configured',
    description: 'Direct merchant payment via Bangladesh Post Office Nagad Payment Gateway.',
    provider: 'Nagad Merchant Gateway API',
    supportedCurrencies: ['BDT'],
    instructions: 'Secure mobile payment gateway via Nagad digital wallet API.',
    feeNotice: 'Zero customer convenience fee.',
    isSelectableForOrder: true,
    requiredSecrets: ['NAGAD_MERCHANT_ID', 'NAGAD_PUBLIC_KEY', 'NAGAD_PRIVATE_KEY'],
  },
  card: {
    id: 'card',
    name: 'Debit / Credit Card',
    subtitle: 'Visa, Mastercard, UnionPay & Amex',
    badge: 'Edge Function Gateway',
    status: 'configured',
    description: 'Secure 3D-Secure 2.0 card checkout powered by SSLCommerz Bangladesh gateway switch.',
    provider: 'SSLCommerz Gateway Switch',
    supportedCurrencies: ['BDT'],
    instructions: 'Redirects to 128-bit SSL encrypted bank gateway with two-factor SMS OTP verification.',
    feeNotice: 'Bank transaction charges covered by Outfit Avenue.',
    isSelectableForOrder: true,
    requiredSecrets: ['SSLCOMMERZ_STORE_ID', 'SSLCOMMERZ_STORE_PASS'],
  },
}

export interface InitiatePaymentPayload {
  orderId: string
  orderNumber: string
  amount: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  paymentMethod: PaymentMethodCode
  callbackUrl?: string
}

export interface GatewayInitiateResult {
  success: boolean
  status: 'initiated' | 'credentials_required' | 'gateway_error' | 'cod' | 'failed'
  redirectUrl?: string
  paymentId?: string
  provider?: string
  message: string
  missingCredentials?: string[]
  instructions?: string
  orderId?: string
  orderNumber?: string
}

export interface VerifyPaymentPayload {
  orderId: string
  paymentMethod: PaymentMethodCode
  paymentId?: string
  trxId?: string
  valId?: string
  status?: string
}

export interface GatewayVerifyResult {
  success: boolean
  verified: boolean
  paymentStatus: 'paid' | 'pending' | 'failed' | 'cancelled'
  transactionId?: string
  message?: string
  orderId?: string
}

const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || ''

/**
 * Initiates payment via secure Supabase Edge Function
 */
export async function initiateGatewayPayment(
  payload: InitiatePaymentPayload
): Promise<GatewayInitiateResult> {
  // Cash on Delivery is handled directly in database without gateway redirection
  if (payload.paymentMethod === 'cod') {
    return {
      success: true,
      status: 'cod',
      message: 'Cash on Delivery order registered successfully.',
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
    }
  }

  try {
    const callbackUrl =
      payload.callbackUrl || `${window.location.origin}/payment/callback`

    const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/initiate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        callbackUrl,
      }),
    })

    const data = await response.json()

    if (!response.ok && data.status !== 'credentials_required') {
      return {
        success: false,
        status: 'gateway_error',
        provider: data.provider || payload.paymentMethod,
        message: data.error || data.message || 'Payment initiation failed.',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
      }
    }

    if (data.status === 'credentials_required') {
      return {
        success: false,
        status: 'credentials_required',
        provider: data.provider,
        message: data.message,
        missingCredentials: data.missingCredentials,
        instructions: data.instructions,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
      }
    }

    if (data.success && data.redirectUrl) {
      return {
        success: true,
        status: 'initiated',
        redirectUrl: data.redirectUrl,
        paymentId: data.paymentId,
        provider: data.provider,
        message: 'Redirecting to payment gateway...',
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
      }
    }

    return {
      success: false,
      status: 'gateway_error',
      message: data.message || 'Unable to establish payment session.',
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error communicating with payment service'
    return {
      success: false,
      status: 'gateway_error',
      message: msg,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
    }
  }
}

/**
 * Verifies payment via secure Supabase Edge Function
 */
export async function verifyGatewayPayment(
  payload: VerifyPaymentPayload
): Promise<GatewayVerifyResult> {
  try {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok && !data.paymentStatus) {
      return {
        success: false,
        verified: false,
        paymentStatus: 'failed',
        message: data.error || data.message || 'Payment verification endpoint error.',
        orderId: payload.orderId,
      }
    }

    return {
      success: Boolean(data.success),
      verified: Boolean(data.verified),
      paymentStatus: data.paymentStatus || (data.verified ? 'paid' : 'failed'),
      transactionId: data.transactionId,
      message: data.message,
      orderId: payload.orderId,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Payment verification network error'
    return {
      success: false,
      verified: false,
      paymentStatus: 'failed',
      message: msg,
      orderId: payload.orderId,
    }
  }
}

/**
 * Fallback: Switch an unpaid online order to Cash on Delivery
 */
export async function switchOrderToCashOnDelivery(
  orderId: string
): Promise<{ success: boolean; orderNumber?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('switch_order_to_cod', {
      p_order_id: orderId,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const res = data as any
    return {
      success: true,
      orderNumber: res.order_number,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to switch payment method'
    return { success: false, error: msg }
  }
}

/**
 * Format payment method code into human-friendly label
 */
export function formatPaymentMethod(method: string): string {
  const norm = (method || '').toLowerCase()
  switch (norm) {
    case 'cod':
      return 'Cash on Delivery'
    case 'bkash':
      return 'bKash'
    case 'nagad':
      return 'Nagad'
    case 'card':
      return 'Credit / Debit Card'
    case 'online':
      return 'Online Payment'
    default:
      return method.toUpperCase()
  }
}

