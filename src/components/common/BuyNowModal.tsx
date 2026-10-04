import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Zap,
  ShoppingBag,
  Truck,

  AlertTriangle,
  Loader2,
  Plus,
  Minus,
  Check,
  Banknote,
  Smartphone,
  CreditCard,
  Info,
} from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { BANGLADESH_DIVISIONS } from '../../data/bangladeshLocations'
import {
  placeCustomerOrder,
  verifyCartBeforeCheckout,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_DELIVERY_CHARGE,
} from '../../services/orders'
import {
  PAYMENT_GATEWAY_CONFIGS,
  initiateGatewayPayment,
  switchOrderToCashOnDelivery,
  type PaymentMethodCode,
} from '../../services/paymentGateways'
import type { ProductWithCategory } from '../../services/products'

interface BuyNowModalProps {
  isOpen: boolean
  onClose: () => void
  product: ProductWithCategory
  initialSize?: string
}

export const BuyNowModal: React.FC<BuyNowModalProps> = ({
  isOpen,
  onClose,
  product,
  initialSize,
}) => {
  const navigate = useNavigate()

  // Size configuration
  const hasSizes = Boolean(product.has_sizes && product.sizes && product.sizes.length > 0)
  const availableSizes = hasSizes ? product.sizes! : []
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (initialSize && availableSizes.includes(initialSize)) return initialSize
    return availableSizes[0] || ''
  })

  // Quantity
  const [quantity, setQuantity] = useState(1)

  // Customer & Delivery Address Form State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [division, setDivision] = useState('Dhaka')
  const [district, setDistrict] = useState('Dhaka')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cod')

  // Validation & Submission States
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSwitchingCod, setIsSwitchingCod] = useState(false)
  const [credentialsNotice, setCredentialsNotice] = useState<{
    provider: string
    message: string
    missingCredentials?: string[]
    orderId: string
    orderNumber: string
  } | null>(null)

  // Update selectedSize if initialSize or product changes
  useEffect(() => {
    if (hasSizes) {
      if (initialSize && availableSizes.includes(initialSize)) {
        setSelectedSize(initialSize)
      } else if (!selectedSize || !availableSizes.includes(selectedSize)) {
        setSelectedSize(availableSizes[0] || '')
      }
    } else {
      setSelectedSize('')
    }
  }, [product, initialSize, hasSizes])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Districts based on selected division
  const currentDivisionDistricts = useMemo(() => {
    const selected = BANGLADESH_DIVISIONS.find((d) => d.name === division)
    return selected ? selected.districts : []
  }, [division])

  useEffect(() => {
    if (currentDivisionDistricts.length > 0 && !currentDivisionDistricts.includes(district)) {
      setDistrict(currentDivisionDistricts[0])
    }
  }, [division, currentDivisionDistricts, district])

  if (!isOpen) return null

  // Pricing calculations
  const unitPrice =
    product.discount_price != null && product.discount_price < product.price && product.discount_price > 0
      ? Number(product.discount_price)
      : Number(product.price)

  const subtotal = unitPrice * quantity
  const deliveryCharge = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_CHARGE
  const grandTotal = subtotal + deliveryCharge

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (hasSizes && !selectedSize) {
      errors.size = 'Please select a size for this item.'
    }

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.'
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Please enter a valid full name.'
    }

    const cleanPhone = phone.trim().replace(/[-+\s]/g, '')
    const bdPhoneRegex = /^(01[3-9]\d{8}|8801[3-9]\d{8})$/
    if (!phone.trim()) {
      errors.phone = 'Mobile phone number is required.'
    } else if (!bdPhoneRegex.test(cleanPhone)) {
      errors.phone = 'Enter a valid 11-digit phone number (e.g. 01712345678).'
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!division.trim()) {
      errors.division = 'Please select a division.'
    }

    if (!district.trim()) {
      errors.district = 'Please select a district.'
    }

    if (!address.trim()) {
      errors.address = 'Full delivery address is required.'
    } else if (address.trim().length < 8) {
      errors.address = 'Please provide house/holding, road, and area details.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Order Placement
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmissionError(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Pre-flight verification with Supabase
      const verifyRes = await verifyCartBeforeCheckout([
        {
          productId: product.id,
          quantity,
        },
      ])

      if (!verifyRes.isValid) {
        setSubmissionError(verifyRes.error || 'Stock verification failed. Product may be out of stock.')
        setIsSubmitting(false)
        return
      }

      // Format delivery notes to include size when applicable
      const finalDeliveryNotes = hasSizes && selectedSize
        ? `Size: ${selectedSize}${deliveryNotes.trim() ? ` | ${deliveryNotes.trim()}` : ''}`
        : deliveryNotes.trim() || undefined

      // 2. Place order atomically via existing order service & RPC
      const { data, error } = await placeCustomerOrder(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          division: division.trim(),
          district: district.trim(),
          area: area.trim() || undefined,
          address: address.trim(),
          deliveryNotes: finalDeliveryNotes,
          paymentMethod,
        },
        [
          {
            productId: product.id,
            quantity,
            size: hasSizes && selectedSize ? selectedSize : undefined,
          },
        ]
      )

      if (error || !data) {
        setSubmissionError(error || 'Failed to place order. Please try again.')
        setIsSubmitting(false)
        return
      }

      // 3. Close modal
      onClose()

      // 4. Handle confirmation or online payment flow
      if (paymentMethod === 'cod') {
        navigate(`/order-confirmation/${data.order_number}`, {
          state: { order: data },
          replace: true,
        })
        return
      }

      // Online Gateway Flow (bKash / Nagad / Card)
      const gatewayRes = await initiateGatewayPayment({
        orderId: data.order_id,
        orderNumber: data.order_number,
        amount: data.total_amount,
        paymentMethod,
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
      })

      setIsSubmitting(false)

      if (gatewayRes.status === 'initiated' && gatewayRes.redirectUrl) {
        window.location.href = gatewayRes.redirectUrl
        return
      }

      if (gatewayRes.status === 'credentials_required') {
        setCredentialsNotice({
          provider: gatewayRes.provider || PAYMENT_GATEWAY_CONFIGS[paymentMethod].name,
          message: gatewayRes.message,
          missingCredentials: gatewayRes.missingCredentials,
          orderId: data.order_id,
          orderNumber: data.order_number,
        })
        return
      }

      // If gateway error, navigate to confirmation with notice
      navigate(`/order-confirmation/${data.order_number}`, {
        state: { order: data },
        replace: true,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setSubmissionError(msg)
      setIsSubmitting(false)
    }
  }

  // Switch to COD from credentials notice modal
  const handleSwitchToCodInNotice = async () => {
    if (!credentialsNotice) return
    setIsSwitchingCod(true)

    const res = await switchOrderToCashOnDelivery(credentialsNotice.orderId)
    setIsSwitchingCod(false)

    if (res.success && res.orderNumber) {
      onClose()
      navigate(`/order-confirmation/${res.orderNumber}`, { replace: true })
    } else {
      setSubmissionError(res.error || 'Failed to switch to Cash on Delivery.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl my-6 rounded-3xl border border-neutral-200 bg-white shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-[#F7F1E3] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 text-white">
              <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-950 leading-tight">
                Buy Now — Express Checkout
              </h2>
              <p className="text-[11px] text-neutral-600">Quick order at {BRAND.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-colors cursor-pointer"
            aria-label="Close express checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* 1. Selected Product Summary */}
          <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/70 p-4">
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-400">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-base font-bold text-neutral-950 truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {product.categories?.name || BRAND.name}
                </p>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-base font-black text-neutral-950">
                    {BRAND.currency.symbol}{unitPrice.toLocaleString('en-BD')}
                  </span>
                  {product.discount_price != null && product.discount_price < product.price && (
                    <span className="text-xs text-neutral-400 line-through">
                      {BRAND.currency.symbol}{Number(product.price).toLocaleString('en-BD')}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400 uppercase">BDT</span>
                </div>
              </div>
            </div>

            {/* Size Selector in Modal — only for products with sizes */}
            {hasSizes && (
              <div className="mt-4 pt-3 border-t border-neutral-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                    Select Size: <span className="text-rose-500">*</span>
                  </label>
                  {selectedSize && (
                    <span className="text-xs font-bold text-neutral-950">
                      Selected: {selectedSize}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size)
                        if (formErrors.size) {
                          setFormErrors((prev) => ({ ...prev, size: '' }))
                        }
                      }}
                      className={`min-w-9 h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedSize === size
                          ? 'bg-neutral-950 text-white shadow-xs'
                          : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {formErrors.size && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.size}</p>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Quantity:
              </label>

              <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="p-2 text-neutral-600 hover:text-neutral-950 disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-3 text-xs font-bold text-neutral-900 min-w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock}
                  className="p-2 text-neutral-600 hover:text-neutral-950 disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="mt-4 pt-3 border-t border-neutral-200/80 text-xs space-y-1.5 text-neutral-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-neutral-900">
                  {BRAND.currency.symbol}{subtotal.toLocaleString('en-BD')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nationwide Delivery</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="font-semibold text-emerald-600">FREE</span>
                  ) : (
                    `${BRAND.currency.symbol}${deliveryCharge}`
                  )}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-neutral-950 pt-1.5 border-t border-neutral-200">
                <span>Total Payable</span>
                <span className="text-base text-neutral-950 font-sans">
                  {BRAND.currency.symbol}{grandTotal.toLocaleString('en-BD')}
                </span>
              </div>
            </div>
          </div>

          {/* Submission Error Banner */}
          {submissionError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* 2. Customer Delivery Address Form */}
          <form onSubmit={handlePlaceOrder} id="buy-now-form" className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-neutral-500" />
              Delivery Address
            </h4>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (formErrors.fullName) setFormErrors((p) => ({ ...p, fullName: '' }))
                  }}
                  placeholder="e.g. Anik"
                  required
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-colors ${
                    formErrors.fullName
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600'
                      : 'border-neutral-300 focus:border-neutral-950'
                  }`}
                />
                {formErrors.fullName && (
                  <p className="text-[11px] text-rose-600 mt-0.5">{formErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: '' }))
                  }}
                  placeholder="01712345678"
                  required
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-colors ${
                    formErrors.phone
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600'
                      : 'border-neutral-300 focus:border-neutral-950'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-[11px] text-rose-600 mt-0.5">{formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Email Address <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formErrors.email) setFormErrors((p) => ({ ...p, email: '' }))
                }}
                placeholder="ajaj.anik180@gmail.com"
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-colors ${
                  formErrors.email
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600'
                    : 'border-neutral-300 focus:border-neutral-950'
                }`}
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-600 mt-0.5">{formErrors.email}</p>
              )}
            </div>

            {/* Division & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Division <span className="text-rose-500">*</span>
                </label>
                <select
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value)
                    if (formErrors.division) setFormErrors((p) => ({ ...p, division: '' }))
                  }}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
                >
                  {BANGLADESH_DIVISIONS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  District <span className="text-rose-500">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value)
                    if (formErrors.district) setFormErrors((p) => ({ ...p, district: '' }))
                  }}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
                >
                  {currentDivisionDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Area / Upazila */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Area / Upazila / Thana <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Dhanmondi, Gulshan, Mirpur"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
              />
            </div>

            {/* Full Street Address */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Full Delivery Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (formErrors.address) setFormErrors((p) => ({ ...p, address: '' }))
                }}
                placeholder="House / Holding, Road name, Block / Sector..."
                required
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-colors ${
                  formErrors.address
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600'
                    : 'border-neutral-300 focus:border-neutral-950'
                }`}
              />
              {formErrors.address && (
                <p className="text-[11px] text-rose-600 mt-0.5">{formErrors.address}</p>
              )}
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Delivery Notes <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Call before delivery, leave with guard"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs focus:border-neutral-950 focus:outline-none"
              />
            </div>

            {/* 3. Payment Method Selection */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Banknote className="h-4 w-4 mb-1" />
                  <span className="text-xs font-bold">Cash on Delivery</span>
                  <span className={`text-[10px] mt-0.5 ${paymentMethod === 'cod' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    Pay at Door
                  </span>
                </button>

                {/* bKash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bkash')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'bkash'
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Smartphone className="h-4 w-4 mb-1" />
                  <span className="text-xs font-bold">bKash</span>
                  <span className={`text-[10px] mt-0.5 ${paymentMethod === 'bkash' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    Mobile Pay
                  </span>
                </button>

                {/* Nagad */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('nagad')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'nagad'
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Smartphone className="h-4 w-4 mb-1" />
                  <span className="text-xs font-bold">Nagad</span>
                  <span className={`text-[10px] mt-0.5 ${paymentMethod === 'nagad' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    Mobile Pay
                  </span>
                </button>

                {/* Card / Online */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-xs font-bold">Card</span>
                  <span className={`text-[10px] mt-0.5 ${paymentMethod === 'card' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    Visa/Mastercard
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer / Place Order Button */}
        <div className="border-t border-neutral-100 bg-neutral-50/80 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] text-neutral-500 block">Total Amount</span>
            <span className="font-serif text-lg font-black text-neutral-950">
              {BRAND.currency.symbol}{grandTotal.toLocaleString('en-BD')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="buy-now-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Credentials Notice Overlay for Online Gateways */}
        {credentialsNotice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shrink-0">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {credentialsNotice.provider} Gateway Notice
                  </h3>
                  <p className="text-xs text-neutral-500">Order #{credentialsNotice.orderNumber}</p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                {credentialsNotice.message}
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                You can switch this order to <strong>Cash on Delivery</strong> with one click and pay
                when the parcel arrives at your door.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCredentialsNotice(null)}
                  className="rounded-xl border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToCodInNotice}
                  disabled={isSwitchingCod}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSwitchingCod ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Switching...</span>
                    </>
                  ) : (
                    <span>Switch to Cash on Delivery</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
