import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  ArrowLeft,
  Truck,
  ShieldCheck,
  RefreshCw,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import { getProductBySlug, getRelatedProducts, type ProductWithCategory } from '../services/products'
import { useCart } from '../context/CartContext'
import { ProductCard } from '../components/common/ProductCard'
import { Skeleton } from '../components/ui/Skeleton'

export const ProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [product, setProduct] = useState<ProductWithCategory | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string>('')

if (!product) return null;

const availableSizes = Boolean(product.has_sizes && product.sizes && product.sizes.length > 0)
    ? product.sizes
    : []

  useEffect(() => {
    if (product?.has_sizes && product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0])
    } else {
      setSelectedSize('')
    }
  }, [product])

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return
      setLoading(true)
      setError(null)
      setQuantity(1)

      const { data, error: fetchErr } = await getProductBySlug(slug)

      if (fetchErr) {
        setError(fetchErr.message || 'Failed to load product details.')
        setLoading(false)
        return
      }

      if (!data) {
        setError('Product not found.')
        setLoading(false)
        return
      }

      setProduct(data)
      setLoading(false)

      // Fetch related products in the same category
      if (data.category_id) {
        const { data: related } = await getRelatedProducts(data.category_id, data.id, 4)
        if (related) setRelatedProducts(related)
      }
    }

    loadProduct()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  const isOutOfStock = product ? product.stock <= 0 : false
  const maxAvailable = product ? product.stock : 0

  const handleIncrement = () => {
    if (quantity < maxAvailable) {
      setQuantity((prev) => prev + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return
    addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        discount_price: product.discount_price,
        image_url: product.image_url,
        stock: product.stock,
        is_available: product.is_available,
        category_name: product.categories?.name,
      },
      quantity
    )

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return
    addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        discount_price: product.discount_price,
        image_url: product.image_url,
        stock: product.stock,
        is_available: product.is_available,
        category_name: product.categories?.name,
      },
      quantity
    )
    navigate('/cart')
  }

  // Loading State
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Skeleton className="aspect-square w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-6 space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-48 mt-6" />
            <Skeleton className="h-12 w-full mt-4" />
          </div>
        </div>
      </div>
    )
  }

  // Error / Not Found State
  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-neutral-900">
          Product Not Available
        </h1>
        <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">
          {error || "We couldn't find the fashion item you are looking for at Outfit Avenue."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Shop</span>
          </Link>
        </div>
      </div>
    )
  }

  const hasDiscount = product.discount_price !== null && product.discount_price < product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discount_price!) / product.price) * 100)
    : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-16">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
        <Link to="/shop" className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Shop</span>
        </Link>
        <span>/</span>
        {product.categories && (
          <>
            <Link
              to={`/shop?category=${product.categories.slug}`}
              className="hover:text-neutral-900 transition-colors"
            >
              {product.categories.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-neutral-900 font-semibold truncate max-w-[200px]">
          {product.name}
        </span>
      </div>

      {/* Main Product Presentation */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
        {/* Left: Large Product Image Canvas */}
        <div className="lg:col-span-6 sticky top-28">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100 shadow-md">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400">
                <ShoppingBag className="h-16 w-16 mb-2 opacity-50" />
                <span className="font-serif text-lg font-bold">{BRAND.name}</span>
              </div>
            )}

            {/* Discount Badge */}
            {hasDiscount && (
              <div className="absolute top-4 left-4 rounded-full bg-rose-600 px-3.5 py-1 text-xs font-bold text-white shadow-md">
                -{discountPercent}% OFF
              </div>
            )}

            {/* In-Stock Indicator */}
            <div className="absolute bottom-4 right-4">
              {isOutOfStock ? (
                <span className="rounded-full bg-neutral-950/90 backdrop-blur-xs px-3.5 py-1 text-xs font-bold text-rose-300">
                  Out of Stock
                </span>
              ) : (
                <span className="rounded-full bg-neutral-950/80 backdrop-blur-xs px-3.5 py-1 text-xs font-medium text-emerald-300">
                  ● In Stock ({product.stock} available)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {product.categories && (
              <Link
                to={`/shop?category=${product.categories.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 transition-colors mb-3"
              >
                <span>{product.categories.name}</span>
              </Link>
            )}

            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              SKU: OA-{product.slug.toUpperCase().slice(0, 10)} • Official {BRAND.name}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-5 flex items-baseline gap-3">
            {hasDiscount ? (
              <>
                <span className="font-serif text-3xl sm:text-4xl font-black text-neutral-950">
                  {BRAND.currency.symbol}{product.discount_price!.toLocaleString('en-BD')}
                </span>
                <span className="text-base text-neutral-400 line-through">
                  {BRAND.currency.symbol}{product.price.toLocaleString('en-BD')}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full ml-auto">
                  Save {BRAND.currency.symbol}{(product.price - product.discount_price!).toLocaleString('en-BD')}
                </span>
              </>
            ) : (
              <span className="font-serif text-3xl sm:text-4xl font-black text-neutral-950">
                {BRAND.currency.symbol}{product.price.toLocaleString('en-BD')}
              </span>
            )}
            <span className="text-xs text-neutral-500 font-medium">BDT (VAT Included)</span>
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Description & Highlights
            </h3>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {product.description ||
                'Crafted with premium authentic materials tailored for comfort, durability, and contemporary elegance.'}
            </p>
          </div>

          {/* Stock Notification */}
          <div className="py-2 border-y border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Inventory Status:</span>
            {isOutOfStock ? (
              <span className="font-bold text-rose-600">Currently Sold Out</span>
            ) : product.stock <= 10 ? (
              <span className="font-bold text-amber-700">
                Limited Stock: Only {product.stock} units left in Dhaka warehouse
              </span>
            ) : (
              <span className="font-semibold text-emerald-700">
                In Stock ({product.stock} units ready to ship)
              </span>
            )}
          </div>

          {/* Size Selector — only shown if product.has_sizes is ON and sizes exist */}
          {availableSizes.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Size:
                </label>
                {selectedSize && (
                  <span className="text-xs font-bold text-neutral-900">
                    Selected: {selectedSize}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-10 h-10 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSize === size
                        ? 'bg-neutral-950 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200/60'
                    }`}
                    aria-label={`Size ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector & Action Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Quantity:
              </label>

              <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="p-2.5 text-neutral-600 hover:text-neutral-950 disabled:opacity-40 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-bold text-neutral-900 min-w-10 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= maxAvailable || isOutOfStock}
                  className="p-2.5 text-neutral-600 hover:text-neutral-950 disabled:opacity-40 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {quantity >= maxAvailable && maxAvailable > 0 && (
                <span className="text-[11px] text-amber-700 font-medium">
                  Maximum available stock reached ({maxAvailable})
                </span>
              )}
            </div>

            {/* Buttons: Add to Cart and Buy Now */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all shadow-md active:scale-98 cursor-pointer ${
                  isOutOfStock
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                    : isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-950 text-white hover:bg-neutral-800'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Added {quantity} to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-950 bg-white py-4 text-sm font-bold text-neutral-950 hover:bg-neutral-50 transition-colors active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Buy Now</span>
              </button>
            </div>
          </div>

          {/* Delivery & Trust Highlights */}
          <div className="pt-6 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-600">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-50">
              <Truck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-neutral-900">BD Delivery</span>
                <span>Dhaka 24-48h, Districts 3-4 days</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-50">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-neutral-900">100% Authentic</span>
                <span>Original {BRAND.name} quality</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-50">
              <RefreshCw className="h-4 w-4 text-neutral-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-neutral-900">Easy Exchange</span>
                <span>7-day size assistance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products from Category */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>More from {product.categories?.name}</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-neutral-950">
                Related Styles You May Like
              </h2>
            </div>
            {product.categories && (
              <Link
                to={`/shop?category=${product.categories.slug}`}
                className="text-xs font-bold text-neutral-900 hover:text-amber-800 transition-colors"
              >
                View Category →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
