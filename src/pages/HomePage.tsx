import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Search,
  Truck,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Tag,
  AlertCircle,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import { getCategories, type CategoryWithCount } from '../services/categories'
import {
  getFeaturedProducts,
  getPopularProducts,
  type ProductWithCategory,
} from '../services/products'
import { ProductCard } from '../components/common/ProductCard'
import { ProductCardSkeleton } from '../components/ui/Skeleton'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithCategory[]>([])
  const [popularProducts, setPopularProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true)
      setError(null)

      try {
        const [catsRes, featRes, popRes] = await Promise.all([
          getCategories(),
          getFeaturedProducts(4),
          getPopularProducts(4),
        ])

        if (catsRes.error || featRes.error || popRes.error) {
          const err = catsRes.error || featRes.error || popRes.error
          console.error('Home data load error:', err)
          setError(err?.message || 'Failed to load products from database.')
        }

        if (catsRes.data) setCategories(catsRes.data)
        if (featRes.data) setFeaturedProducts(featRes.data)
        if (popRes.data) setPopularProducts(popRes.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadHomeData()
  }, [])

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION WITH EMBEDDED SEARCH BAR */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        {/* Subtle patterned background glow */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-neutral-700/30 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-3xl space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/80 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Contemporary Fashion Drop • Dhaka & Nationwide</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Redefining Modern Style at{' '}
              <span className="text-amber-300 italic">{BRAND.name}</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-neutral-300 font-light leading-relaxed">
              Explore curated festive ethnics, signature streetwear, and premium wardrobe staples crafted with breathable textiles and timeless craftsmanship.
            </p>

            {/* Embedded Search Bar in Hero */}
            <form
              onSubmit={handleHeroSearch}
              className="mt-6 flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-900/90 p-2 shadow-2xl backdrop-blur-md max-w-2xl"
            >
              <div className="flex flex-1 items-center gap-3 px-3 py-1 w-full">
                <Search className="h-5 w-5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Panjabi, linen shirts, oversized tees, denims..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-neutral-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-xs font-bold text-neutral-950 hover:bg-amber-300 transition-all cursor-pointer shadow-md"
              >
                <span>Search</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Trust highlights */}
            <div className="pt-6 border-t border-neutral-800/80 grid grid-cols-3 gap-4 text-xs text-neutral-400">
              <div>
                <div className="font-bold text-white">৳2,000+</div>
                <div>Free Delivery in BD</div>
              </div>
              <div>
                <div className="font-bold text-white">Cash on Delivery</div>
                <div>Across 64 Districts</div>
              </div>
              <div>
                <div className="font-bold text-white">100% Authentic</div>
                <div>Quality Tested Fabrics</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Error Banner (if any) */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Notice: {error}. Showing available catalog.</span>
          </div>
        </div>
      )}

      {/* 2. CATEGORIES SECTION (LOADED FROM SUPABASE) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Departments</span>
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Shop by Category
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Select a fashion category to explore real available collections.
            </p>
          </div>
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-900 hover:text-amber-700 transition-colors"
          >
            <span>View All Categories</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-neutral-200 bg-white p-4 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-500">
            No categories available in database.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-neutral-900 transition-all text-left"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {cat.product_count} styles
                  </span>
                  <h3 className="font-serif text-base font-bold text-neutral-900 mt-2 group-hover:text-amber-800 transition-colors">
                    {cat.name}
                  </h3>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-neutral-500 group-hover:text-neutral-900">
                  <span>Browse</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. FEATURED PRODUCTS (FROM SUPABASE) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              <Tag className="h-3.5 w-3.5 text-rose-600" />
              <span>Special Drops & Discounts</span>
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Featured Products
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Handpicked season highlights with exclusive savings.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-900 hover:text-amber-700 transition-colors"
          >
            <span>View All Products</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
            No featured products currently available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. PROMOTIONAL SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900 p-8 sm:p-14 text-white">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-4 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
                <Sparkles className="h-3 w-3" />
                <span>Limited Edition Seasonal Campaign</span>
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                Outfit Avenue Signature Capsule 2026
              </h3>
              <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
                Tailored with fine cottons and premium stitch density for lasting comfort across Dhaka, Chittagong, Sylhet, and all 64 districts of Bangladesh. Enjoy free delivery on orders above ৳2,000.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition-colors shadow-md"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Shop The Capsule</span>
                </Link>
                <Link
                  to="/categories"
                  className="rounded-xl border border-neutral-700 bg-neutral-800/80 px-5 py-3 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
                >
                  Explore Categories
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-800/80 p-6 backdrop-blur-xs text-center space-y-3 w-full max-w-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Customer Promise
                </span>
                <div className="divide-y divide-neutral-700/60 text-xs text-neutral-300">
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Cash on Delivery</span>
                    <span className="font-bold text-white">Available</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Dhaka Metro</span>
                    <span className="font-bold text-white">24-48 Hours</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span>Easy Exchange</span>
                    <span className="font-bold text-white">7 Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. POPULAR PRODUCTS (FROM SUPABASE) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              <span>Trending Now</span>
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Popular Styles
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Best-selling apparel and customer wardrobe favorites.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-900 hover:text-amber-700 transition-colors"
          >
            <span>See Entire Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : popularProducts.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
            No products currently available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. SERVICE TRUST PILLARS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="h-10 w-10 rounded-xl bg-neutral-950 text-amber-300 flex items-center justify-center mb-3">
              <Truck className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">Nationwide Delivery</h4>
            <p className="text-xs text-neutral-500 mt-1">
              Fast courier dispatch reaching all 64 districts in Bangladesh.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="h-10 w-10 rounded-xl bg-neutral-950 text-amber-300 flex items-center justify-center mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">Authentic Craftsmanship</h4>
            <p className="text-xs text-neutral-500 mt-1">
              Premium tailored garments inspected for fit, colorfastness, and stitching.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="h-10 w-10 rounded-xl bg-neutral-950 text-amber-300 flex items-center justify-center mb-3">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">7-Day Easy Exchange</h4>
            <p className="text-xs text-neutral-500 mt-1">
              Hassle-free size or fit adjustments backed by Dhaka customer support.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
