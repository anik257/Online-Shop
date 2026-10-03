import React, { useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { X, Search, ShoppingBag, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { CUSTOMER_NAV_ITEMS } from '../../data/navigation'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  onOpenSearch: () => void
  cartCount?: number
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  onOpenSearch,
  cartCount = 0,
}) => {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white shadow-2xl transition-transform animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-lg tracking-wider">
              OA
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-neutral-900">
              {BRAND.name}
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Search Action */}
        <div className="p-4 border-b border-neutral-100">
          <button
            onClick={() => {
              onClose()
              onOpenSearch()
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500 hover:border-neutral-300 transition-colors"
          >
            <Search className="h-4 w-4 text-neutral-400" />
            <span>Search products & collections...</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Navigation
          </p>
          {CUSTOMER_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                }`
              }
            >
              <span>{item.label}</span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </NavLink>
          ))}

          <NavLink
            to="/cart"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
              }`
            }
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span>Shopping Cart</span>
            </div>
            {cartCount > 0 ? (
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            ) : (
              <span className="text-xs text-neutral-400">0</span>
            )}
          </NavLink>

          <div className="pt-4 border-t border-neutral-100 mt-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Staff & Management
            </p>
            <NavLink
              to="/admin/login"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-neutral-500" />
                <span>Admin Login</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </NavLink>
          </div>
        </nav>

        {/* Drawer Footer Banner */}
        <div className="border-t border-neutral-100 bg-neutral-50/80 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-neutral-900" />
            <span>{BRAND.location.coverage}</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            {BRAND.support.hours}
          </p>
        </div>
      </div>
    </div>
  )
}
