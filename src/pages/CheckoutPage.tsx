import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Truck,
  Lock,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Loader2,
  Info,
  Check,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import { useCart } from '../context/CartContext'
import { BANGLADESH_DIVISIONS } from '../data/bangladeshLocations'
import {
  PAYMENT_GATEWAY_CONFIGS,
  initiateGatewayPayment,
  switchOrderToCashOnDelivery,
  type PaymentMethodCode,
} from '../services/paymentGateways'
import {
  placeCustomerOrder,
  verifyCartBeforeCheckout,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_DELIVERY_CHARGE,
  type CartVerificationResult,
} from '../services/orders'

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate()
  const { items, clearCart } = useCart()

  // Form State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [division, setDivision] = useState('Dhaka')
  const [district, setDistrict] = useState('Dhaka')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('cod')

  // Form Validation & Error States
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  // UI & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifiedCart, setVerifiedCart] = useState<CartVerificationResult | null>(null)
  const [credentialsNotice, setCredentialsNotice] = useState<{
    provider: string
    message: string
    missingCredentials?: string[]
    orderId: string
    orderNumber: string
  } | null>(null)
  const [isSwitchingCod, setIsSwitchingCod] = useState(false)

  // Update district options whenever division changes
  const currentDivisionDistricts = useMemo(() => {
    const selected = BANGLADESH_DIVISIONS.find((d) => d.name === division)
    return selected ? selected.districts : []
  }, [division])

  // Reset district if current district is not in new division
  useEffect(() => {
    if (currentDivisionDistricts.length > 0 && !currentDivisionDistricts.includes(district)) {
      setDistrict(currentDivisionDistricts[0])
    }
  }, [division, currentDivisionDistricts, district])

  // Perform server-side pre-flight price and stock verification on mount / items change
  useEffect(() => {
    let isCancelled = false

    async function checkDatabasePrices() {
      if (items.length === 0) return

      setIsVerifying(true)
      const result = await verifyCartBeforeCheckout(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      )

      if (!isCancelled) {
        setVerifiedCart(result)
        setIsVerifying(false)
      }
    }

    checkDatabasePrices()

    return () => {
      isCancelled = true
    }
  }, [items])

  // Verified figures from live DB or fallback to current cart calculations
  const displaySubtotal = useMemo(() => {
    if (verifiedCart && verifiedCart.isValid) {
      return verifiedCart.subtotal
    }
    return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  }, [verifiedCart, items])

  const deliveryCharge = useMemo(() => {
    if (displaySubtotal >= FREE_SHIPPING_THRESHOLD) return 0
    return STANDARD_DELIVERY_CHARGE
  }, [displaySubtotal])

  const grandTotal = displaySubtotal + deliveryCharge

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required'
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Please enter a valid full name'
    }

    const cleanPhone = phone.trim().replace(/[-+\s]/g, '')
    // Bangladesh mobile number pattern: starts with 013-019 (11 digits) or +8801...
    const bdPhoneRegex = /^(01[3-9]\d{8}|8801[3-9]\d{8})$/
    if (!phone.trim()) {
      errors.phone = 'Mobile phone number is required'
    } else if (!bdPhoneRegex.test(cleanPhone)) {
      errors.phone = 'Enter a valid 11-digit Bangladesh phone (e.g. 01712345678)'
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address or leave blank'
    }

    if (!division.trim()) {
      errors.division = 'Please select your division'
    }

    if (!district.trim()) {
      errors.district = 'Please select your district'
    }

    if (!address.trim()) {
      errors.address = 'Detailed delivery address is required'
    } else if (address.trim().length < 8) {
      errors.address = 'Please include house number, road name, and area'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Order Submit
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmissionError(null)

    if (items.length === 0) {
      setSubmissionError('Your cart is empty. Please add items before checking out.')
      return
    }

    if (!validateForm()) {
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await placeCustomerOrder(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          division: division.trim(),
          district: district.trim(),
          area: area.trim() || undefined,
          address: address.trim(),
          deliveryNotes: deliveryNotes.trim() || undefined,
          paymentMethod,
        },
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      )

      if (error || !data) {
        setSubmissionError(
          error || 'Failed to place order. Please review your details and try again.'
        )
        setIsSubmitting(false)
        return
      }

      // Success! Clear cart from browser storage & memory
      clearCart()

      // If Cash on Delivery, redirect immediately to order confirmation page
      if (paymentMethod === 'cod') {
        navigate(`/order-confirmation/${data.order_number}`, {
          state: { order: data },
          replace: true,
        })
        return
      }

      // If Online Payment Method (bKash / Nagad / Card):
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
        // Redirect to gateway payment window
        window.location.href = gatewayRes.redirectUrl
        return
      }

      if (gatewayRes.status === 'credentials_required') {
        // Show credentials modal / configuration notice
        setCredentialsNotice({
          provider: gatewayRes.provider || PAYMENT_GATEWAY_CONFIGS[paymentMethod].name,
          message: gatewayRes.message,
          missingCredentials: gatewayRes.missingCredentials,
          orderId: data.order_id,
          orderNumber: data.order_number,
        })
        return
      }

      // Other gateway error
      setSubmissionError(
        gatewayRes.message ||
          'Failed to initialize payment gateway session. You can switch to Cash on Delivery to complete your order.'
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setSubmissionError(message)
      setIsSubmitting(false)
    }
  }

  // Handle Switch to COD when credentials are not configured or gateway fails
  const handleSwitchToCodInNotice = async () => {
    if (!credentialsNotice) return
    setIsSwitchingCod(true)

    const res = await switchOrderToCashOnDelivery(credentialsNotice.orderId)
    setIsSwitchingCod(false)

    if (res.success && res.orderNumber) {
      navigate(`/order-confirmation/${res.orderNumber}`, { replace: true })
    } else {
      setSubmissionError(res.error || 'Failed to switch payment method to Cash on Delivery.')
    }
  }

  // If cart is empty
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-800 border border-amber-200">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-neutral-900">
          Your Shopping Cart is Empty
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-600">
          You need at least one available item in your shopping cart before you can proceed to checkout.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors"
          >
            <span>Explore Collection</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner / Header */}
      <div className="border-b border-neutral-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secure Guest Checkout • No Account Required</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Delivery &amp; Checkout
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-neutral-500 hidden sm:block">
            Verified Store: <span className="font-semibold text-neutral-900">{BRAND.name}</span>
          </div>
          <Link
            to="/cart"
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Modify Cart
          </Link>
        </div>
      </div>

      {/* Submission Error Banner */}
      {submissionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Unable to complete order</p>
            <p className="mt-0.5 text-xs text-rose-700">{submissionError}</p>
          </div>
        </div>
      )}

      {/* Cart Verification Alert if DB Stock/Price mismatch */}
      {verifiedCart && !verifiedCart.isValid && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Cart Availability Warning</p>
            <p className="mt-0.5 text-xs text-amber-800">{verifiedCart.error}</p>
            <Link
              to="/cart"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline"
            >
              Return to cart to update items
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} noValidate>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ── Left Column: Contact, Address, & Payment ───────────────── */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Customer Contact */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    1
                  </span>
                  <span>Contact Information</span>
                </h2>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  No Login Needed
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }))
                    }}
                    placeholder="e.g. Mahfuzur Rahman"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none ${
                      formErrors.fullName
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                        : 'border-neutral-300 focus:border-neutral-900'
                    }`}
                    required
                  />
                  {formErrors.fullName && (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone Number (Bangladesh) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }))
                    }}
                    placeholder="017XXXXXXXX"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none ${
                      formErrors.phone
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                        : 'border-neutral-300 focus:border-neutral-900'
                    }`}
                    required
                  />
                  {formErrors.phone ? (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.phone}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Rider will call this number before delivery
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Email Address <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    placeholder="mahfuz@example.com"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none ${
                      formErrors.email
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                        : 'border-neutral-300 focus:border-neutral-900'
                    }`}
                  />
                  {formErrors.email ? (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.email}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-neutral-400">
                      We will send an order receipt and dispatch notification if provided
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Bangladesh Delivery Address */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    2
                  </span>
                  <span>Delivery Address</span>
                </h2>
                <span className="text-xs text-neutral-500">64 Districts Supported</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Division */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Division <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={division}
                    onChange={(e) => {
                      setDivision(e.target.value)
                      if (formErrors.division) setFormErrors((prev) => ({ ...prev, division: '' }))
                    }}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                    required
                  >
                    {BANGLADESH_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.name}>
                        {div.name} Division
                      </option>
                    ))}
                  </select>
                  {formErrors.division && (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.division}</p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value)
                      if (formErrors.district) setFormErrors((prev) => ({ ...prev, district: '' }))
                    }}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                    required
                  >
                    {currentDivisionDistricts.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                  {formErrors.district && (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.district}</p>
                  )}
                </div>

                {/* Area / Upazila */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Area / Upazila / Thana
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Dhanmondi, Gulshan 2, Mirpur 10, or Sadar Upazila"
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                {/* Full Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Delivery Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: '' }))
                    }}
                    placeholder="House/Holding #, Flat/Apartment #, Road #, Sector/Block, Landmark (e.g. Near Lake Park)..."
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-none ${
                      formErrors.address
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                        : 'border-neutral-300 focus:border-neutral-900'
                    }`}
                    required
                  />
                  {formErrors.address && (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.address}</p>
                  )}
                </div>

                {/* Delivery Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Delivery Notes / Special Instructions{' '}
                    <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call before arrival, leave with apartment guard, deliver after 3 PM"
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    3
                  </span>
                  <span>Payment Method</span>
                </h2>
                <span className="text-xs text-neutral-500">Select preferred method</span>
              </div>

              {/* Payment Method Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* 1. Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-neutral-900 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-950'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          paymentMethod === 'cod' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-tight">Cash on Delivery</p>
                        <p
                          className={`text-xs mt-0.5 ${
                            paymentMethod === 'cod' ? 'text-neutral-300' : 'text-neutral-500'
                          }`}
                        >
                          Pay when parcel arrives
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'cod' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-950 text-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-3 text-[11px] pt-2 border-t ${
                      paymentMethod === 'cod'
                        ? 'border-neutral-800 text-neutral-300'
                        : 'border-neutral-100 text-neutral-500'
                    }`}
                  >
                    Available nationwide. Open parcel delivery inspection supported.
                  </div>
                </div>

                {/* 2. bKash Direct */}
                <div
                  onClick={() => setPaymentMethod('bkash')}
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'bkash'
                      ? 'border-pink-600 bg-pink-50/50 text-neutral-900 shadow-sm ring-1 ring-pink-600'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-pink-100 text-pink-700">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold leading-tight">bKash</p>
                          <span className="rounded bg-pink-100 px-1.5 py-0.2 text-[10px] font-semibold text-pink-700">
                            MFS Gateway
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">Instant mobile checkout</p>
                      </div>
                    </div>
                    {paymentMethod === 'bkash' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-white text-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] pt-2 border-t border-neutral-100 text-neutral-500">
                    Secure server-side tokenized checkout (v1.2.0-pg)
                  </div>
                </div>

                {/* 3. Nagad */}
                <div
                  onClick={() => setPaymentMethod('nagad')}
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'nagad'
                      ? 'border-amber-600 bg-amber-50/50 text-neutral-900 shadow-sm ring-1 ring-amber-600'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold leading-tight">Nagad</p>
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                            Digital Wallet
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">Post office digital pay</p>
                      </div>
                    </div>
                    {paymentMethod === 'nagad' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] pt-2 border-t border-neutral-100 text-neutral-500">
                    Direct Bangladesh Post Office payment gateway API
                  </div>
                </div>

                {/* 4. Debit / Credit Card */}
                <div
                  onClick={() => setPaymentMethod('card')}
                  className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/50 text-neutral-900 shadow-sm ring-1 ring-indigo-600'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold leading-tight">Online / Card</p>
                          <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
                            Cards / 3DS
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">Visa, Mastercard, Amex</p>
                      </div>
                    </div>
                    {paymentMethod === 'card' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[11px] pt-2 border-t border-neutral-100 text-neutral-500">
                    Encrypted 3D-Secure 2.0 gateway checkout (SSLCommerz)
                  </div>
                </div>
              </div>

              {/* Informative Security Notice when online payment is selected */}
              {paymentMethod !== 'cod' && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-neutral-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>
                      {PAYMENT_GATEWAY_CONFIGS[paymentMethod].name} — Secure Server-Side Checkout
                    </span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed text-[11px]">
                    Your payment will be initialized via secure server-side Supabase Edge Functions.
                    Secret payment credentials are never exposed to browser clients, and payment is
                    strictly confirmed only after validation by the actual payment provider.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Order Summary Sidebar ─────────────────────── */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-6 sticky top-24">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  {BRAND.name}
                </span>
                <h3 className="font-serif text-xl font-bold text-neutral-900 mt-0.5">
                  Order Summary
                </h3>
              </div>

              {/* Products List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => {
                  const lineTotal = item.unitPrice * item.quantity
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0"
                    >
                      <div className="h-14 w-14 shrink-0 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-900 line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Qty: <span className="font-semibold text-neutral-700">{item.quantity}</span>{' '}
                          × {BRAND.currency.symbol}
                          {item.unitPrice.toLocaleString('en-BD')}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-bold text-neutral-900">
                          {BRAND.currency.symbol}
                          {lineTotal.toLocaleString('en-BD')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 text-sm border-t border-neutral-100 pt-4">
                <div className="flex justify-between text-neutral-600">
                  <span className="flex items-center gap-1.5">
                    <span>Products Subtotal</span>
                    {isVerifying && <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {BRAND.currency.symbol}
                    {displaySubtotal.toLocaleString('en-BD')}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Charge (Bangladesh)</span>
                  <span
                    className={`font-semibold ${
                      deliveryCharge === 0 ? 'text-emerald-600' : 'text-neutral-900'
                    }`}
                  >
                    {deliveryCharge === 0 ? (
                      'FREE'
                    ) : (
                      `${BRAND.currency.symbol}${STANDARD_DELIVERY_CHARGE.toLocaleString('en-BD')}`
                    )}
                  </span>
                </div>

                {deliveryCharge > 0 && (
                  <p className="text-[11px] text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
                    Orders over{' '}
                    <span className="font-semibold text-neutral-800">
                      {BRAND.currency.symbol}
                      {FREE_SHIPPING_THRESHOLD.toLocaleString('en-BD')}
                    </span>{' '}
                    qualify for free nationwide delivery.
                  </p>
                )}

                <div className="pt-3 border-t border-neutral-100 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-bold text-neutral-900 block">Total Amount</span>
                    <span className="text-[10px] text-neutral-400">
                      {paymentMethod === 'cod' ? 'Due upon doorstep delivery' : 'Payment due'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-2xl font-black text-neutral-950">
                      {BRAND.currency.symbol}
                      {grandTotal.toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all shadow-md active:scale-98 cursor-pointer ${
                    isSubmitting
                      ? 'bg-neutral-700 text-white cursor-wait'
                      : paymentMethod === 'bkash'
                      ? 'bg-pink-600 text-white hover:bg-pink-700'
                      : paymentMethod === 'nagad'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : paymentMethod === 'card'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-neutral-950 text-white hover:bg-neutral-800'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying &amp; Placing Order...</span>
                    </>
                  ) : paymentMethod === 'cod' ? (
                    <>
                      <span>Confirm Order (Cash on Delivery)</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : paymentMethod === 'bkash' ? (
                    <>
                      <span>Proceed to bKash Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : paymentMethod === 'nagad' ? (
                    <>
                      <span>Proceed to Nagad Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <span>Proceed to Card Payment</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-neutral-400 text-center">
                  {paymentMethod === 'cod'
                    ? 'By confirming your order, you agree to inspect and accept the package upon delivery.'
                    : 'You will be securely redirected to complete payment with two-factor verification.'}
                </p>
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Doorstep delivery across all 64 districts</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {paymentMethod === 'cod'
                      ? 'Pay with cash after inspecting your parcel'
                      : 'Protected by 128-bit SSL gateway encryption'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── Gateway Credentials Required Notice Modal ──────────────────── */}
      {credentialsNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-neutral-900">
                  {credentialsNotice.provider} Gateway Setup Required
                </h3>
                <p className="text-xs font-mono text-neutral-500">
                  Order Reference: {credentialsNotice.orderNumber}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                Real Provider Verification Enforced
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                In strict accordance with payment security and integrity standards, payments can
                only be marked as <strong>"Paid"</strong> after verification by the actual payment
                gateway. Simulated fake payments are strictly prohibited.
              </p>
              {credentialsNotice.missingCredentials &&
                credentialsNotice.missingCredentials.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                      Required Supabase Secrets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {credentialsNotice.missingCredentials.map((sec) => (
                        <code
                          key={sec}
                          className="rounded-md bg-white border border-amber-300 px-2 py-0.5 text-[10px] font-mono text-amber-900 font-bold"
                        >
                          {sec}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <p className="text-xs text-neutral-600">
              Your order has been registered in the system with status <strong>Pending</strong>.
              Would you like to complete this order using <strong>Cash on Delivery</strong> instead?
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSwitchToCodInNotice}
                disabled={isSwitchingCod}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 py-3 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSwitchingCod ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Switching to COD...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Complete with Cash on Delivery</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(`/order-confirmation/${credentialsNotice.orderNumber}`, {
                    replace: true,
                  })
                }
                className="w-full sm:w-auto rounded-xl border border-neutral-200 px-4 py-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                View Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
