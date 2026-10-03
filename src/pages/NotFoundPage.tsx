import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { BRAND } from '../lib/brand'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800 mb-6">
        <Compass className="h-8 w-8" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
        404 • Page Not Found
      </span>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 mt-2">
        This Avenue Doesn't Exist
      </h1>
      <p className="text-sm text-neutral-600 max-w-md mt-2">
        The page you are looking for may have been moved, renamed, or is currently unavailable.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to {BRAND.name}</span>
        </Link>
        <Link
          to="/shop"
          className="rounded-xl border border-neutral-300 px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Explore Shop
        </Link>
      </div>
    </div>
  )
}
