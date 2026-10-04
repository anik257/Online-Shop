import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { useCart } from '../../context/CartContext'

export const Header: React.FC = () => {
  const { totalItems } = useCart()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8DFC9] bg-[#F7F1E3] transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-neutral-900 px-4 py-2 text-center text-xs font-medium text-neutral-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="hidden sm:inline-block text-neutral-400">
            🇧🇩 {BRAND.location.coverage}
          </span>
          <span className="mx-auto font-normal text-white">
            Complimentary shipping in Bangladesh on orders above <span className="font-semibold text-amber-300">৳2,000</span> | Cash on Delivery Available
          </span>
          <span className="hidden md:inline-block text-neutral-400">
            Help: {BRAND.support.phone}
          </span>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-transform hover:opacity-90"
          aria-label={BRAND.name}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white font-serif font-black text-xl shadow-xs">
            OA
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-extrabold tracking-tight text-neutral-950 sm:text-2xl">
              {BRAND.name}
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 font-semibold -mt-1 hidden sm:block">
              Dhaka • Est. 2026
            </span>
          </div>
        </Link>

        {/* Right: Cart */}
        <Link
          to="/cart"
          className="relative inline-flex items-center justify-center rounded-xl bg-neutral-950 p-2.5 text-white transition-transform hover:bg-neutral-800 active:scale-95 shadow-sm"
          aria-label={`View shopping cart${totalItems > 0 ? ` (${totalItems} items)` : ''}`}
        >
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-neutral-950 ring-2 ring-[#F7F1E3]">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
