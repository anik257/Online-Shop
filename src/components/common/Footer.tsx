import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Truck, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react'
import { BRAND } from '../../lib/brand'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-[#E8DFC9] bg-[#F7F1E3] text-neutral-700">
      {/* Service Highlights Bar */}
      <div className="border-b border-[#E8DFC9] bg-[#EFE8D8]/70 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800 shadow-2xs border border-[#E8DFC9]/60">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-900">Nationwide Delivery</h4>
                <p className="text-xs text-neutral-600">Dhaka & all 64 districts in Bangladesh</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800 shadow-2xs border border-[#E8DFC9]/60">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-900">100% Authentic</h4>
                <p className="text-xs text-neutral-600">Premium verified fabrics & stitching</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800 shadow-2xs border border-[#E8DFC9]/60">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-900">Hassle-Free Exchange</h4>
                <p className="text-xs text-neutral-600">7-day easy size exchange support</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-800 shadow-2xs border border-[#E8DFC9]/60">
                <span className="font-serif font-bold text-lg">৳</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-900">Cash on Delivery</h4>
                <p className="text-xs text-neutral-600">Inspect parcel right at your doorstep</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white font-serif font-black text-lg">
                OA
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-neutral-950">
                {BRAND.name}
              </span>
            </Link>
            <p className="max-w-sm text-sm text-neutral-600 leading-relaxed">
              Curated contemporary fashion crafted for Bangladesh's modern generation. Bringing you timeless ethnics, trendsetting streetwear, and premium everyday wardrobe essentials.
            </p>
            <div className="space-y-2 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-800 shrink-0" />
                <span>Gulshan-2, Dhaka 1212, Bangladesh</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-800 shrink-0" />
                <span>{BRAND.support.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-800 shrink-0" />
                <span>{BRAND.support.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Shop Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">Shop</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to="/shop" className="hover:text-neutral-950 transition-colors">
                  All Collections
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-neutral-950 transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/shop?category=ethnic" className="hover:text-neutral-950 transition-colors">
                  Festive & Panjabi
                </Link>
              </li>
              <li>
                <Link to="/shop?category=streetwear" className="hover:text-neutral-950 transition-colors">
                  Oversized Streetwear
                </Link>
              </li>
              <li>
                <Link to="/shop?category=casual" className="hover:text-neutral-950 transition-colors">
                  Polos & Casual Shirts
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">Help & Care</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to="/cart" className="hover:text-neutral-950 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-neutral-950 transition-colors">
                  Checkout
                </Link>
              </li>
              <li>
                <span className="text-neutral-500">Shipping & Delivery Info</span>
              </li>
              <li>
                <span className="text-neutral-500">Exchange & Return Policy</span>
              </li>
              <li>
                <Link to="/admin/login" className="text-neutral-600 hover:text-neutral-950 transition-colors">
                  Staff & Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter / Updates */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">Stay In Style</h3>
            <p className="mt-4 text-xs text-neutral-600 leading-relaxed">
              Subscribe to get exclusive early drops, seasonal discounts, and fashion styling tips.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-3 flex flex-col gap-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-950 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <span>Join Avenue Club</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom copyright and legal */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-[#E8DFC9] pt-8 text-xs text-neutral-500 sm:flex-row gap-4">
          <p>{BRAND.copyright}. All rights reserved.</p>
          <div className="flex items-center gap-3 text-neutral-600 text-xs">
            <span>Accepted Payments in Bangladesh:</span>
            <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-neutral-800 border border-[#E8DFC9]">
              Cash On Delivery
            </span>
            <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-neutral-800 border border-[#E8DFC9]">
              bKash / Nagad
            </span>
            <span className="rounded bg-white/90 px-2 py-0.5 font-medium text-neutral-800 border border-[#E8DFC9]">
              Cards
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
