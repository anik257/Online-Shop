import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  AlertCircle,
  Filter,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import { getCategories, type CategoryWithCount } from '../services/categories'
import { getProducts, type ProductWithCategory } from '../services/products'
import { ProductCard } from '../components/common/ProductCard'
import { ProductCardSkeleton } from '../components/ui/Skeleton'

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // State from URL or defaults
  const initialCategory = searchParams.get('category') || 'all'
  const initialSearch = searchParams.get('search') || ''
  const initialSort = (searchParams.get('sort') as any) || 'featured'

  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch)
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-asc' | 'price-desc'>(initialSort)
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  // Load Categories on mount
  useEffect(() => {
    async function loadCats() {
      const { data } = await getCategories()
      if (data) setCategories(data)
    }
    loadCats()
  }, [])

  // Sync state if URL changes externally
  useEffect(() => {
    const cat = searchParams.get('category') || 'all'
    const q = searchParams.get('search') || ''
    const s = (searchParams.get('sort') as any) || 'featured'
    setSelectedCategory(cat)
    setSearchQuery(q)
    setSortBy(s)
  }, [searchParams])

  // Fetch products from Supabase whenever filters change
  useEffect(() => {
    let isCancelled = false

    async function fetchProductsFromDb() {
      setLoading(true)
      setError(null)

      const minP = minPrice ? parseFloat(minPrice) : undefined
      const maxP = maxPrice ? parseFloat(maxPrice) : undefined

      const { data, error: fetchErr } = await getProducts({
        categorySlug: selectedCategory,
        search: searchQuery,
        sortBy,
        availability,
        minPrice: minP && !isNaN(minP) ? minP : undefined,
        maxPrice: maxP && !isNaN(maxP) ? maxP : undefined,
      })

      if (isCancelled) return

      if (fetchErr) {
        setError(fetchErr.message || 'Error fetching products from database.')
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    }

    fetchProductsFromDb()

    return () => {
      isCancelled = true
    }
  }, [selectedCategory, searchQuery, sortBy, availability, minPrice, maxPrice])

  // Update URL search params when user changes main filters
  const updateCategoryFilter = (slug: string) => {
    setSelectedCategory(slug)
    const newParams = new URLSearchParams(searchParams)
    if (slug === 'all') {
      newParams.delete('category')
    } else {
      newParams.set('category', slug)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newParams = new URLSearchParams(searchParams)
    if (searchQuery.trim()) {
      newParams.set('search', searchQuery.trim())
    } else {
      newParams.delete('search')
    }
    setSearchParams(newParams, { replace: true })
  }

  const clearAllFilters = () => {
    setSelectedCategory('all')
    setSearchQuery('')
    setSortBy('featured')
    setAvailability('all')
    setMinPrice('')
    setMaxPrice('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== 'all' ||
      searchQuery.trim() !== '' ||
      sortBy !== 'featured' ||
      availability !== 'all' ||
      minPrice !== '' ||
      maxPrice !== ''
    )
  }, [selectedCategory, searchQuery, sortBy, availability, minPrice, maxPrice])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header & Search */}
      <div className="border-b border-neutral-200 pb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
              <span>{BRAND.name} Catalog</span>
              <span>•</span>
              <span className="text-amber-700">Real Supabase Products</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
              The Shop
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Explore authentic wardrobe collections, festive attire, and contemporary essentials.
            </p>
          </div>

          {/* Quick Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 shadow-2xs w-full md:w-80"
          >
            <Search className="h-4 w-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  const newParams = new URLSearchParams(searchParams)
                  newParams.delete('search')
                  setSearchParams(newParams, { replace: true })
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Category Filter Pills (loaded from Supabase) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => updateCategoryFilter('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateCategoryFilter(cat.slug)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-neutral-950 text-white font-semibold shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span>{cat.name}</span>
              {cat.product_count !== undefined && cat.product_count > 0 && (
                <span className="ml-1.5 opacity-60 text-[10px]">({cat.product_count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar: Filters, Sort, and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Availability Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-1.5 text-xs">
            <span className="text-neutral-500 font-medium">Availability:</span>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="bg-transparent font-semibold text-neutral-900 focus:outline-none cursor-pointer"
            >
              <option value="all">All Items</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Price Range Filter Presets / Inputs */}
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-1.5 text-xs">
            <span className="text-neutral-500 font-medium">{BRAND.currency.symbol}:</span>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              className="w-14 bg-transparent text-neutral-900 font-semibold placeholder:text-neutral-400 focus:outline-none"
            />
            <span className="text-neutral-300">-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-14 bg-transparent text-neutral-900 font-semibold placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Sort Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-neutral-400">
            {loading ? 'Searching...' : `${products.length} items`}
          </span>

          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-1.5 text-xs font-medium text-neutral-700">
            <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-neutral-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                const s = e.target.value as any
                setSortBy(s)
                const newParams = new URLSearchParams(searchParams)
                newParams.set('sort', s)
                setSearchParams(newParams, { replace: true })
              }}
              className="bg-transparent font-semibold text-neutral-900 focus:outline-none cursor-pointer"
            >
              <option value="featured">Featured First</option>
              <option value="newest">Newest Drops</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-neutral-900 text-sm">Failed to Load Products</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Filter className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-neutral-900">
            No Matching Products Found
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            We couldn't find any products matching your current filters. Try changing your search query, price range, or category selection.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Real Product Grid from Supabase */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
