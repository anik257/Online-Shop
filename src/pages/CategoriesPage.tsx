import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Layers, ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import { BRAND } from '../lib/brand'
import { getCategories, type CategoryWithCount } from '../services/categories'
import { getProducts, type ProductWithCategory } from '../services/products'
import { ProductCard } from '../components/common/ProductCard'
import { ProductCardSkeleton } from '../components/ui/Skeleton'

export const CategoriesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSlug = searchParams.get('category') || ''

  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [categoryProducts, setCategoryProducts] = useState<ProductWithCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Fetch categories from Supabase
  useEffect(() => {
    async function loadAllCategories() {
      setLoadingCategories(true)
      const { data, error: err } = await getCategories()
      if (err) {
        setError(err.message)
      } else if (data) {
        setCategories(data)
      }
      setLoadingCategories(false)
    }
    loadAllCategories()
  }, [])

  // 2. Fetch related products when a category is selected
  useEffect(() => {
    async function loadRelatedProducts() {
      if (!activeSlug) {
        setCategoryProducts([])
        return
      }

      setLoadingProducts(true)
      const { data, error: err } = await getProducts({
        categorySlug: activeSlug,
        sortBy: 'newest',
      })

      if (err) {
        console.error('Error fetching category products:', err)
      } else {
        setCategoryProducts(data || [])
      }
      setLoadingProducts(false)
    }

    loadRelatedProducts()
  }, [activeSlug])

  const selectCategory = (slug: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (slug === activeSlug) {
      newParams.delete('category')
    } else {
      newParams.set('category', slug)
    }
    setSearchParams(newParams)
  }

  const selectedCategoryObj = categories.find((c) => c.slug === activeSlug)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
          <Layers className="h-3.5 w-3.5 text-amber-600" />
          <span>Department Directory</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950">
          Categories
        </h1>
        <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
          Browse apparel departments loaded live from {BRAND.name} database. Click any category to view related styles.
        </p>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Notice: {error}</span>
        </div>
      )}

      {/* Categories Grid (Loaded from Supabase) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Select a Department
          </h2>
          {activeSlug && (
            <button
              onClick={() => selectCategory('')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear Selection
            </button>
          )}
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl border border-neutral-200 bg-white p-6 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, idx) => {
              const isSelected = cat.slug === activeSlug
              return (
                <div
                  key={cat.id}
                  onClick={() => selectCategory(cat.slug)}
                  className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg ring-2 ring-neutral-950'
                      : 'border-neutral-200 bg-white text-neutral-900 shadow-2xs hover:shadow-md hover:border-neutral-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isSelected ? 'text-amber-300' : 'text-neutral-400'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isSelected
                            ? 'bg-neutral-800 text-amber-300'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {cat.product_count ?? 0} items
                      </span>
                    </div>

                    <h3
                      className={`font-serif text-xl font-bold mt-4 ${
                        isSelected ? 'text-white' : 'text-neutral-900 group-hover:text-amber-800'
                      }`}
                    >
                      {cat.name}
                    </h3>
                    <p
                      className={`text-xs mt-2 line-clamp-2 ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-500'
                      }`}
                    >
                      Curated styles and seasonal collections in {cat.name}.
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-neutral-200/40 flex items-center justify-between text-xs font-semibold">
                    <span>{isSelected ? 'Viewing products below' : 'Click to view products'}</span>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${
                        isSelected ? 'text-amber-300' : 'text-neutral-600'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Related Products Section (Shows when category is selected) */}
      {activeSlug && (
        <section className="pt-8 border-t border-neutral-200 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Selected Department</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-950">
                Products in {selectedCategoryObj?.name || activeSlug}
              </h2>
            </div>
            <Link
              to={`/shop?category=${activeSlug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 self-start sm:self-auto"
            >
              <span>Open in Shop with Filters</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-xs text-neutral-500">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {categoryProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
