import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  Trash2,
  Plus,
  Minus,
  PackageOpen,
  AlertTriangle,
  RotateCcw,
  X,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import { useCart } from '../context/CartContext'
import { getProductsByIds } from '../services/products'

const FREE_SHIPPING_THRESHOLD = 2000
const DELIVERY_CHARGE = 80

export const CartPage: React.FC = () => {
  const { items, updateQuantity, removeItem, clearCart, subtotal, totalItems, syncCartItems } = useCart()
  const [validating, setValidating] = useState(false)
  const [validationDone, setValidationDone] = useState(false)
  const hasValidated = useRef(false)

  // ── Live validation: fetch product data once on mount ─────────────────────
  useEffect(() => {
    if (hasValidated.current || items.length === 0) {
      setValidationDone(true)
      return
    }
    hasValidated.current = true

    const productIds = [...new Set(items.map((i) => i.productId))]
    setValidating(true)

    getProductsByIds(productIds).then(({ data }) => {
      if (data) {
        syncCartItems(data)
      }
      setValidating(false)
      setValidationDone(true)
    })
  }, []) // run once on mount

  // ── Derived totals ────────────────────────────────────────────────────────
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DELIVERY_CHARGE
  const grandTotal = subtotal + shippingCost

  // Separate available vs unavailable items
  const availableItems = items.filter((i) => i.isAvailable)
  const unavailableItems = items.filter((i) => !i.isAvailable)
  const hasUnavailable = unavailableItems.length > 0

  // ── Empty cart state ──────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-neutral-100 flex items-center justify-center">
            <PackageOpen className="h-12 w-12 text-neutral-400" />
          </div>
        </div>
        <h1 className="font-serif text-3xl font-bold text-neutral-900">Your cart is empty</h1>
        <p className="text-neutral-500 max-w-sm mx-auto text-sm">
          You haven't added anything yet. Browse the shop to discover something you'll love.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-8 py-3.5 text-sm font-bold text-white hover:bg-neutral-800 transition-all shadow-md"
        >
          <ShoppingBag className="h-4 w-4" />
          Browse Shop
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-neutral-200 pb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Shopping Cart
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {validating ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                Verifying stock availability…
              </span>
            ) : (
              <>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your bag — review before
                checkout at {BRAND.name}.
              </>
            )}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all"
            aria-label="Clear entire cart"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Cart
          </button>
        )}
      </div>

      {/* Unavailability Warning Banner */}
      {validationDone && hasUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">Some items are no longer available</p>
            <p className="text-amber-700 text-xs mt-0.5">
              {unavailableItems.map((i) => i.name).join(', ')} {unavailableItems.length === 1 ? 'has' : 'have'}{' '}
              been removed from sale or is out of stock. Please remove {unavailableItems.length === 1 ? 'it' : 'them'}{' '}
              before proceeding to checkout.
            </p>
          </div>
          <button
            type="button"
            className="text-amber-600 hover:text-amber-900 transition-colors shrink-0"
            onClick={() => unavailableItems.forEach((i) => removeItem(i.productId))}
            aria-label="Remove all unavailable items"
            title="Remove all unavailable items"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ── Cart Items List ─────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
            {/* Table Header */}
            <div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 hidden sm:grid sm:grid-cols-12 gap-2">
              <span className="sm:col-span-5">Product</span>
              <span className="sm:col-span-2 text-center">Unit Price</span>
              <span className="sm:col-span-2 text-center">Qty</span>
              <span className="sm:col-span-2 text-right">Subtotal</span>
              <span className="sm:col-span-1"></span>
            </div>

            <div className="divide-y divide-neutral-100">
              {items.map((item) => {
                const isUnavailable = !item.isAvailable || item.stock <= 0
                const hasDiscount = item.discountPrice != null && item.discountPrice < item.originalPrice
                const lineTotal = item.unitPrice * item.quantity

                return (
                  <div
                    key={item.id}
                    className={`px-5 py-5 transition-colors ${isUnavailable ? 'bg-rose-50/40' : ''}`}
                  >
                    {/* Unavailable badge */}
                    {isUnavailable && (
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                        <AlertTriangle className="h-3 w-3" />
                        {item.stock <= 0 ? 'Out of Stock' : 'Unavailable — remove before checkout'}
                      </div>
                    )}

                    <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center gap-4">
                      {/* Product: image + name — col-span-5 */}
                      <div className="flex items-center gap-3 sm:col-span-5 min-w-0">
                        <div
                          className={`h-18 w-18 shrink-0 rounded-xl border overflow-hidden bg-neutral-100 ${
                            isUnavailable ? 'border-rose-200 opacity-60' : 'border-neutral-200'
                          }`}
                          style={{ width: '72px', height: '72px' }}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center p-1">
                              <ShoppingBag className="h-6 w-6 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                            {BRAND.name}
                          </p>
                          <Link
                            to={`/product/${item.slug}`}
                            className={`block text-sm font-bold leading-snug line-clamp-2 hover:text-amber-800 transition-colors ${
                              isUnavailable ? 'text-neutral-400' : 'text-neutral-900'
                            }`}
                          >
                            {item.name}
                          </Link>
                          {item.categoryName && (
                            <p className="text-[11px] text-neutral-400 mt-0.5">{item.categoryName}</p>
                          )}
                          {/* Mobile-only: unit price below name */}
                          <div className="mt-1 sm:hidden">
                            <span className="text-xs font-semibold text-neutral-700">
                              {BRAND.currency.symbol}{item.unitPrice.toLocaleString('en-BD')}
                            </span>
                            {hasDiscount && (
                              <span className="ml-1.5 text-xs line-through text-neutral-400">
                                {BRAND.currency.symbol}{item.originalPrice.toLocaleString('en-BD')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Unit Price — col-span-2, desktop only */}
                      <div className="hidden sm:flex sm:col-span-2 flex-col items-center">
                        <span className="text-sm font-semibold text-neutral-900">
                          {BRAND.currency.symbol}{item.unitPrice.toLocaleString('en-BD')}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs line-through text-neutral-400">
                            {BRAND.currency.symbol}{item.originalPrice.toLocaleString('en-BD')}
                          </span>
                        )}
                        {hasDiscount && (
                          <span className="text-[10px] font-bold text-rose-600 mt-0.5">Sale</span>
                        )}
                      </div>

                      {/* Quantity Controls — col-span-2 */}
                      <div className="sm:col-span-2 flex items-center justify-start sm:justify-center gap-2">
                        <div className={`inline-flex items-center rounded-lg border bg-neutral-50 ${isUnavailable ? 'border-neutral-200 opacity-50' : 'border-neutral-200'}`}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={isUnavailable || item.quantity <= 1}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-3 text-sm font-bold text-neutral-900 select-none min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={isUnavailable || item.quantity >= item.stock}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Max stock hint */}
                        {!isUnavailable && item.quantity >= item.stock && (
                          <span className="text-[10px] text-amber-700 font-medium hidden sm:inline">Max</span>
                        )}
                      </div>

                      {/* Line Subtotal — col-span-2 */}
                      <div className="sm:col-span-2 text-left sm:text-right">
                        <span
                          className={`font-serif text-base font-bold ${
                            isUnavailable ? 'text-neutral-400 line-through' : 'text-neutral-950'
                          }`}
                        >
                          {BRAND.currency.symbol}{lineTotal.toLocaleString('en-BD')}
                        </span>
                        {/* Stock count hint */}
                        {!isUnavailable && item.stock <= 10 && (
                          <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                            Only {item.stock} left
                          </p>
                        )}
                      </div>

                      {/* Remove — col-span-1 */}
                      <div className="sm:col-span-1 flex items-center justify-start sm:justify-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          aria-label={`Remove ${item.name} from cart`}
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Trust / Shipping Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-3.5 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                Free shipping on orders over{' '}
                <span className="font-semibold text-neutral-900">
                  {BRAND.currency.symbol}{FREE_SHIPPING_THRESHOLD.toLocaleString('en-BD')}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Cash on delivery available nationwide</span>
            </div>
          </div>

          {/* Continue Shopping link */}
          <div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* ── Order Summary Sidebar ───────────────────────────────────────── */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-5 sticky top-24">
            <h2 className="font-serif text-xl font-bold text-neutral-900 pb-4 border-b border-neutral-100">
              Order Summary
            </h2>

            {/* Line items summary */}
            <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-1">
              {availableItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-2 text-neutral-600">
                  <span className="flex-1 line-clamp-1 text-xs">
                    {item.name}
                    <span className="text-neutral-400"> × {item.quantity}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-neutral-900">
                    {BRAND.currency.symbol}
                    {(item.unitPrice * item.quantity).toLocaleString('en-BD')}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-3 text-sm border-t border-neutral-100 pt-4">
              <div className="flex justify-between text-neutral-600">
                <span>
                  Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold text-neutral-900">
                  {BRAND.currency.symbol}{subtotal.toLocaleString('en-BD')}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Delivery (Bangladesh)</span>
                <span className={`font-semibold ${shippingCost === 0 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                  {shippingCost === 0
                    ? 'FREE'
                    : `${BRAND.currency.symbol}${DELIVERY_CHARGE.toLocaleString('en-BD')}`}
                </span>
              </div>
              {shippingCost > 0 && (
                <p className="text-[11px] text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2">
                  Add{' '}
                  <span className="font-semibold text-neutral-700">
                    {BRAND.currency.symbol}
                    {(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString('en-BD')}
                  </span>{' '}
                  more to unlock free shipping.
                </p>
              )}
              <div className="pt-3 border-t border-neutral-100 flex justify-between items-baseline">
                <span className="text-base font-bold text-neutral-900">Estimated Total</span>
                <div className="text-right">
                  <span className="font-serif text-2xl font-black text-neutral-950">
                    {BRAND.currency.symbol}{grandTotal.toLocaleString('en-BD')}
                  </span>
                  <div className="text-[10px] text-neutral-400 mt-0.5">VAT &amp; Taxes Included</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-1">
              <Link
                to="/checkout"
                aria-disabled={hasUnavailable || totalItems === 0}
                onClick={(e) => (hasUnavailable || totalItems === 0) && e.preventDefault()}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all shadow-md ${
                  hasUnavailable || totalItems === 0
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none'
                    : 'bg-neutral-950 text-white hover:bg-neutral-800'
                }`}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {hasUnavailable && (
                <p className="text-[11px] text-rose-600 text-center">
                  Remove unavailable items to continue.
                </p>
              )}
              <Link
                to="/shop"
                className="w-full inline-flex items-center justify-center rounded-xl border border-neutral-200 py-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>

            <p className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 text-center">
              Official store checkout —{' '}
              <span className="font-semibold text-neutral-700">{BRAND.name}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
