import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search, ShoppingBag, ShieldCheck, Menu } from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { CUSTOMER_NAV_ITEMS } from '../../data/navigation'
import { SearchModal } from './SearchModal'
import { MobileNav } from './MobileNav'
import { useCart } from '../../context/CartContext'

export const Header: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { totalItems } = useCart()

  return (
    <>
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
          {/* Left: Mobile Menu Trigger + Logo */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-800 hover:bg-[#EFE8D8] hover:text-neutral-950 focus:outline-none lg:hidden"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>

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
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {CUSTOMER_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `relative py-1 text-sm font-semibold tracking-wide transition-colors duration-150 ${
                    isActive
                      ? 'text-neutral-950 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-neutral-950'
                      : 'text-neutral-700 hover:text-neutral-950'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Actions (Search, Admin Login, Cart) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-full border border-neutral-300/80 bg-white/90 px-3.5 py-2 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:bg-white hover:text-neutral-900 transition-all shadow-2xs"
              aria-label="Search items"
            >
              <Search className="h-4 w-4 text-neutral-600" />
              <span className="hidden sm:inline">Search...</span>
            </button>

            {/* Admin Login Button */}
            <Link
              to="/admin/login"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-neutral-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-neutral-800 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white transition-all duration-150"
              title="Admin Portal"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Login</span>
            </Link>

            {/* Shopping Cart Button */}
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
        </div>
      </header>

      {/* Global Interactive Modals */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenSearch={() => setIsSearchOpen(true)}
        cartCount={totalItems}
      />
    </>
  )
}
