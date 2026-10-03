import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Info,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import {
  verifyGatewayPayment,
  switchOrderToCashOnDelivery,
  type PaymentMethodCode,
} from '../services/paymentGateways'

export const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || ''
  const paymentMethod = (searchParams.get('payment_method') ||
    searchParams.get('paymentMethod') ||
    'bkash') as PaymentMethodCode
  const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId') || undefined
  const trxId = searchParams.get('trx_id') || searchParams.get('trxId') || undefined
  const valId = searchParams.get('val_id') || searchParams.get('valId') || undefined
  const statusParam = searchParams.get('status')?.toLowerCase()

  const [state, setState] = useState<'verifying' | 'success' | 'failed' | 'cancelled' | 'unverified'>(
    'verifying'
  )
  const [transactionId, setTransactionId] = useState<string | null>(trxId || null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [isSwitchingCod, setIsSwitchingCod] = useState(false)

  useEffect(() => {
    let isMounted = true

    const runVerification = async () => {
      if (!orderId) {
        if (isMounted) {
          setState('failed')
          setErrorMessage('Missing order identification parameter.')
        }
        return
      }

      // Handle user cancellation on provider page
      if (statusParam === 'cancel' || statusParam === 'cancelled') {
        const res = await verifyGatewayPayment({
          orderId,
          paymentMethod,
          status: 'cancelled',
        })
        if (isMounted) {
          setState('cancelled')
          setErrorMessage(res.message || 'Payment was cancelled by the user on the gateway.')
        }
        return
      }

      // Handle failure reported by provider
      if (statusParam === 'fail' || statusParam === 'failed') {
        const res = await verifyGatewayPayment({
          orderId,
          paymentMethod,
          status: 'failed',
        })
        if (isMounted) {
          setState('failed')
          setErrorMessage(res.message || 'Payment transaction failed or was declined by provider.')
        }
        return
      }

      // Perform server-side gateway verification
      try {
        const res = await verifyGatewayPayment({
          orderId,
          paymentMethod,
          paymentId,
          trxId,
          valId,
        })

        if (!isMounted) return

        if (res.verified && res.paymentStatus === 'paid') {
          setState('success')
          setTransactionId(res.transactionId || null)
        } else if (res.message && res.message.includes('credentials are not configured')) {
          setState('unverified')
          setErrorMessage(res.message)
        } else {
          setState('failed')
          setErrorMessage(
            res.message ||
              'Payment could not be verified with the payment gateway. Payment can only be marked as Paid with verified provider confirmation.'
          )
        }
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Verification network error'
        setState('failed')
        setErrorMessage(msg)
      }
    }

    runVerification()

    return () => {
      isMounted = false
    }
  }, [orderId, paymentMethod, paymentId, trxId, valId, statusParam])

  // Fetch order number for buttons
  useEffect(() => {
    if (!orderId) return
    // Fetch order number if available
    const orderNumParam = searchParams.get('order_number') || searchParams.get('orderNumber')
    if (orderNumParam) {
      setOrderNumber(orderNumParam)
    }
  }, [orderId, searchParams])

  // Handle Switch to Cash on Delivery fallback
  const handleSwitchToCod = async () => {
    if (!orderId) return
    setIsSwitchingCod(true)

    const res = await switchOrderToCashOnDelivery(orderId)
    setIsSwitchingCod(false)

    if (res.success && res.orderNumber) {
      navigate(`/order-confirmation/${res.orderNumber}`, { replace: true })
    } else {
      setErrorMessage(res.error || 'Failed to switch payment method to Cash on Delivery.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm text-center space-y-6">
        {/* ── State: Verifying ────────────────────────────────────────── */}
        {state === 'verifying' && (
          <div className="py-12 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-neutral-900">
              Verifying Payment with Provider...
            </h1>
            <p className="text-xs text-neutral-600 max-w-md mx-auto">
              We are communicating with the payment provider to securely verify your transaction.
              Please do not close or refresh this window.
            </p>
          </div>
        )}

        {/* ── State: Verified Success ─────────────────────────────────── */}
        {state === 'success' && (
          <div className="py-6 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified by Provider
              </span>
              <h1 className="font-serif text-2xl font-bold text-neutral-900">
                Payment Received & Verified!
              </h1>
              <p className="text-xs text-neutral-600 mt-1 max-w-md mx-auto">
                Your payment was successfully confirmed and verified by the payment gateway.
              </p>
            </div>

            {transactionId && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 max-w-sm mx-auto text-left space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">
                  Transaction Reference
                </span>
                <p className="font-mono text-xs font-bold text-neutral-900 break-all">
                  {transactionId}
                </p>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {orderNumber ? (
                <Link
                  to={`/order-confirmation/${orderNumber}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  <span>View Order Confirmation</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors shadow-xs"
                >
                  <span>Continue Shopping</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── State: Cancelled by User ────────────────────────────────── */}
        {state === 'cancelled' && (
          <div className="py-6 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
              <RotateCcw className="h-8 w-8" />
            </div>

            <div>
              <h1 className="font-serif text-2xl font-bold text-neutral-900">
                Payment Was Cancelled
              </h1>
              <p className="text-xs text-neutral-600 mt-1 max-w-md mx-auto">
                You cancelled the transaction before completing payment on the gateway window.
                Your reserved order is saved in our system.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 max-w-md mx-auto text-left text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                Want to complete your order without card/online payment?
              </p>
              <p className="text-[11px] text-amber-800">
                You can switch this order to <strong>Cash on Delivery</strong> with one click and pay
                in cash when the parcel arrives at your door.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSwitchToCod}
                disabled={isSwitchingCod}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSwitchingCod ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Switching to COD...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Complete with Cash on Delivery</span>
                  </>
                )}
              </button>

              <Link
                to="/cart"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <span>Return to Cart</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── State: Failed Payment ───────────────────────────────────── */}
        {state === 'failed' && (
          <div className="py-6 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <XCircle className="h-9 w-9" />
            </div>

            <div>
              <h1 className="font-serif text-2xl font-bold text-neutral-900">
                Payment Verification Failed
              </h1>
              <p className="text-xs text-neutral-600 mt-1 max-w-md mx-auto">
                {errorMessage ||
                  'The payment transaction could not be verified by the payment gateway.'}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 max-w-md mx-auto text-left text-xs text-neutral-700 space-y-1">
              <p className="font-bold flex items-center gap-1 text-neutral-900">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                Security & Integrity Guarantee:
              </p>
              <p className="text-[11px] text-neutral-600">
                {BRAND.name} never marks transactions as "Paid" without cryptographic verification
                from the actual payment provider.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSwitchToCod}
                disabled={isSwitchingCod}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSwitchingCod ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Switching to COD...</span>
                  </>
                ) : (
                  <span>Switch to Cash on Delivery</span>
                )}
              </button>

              <Link
                to="/checkout"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-neutral-200 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <span>Retry Checkout</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── State: Unverified / Credentials Missing ─────────────────── */}
        {state === 'unverified' && (
          <div className="py-6 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200 mb-2">
                Gateway Configuration Notice
              </span>
              <h1 className="font-serif text-2xl font-bold text-neutral-900">
                Gateway Verification Pending
              </h1>
              <p className="text-xs text-neutral-600 mt-1 max-w-md mx-auto">
                {errorMessage ||
                  'Payment credentials are required in your Supabase environment secrets to verify transactions.'}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 max-w-md mx-auto text-left text-xs space-y-1">
              <p className="font-bold text-neutral-900">No Fake Payments Permitted</p>
              <p className="text-[11px] text-neutral-600">
                In strict accordance with payment integrity standards, orders cannot be marked as
                Paid without live verification from the payment provider.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSwitchToCod}
                disabled={isSwitchingCod}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSwitchingCod ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Switching...</span>
                  </>
                ) : (
                  <span>Convert to Cash on Delivery</span>
                )}
              </button>

              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-neutral-200 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <span>Return to Shop</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
