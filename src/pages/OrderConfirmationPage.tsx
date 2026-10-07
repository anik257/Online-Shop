import React, { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Check,
  ShoppingBag,
  Truck,
  Phone,
  MapPin,
  Clock,
  Printer,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { BRAND } from '../lib/brand'
import {
  getOrderByNumber,
  type OrderConfirmationDetails,
} from '../services/orders'
import { formatPaymentMethod } from '../services/paymentGateways'

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const location = useLocation()

  // Initial state can use router state passed from checkout for instant feedback
  const stateOrder = location.state?.order
  const [order, setOrder] = useState<OrderConfirmationDetails | null>(
    stateOrder ? (stateOrder as OrderConfirmationDetails) : null
  )
  const [isLoading, setIsLoading] = useState(!stateOrder)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function fetchOrder() {
      if (!orderNumber) {
        setError('No order number provided.')
        setIsLoading(false)
        return
      }

      // If we don't have items array in stateOrder, or we arrived directly via URL
      if (!stateOrder || !stateOrder.items || stateOrder.items.length === 0) {
        setIsLoading(true)
      }

      const { data, error: fetchErr } = await getOrderByNumber(orderNumber)

      if (!isCancelled) {
        if (fetchErr || !data) {
          if (!order) {
            setError(fetchErr || 'Order details could not be found.')
          }
        } else {
          setOrder(data)
          setError(null)
        }
        setIsLoading(false)
      }
    }

    fetchOrder()

    return () => {
      isCancelled = true
    }
  }, [orderNumber, stateOrder])

  const handleCopyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePrint = () => {
    if (!order) return

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 18
    const contentW = pageW - margin * 2
    let y = margin

    const line = () => {
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageW - margin, y)
      y += 4
    }


    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFillColor(15, 15, 15)
    doc.rect(0, 0, pageW, 22, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#FFFFFF')
    doc.text(BRAND.name.toUpperCase(), margin, 14)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#AAAAAA')
    doc.text('ORDER RECEIPT', pageW - margin, 14, { align: 'right' })
    y = 30

    // ── Order Meta ──────────────────────────────────────────────────────────
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#111111')
    doc.text(order.order_number, margin, y)
    y += 7

    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-BD', {
          year: 'numeric', month: 'long', day: 'numeric',
        })
      : ''
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#666666')
    if (orderDate) { doc.text(`Date: ${orderDate}`, margin, y); y += 5 }

    const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    doc.text(`Order Status: ${capFirst(order.order_status)}   Payment Status: ${capFirst(order.payment_status)}`, margin, y)
    y += 8
    line()

    // ── Customer & Delivery ─────────────────────────────────────────────────
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#111111')
    doc.text('CUSTOMER INFORMATION', margin, y); y += 5

    const infoLines: [string, string][] = [
      ['Name', order.customer_name],
      ['Phone', order.phone],
      ...(order.email ? [['Email', order.email] as [string, string]] : []),
      ['Address', order.address],
      ...(order.area ? [['Area', order.area] as [string, string]] : []),
      ['District', order.district],
      ['Division', `${order.division} Division`],
      ...(order.delivery_notes ? [['Note', order.delivery_notes] as [string, string]] : []),
    ]
    infoLines.forEach(([label, value]) => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#666666')
      doc.text(`${label}:`, margin, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#111111')
      const wrapped = doc.splitTextToSize(value, contentW - 35)
      doc.text(wrapped, margin + 32, y)
      y += wrapped.length * 5
    })
    y += 2
    line()

    // ── Items Table ─────────────────────────────────────────────────────────
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#111111')
    doc.text('ORDERED ITEMS', margin, y); y += 5

    // Table header
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y - 3.5, contentW, 7, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#444444')
    doc.text('PRODUCT', margin + 1, y)
    doc.text('QTY', margin + contentW * 0.6, y)
    doc.text('UNIT PRICE', margin + contentW * 0.72, y)
    doc.text('SUBTOTAL', pageW - margin - 1, y, { align: 'right' })
    y += 5
    line()

    const sym = BRAND.currency.symbol
    ;(order.items || []).forEach((item) => {
      const itemTitle = item.size ? `${item.product_name} (${item.size})` : item.product_name
      const nameLines = doc.splitTextToSize(itemTitle, contentW * 0.55)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#111111')
      doc.text(nameLines, margin + 1, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#444444')
      doc.text(String(item.quantity), margin + contentW * 0.6, y)
      doc.text(`${sym}${Number(item.unit_price).toLocaleString('en-BD')}`, margin + contentW * 0.72, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#111111')
      doc.text(`${sym}${Number(item.subtotal).toLocaleString('en-BD')}`, pageW - margin - 1, y, { align: 'right' })
      y += nameLines.length * 5 + 2
    })
    y += 2
    line()

    // ── Totals ──────────────────────────────────────────────────────────────
    const totals: [string, string, boolean][] = [
      ['Subtotal', `${sym}${Number(order.subtotal).toLocaleString('en-BD')}`, false],
      ['Delivery Charge', Number(order.delivery_charge) === 0 ? 'FREE' : `${sym}${Number(order.delivery_charge).toLocaleString('en-BD')}`, false],
      ['TOTAL AMOUNT', `${sym}${Number(order.total_amount).toLocaleString('en-BD')}`, true],
    ]
    totals.forEach(([label, value, isBold]) => {
      doc.setFontSize(isBold ? 11 : 8.5)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.setTextColor(isBold ? '#000000' : '#444444')
      doc.text(label, margin, y)
      doc.text(value, pageW - margin, y, { align: 'right' })
      y += isBold ? 8 : 6
    })
    y += 2
    line()

    // ── Payment ─────────────────────────────────────────────────────────────
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#666666')
    doc.text(`Payment Method: `, margin, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#111111')
    doc.text(formatPaymentMethod(order.payment_method), margin + 35, y)
    y += 6

    // ── Footer ──────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(15, 15, 15)
    doc.rect(0, pageH - 14, pageW, 14, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#AAAAAA')
    doc.text(`${BRAND.name} · ${BRAND.support.phone} · ${BRAND.support.email}`, pageW / 2, pageH - 6, { align: 'center' })

    // ── Save ────────────────────────────────────────────────────────────────
    const filename = `Outfit-Avenue-Order-${order.order_number}.pdf`
    doc.save(filename)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-neutral-400 mb-4" />
        <h2 className="font-serif text-2xl font-bold text-neutral-800">
          Retrieving Order Confirmation...
        </h2>
        <p className="mt-2 text-xs text-neutral-500">
          Loading order details from database for reference #{orderNumber}
        </p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-neutral-900">Order Not Found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {error || `We could not locate an order matching "${orderNumber}".`}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/shop"
            className="rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Continue Shopping
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-neutral-300 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  // Capitalize status for display
  const displayOrderStatus =
    order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).toLowerCase()
  const displayPaymentStatus =
    order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1).toLowerCase()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 print:p-0 print:space-y-4">
      {/* ── Success Banner ──────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 text-center shadow-xs space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
        </div>

        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
            Order Successfully Placed
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-950">
            Thank You, {order.customer_name}!
          </h1>
          <p className="mt-2 text-sm text-neutral-600 max-w-lg mx-auto">
            Your order has been recorded in our system. Our customer support team will contact you
            on{' '}
            <strong className="text-neutral-900">{order.phone}</strong> to confirm your details
            before dispatch.
          </p>
        </div>

        {/* Order Number Box */}
        <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm">
          <span className="text-xs font-medium text-neutral-500">Order Reference:</span>
          <span className="font-mono text-base font-bold text-neutral-950 tracking-wide">
            {order.order_number}
          </span>
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Copy Order Number"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-neutral-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Status Pills Strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Order Status */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Order Status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-base font-bold text-neutral-900">{displayOrderStatus}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Awaiting confirmation call</p>
        </div>

        {/* Payment Method */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Payment Method
          </p>
          <div className="mt-1 text-base font-bold text-neutral-900">
            {formatPaymentMethod(order.payment_method)}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {order.payment_method === 'cod'
              ? 'Pay cash upon parcel delivery'
              : 'Direct Gateway Integration'}
          </p>
        </div>

        {/* Payment Status */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Payment Status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                order.payment_status.toLowerCase() === 'paid'
                  ? 'bg-emerald-500'
                  : order.payment_status.toLowerCase() === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-base font-bold text-neutral-900">{displayPaymentStatus}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {order.payment_status.toLowerCase() === 'paid'
              ? 'Verified by Gateway'
              : order.payment_method === 'cod'
              ? 'Due at doorstep delivery'
              : 'Pending gateway verification'}
          </p>
        </div>
      </div>

      {/* ── Customer & Delivery Details ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Customer Information */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Phone className="h-4 w-4 text-neutral-500" />
            <span>Customer &amp; Contact</span>
          </h2>
          <div className="space-y-1.5 text-xs text-neutral-700">
            <p>
              <span className="text-neutral-400 font-medium">Name:</span>{' '}
              <strong className="text-neutral-900">{order.customer_name}</strong>
            </p>
            <p>
              <span className="text-neutral-400 font-medium">Mobile:</span>{' '}
              <strong className="text-neutral-900">{order.phone}</strong>
            </p>
            {order.email && (
              <p>
                <span className="text-neutral-400 font-medium">Email:</span>{' '}
                <span className="text-neutral-900">{order.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <span>Delivery Destination</span>
          </h2>
          <div className="space-y-1.5 text-xs text-neutral-700">
            <p className="leading-relaxed">
              <span className="text-neutral-400 font-medium">Address:</span>{' '}
              <span className="text-neutral-900 font-medium">{order.address}</span>
            </p>
            {order.area && (
              <p>
                <span className="text-neutral-400 font-medium">Area / Upazila:</span>{' '}
                <span className="text-neutral-900">{order.area}</span>
              </p>
            )}
            <p>
              <span className="text-neutral-400 font-medium">District &amp; Division:</span>{' '}
              <span className="text-neutral-900">
                {order.district}, {order.division} Division
              </span>
            </p>
            {order.delivery_notes && (
              <p className="pt-1 text-[11px] text-neutral-500 italic">
                Note: &ldquo;{order.delivery_notes}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Ordered Products List ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-neutral-100 bg-neutral-50/60 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-neutral-500" />
            <span>Ordered Products ({order.items?.length || 0})</span>
          </h2>
          <span className="text-xs font-semibold text-amber-800">{BRAND.name}</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {(order.items || []).map((item) => (
            <div key={item.id} className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-14 w-14 shrink-0 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900 line-clamp-1">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Qty: <span className="font-semibold text-neutral-800">{item.quantity}</span> ×{' '}
                    {BRAND.currency.symbol}
                    {Number(item.unit_price).toLocaleString('en-BD')}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="font-serif text-sm font-bold text-neutral-950">
                  {BRAND.currency.symbol}
                  {Number(item.subtotal).toLocaleString('en-BD')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals Summary */}
        <div className="border-t border-neutral-100 bg-neutral-50/40 p-6 space-y-2.5">
          <div className="flex justify-between text-xs text-neutral-600">
            <span>Subtotal</span>
            <span className="font-semibold text-neutral-900">
              {BRAND.currency.symbol}
              {Number(order.subtotal).toLocaleString('en-BD')}
            </span>
          </div>

          <div className="flex justify-between text-xs text-neutral-600">
            <span>Delivery Charge</span>
            <span
              className={`font-semibold ${
                Number(order.delivery_charge) === 0 ? 'text-emerald-600' : 'text-neutral-900'
              }`}
            >
              {Number(order.delivery_charge) === 0
                ? 'FREE'
                : `${BRAND.currency.symbol}${Number(order.delivery_charge).toLocaleString('en-BD')}`}
            </span>
          </div>

          <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
            <div>
              <span className="text-sm font-bold text-neutral-900">Total Amount</span>
              <span className="block text-[11px] text-neutral-400">
                {order.payment_status.toLowerCase() === 'paid'
                  ? `Paid via ${formatPaymentMethod(order.payment_method)}`
                  : order.payment_method === 'cod'
                  ? 'To be collected upon parcel delivery'
                  : 'Pending gateway verification'}
              </span>
            </div>
            <span className="font-serif text-2xl font-black text-neutral-950">
              {BRAND.currency.symbol}
              {Number(order.total_amount).toLocaleString('en-BD')}
            </span>
          </div>
        </div>
      </div>

      {/* ── What Happens Next / Delivery Steps ───────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4 print:hidden">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-neutral-500" />
          <span>What Happens Next?</span>
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <Phone className="h-3.5 w-3.5" />
            </span>
            <div className="text-xs">
              <strong className="block text-neutral-900">1. Order Verification</strong>
              <p className="text-neutral-500 mt-0.5">
                Our support team will call you to confirm your delivery address.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-600" />
            </span>
            <div className="text-xs">
              <strong className="block text-neutral-900">2. Careful Packaging</strong>
              <p className="text-neutral-500 mt-0.5">
                Your items are picked from stock, quality inspected, and packed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
              <Truck className="h-3.5 w-3.5 text-neutral-600" />
            </span>
            <div className="text-xs">
              <strong className="block text-neutral-900">3. Doorstep Delivery</strong>
              <p className="text-neutral-500 mt-0.5">
                Rider delivers within 2-3 working days. Inspect parcel &amp; pay cash.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions Strip ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4 text-neutral-500" />
          <span>Print Receipt / Invoice</span>
        </button>

        <div className="flex items-center gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
