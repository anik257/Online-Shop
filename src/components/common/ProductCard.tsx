import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Eye, Check, Zap } from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { useCart } from '../../context/CartContext'
import type { ProductWithCategory } from '../../services/products'
import { BuyNowModal } from './BuyNowModal'

interface ProductCardProps {
  product: ProductWithCategory
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart()
  const [isAdded, setIsAdded] = useState(false)
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false)

  const availableSizes = Boolean(product.has_sizes && product.sizes && product.sizes.length > 0)
    ? product.sizes!
    : []
  const [selectedSize, setSelectedSize] = useState<string>(() => availableSizes[0] || '')

  const isOutOfStock = product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= 10
  const hasDiscount = product.discount_price !== null && product.discount_price < product.price

  const handleOpenBuyNow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    setIsBuyNowOpen(true)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      discount_price: product.discount_price,
      image_url: product.image_url,
      stock: product.stock,
      is_available: product.is_available,
      category_name: product.categories?.name,
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)
  }

  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discount_price!) / product.price) * 100)
    : 0

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs transition-all duration-300 hover:shadow-lg hover:border-neutral-300">
      {/* Product Image Area */}
      <div className="relative aspect-4/3 sm:aspect-square w-full overflow-hidden rounded-xl bg-neutral-100 border border-neutral-200/60">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-neutral-400">
            <ShoppingBag className="h-8 w-8 mb-1 opacity-40" />
            <span className="text-xs">{BRAND.name}</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {hasDiscount && (
            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
              -{discountPercent}% OFF
            </span>
          )}
          {product.categories && (
            <span className="rounded-full bg-neutral-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-medium text-white">
              {product.categories.name}
            </span>
          )}
        </div>

        {/* Stock Status Badge */}
        <div className="absolute bottom-2.5 right-2.5">
          {isOutOfStock ? (
            <span className="rounded-full bg-neutral-900/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-rose-300">
              Sold Out
            </span>
          ) : isLowStock ? (
            <span className="rounded-full bg-amber-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-neutral-950">
              Only {product.stock} left
            </span>
          ) : (
            <span className="rounded-full bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white">
              In Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Details Meta */}
      <div className="mt-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span>{product.categories?.name || BRAND.name}</span>
            <span className="text-neutral-500 font-mono text-[10px]">
              {product.stock > 0 ? `${product.stock} pcs` : '0 pcs'}
            </span>
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="block mt-1 font-serif text-base font-bold text-neutral-900 hover:text-amber-800 transition-colors line-clamp-1"
            title={product.name}
          >
            {product.name}
          </Link>

          {product.description && (
            <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-3 pt-2 flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="font-serif text-lg font-black text-neutral-950">
                {BRAND.currency.symbol}{product.discount_price!.toLocaleString('en-BD')}
              </span>
              <span className="text-xs text-neutral-400 line-through">
                {BRAND.currency.symbol}{product.price.toLocaleString('en-BD')}
              </span>
            </>
          ) : (
            <span className="font-serif text-lg font-black text-neutral-950">
              {BRAND.currency.symbol}{product.price.toLocaleString('en-BD')}
            </span>
          )}
          <span className="text-[10px] text-neutral-400 uppercase">BDT</span>
        </div>

        {/* Size Selection — only shown if Has Size Options is ON and sizes are available */}
        {availableSizes.length > 0 && (
          <div className="mt-3 flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Size:
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedSize(size)
                  }}
                  className={`min-w-6 h-6 px-1.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                    selectedSize === size
                      ? 'bg-neutral-950 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200/60'
                  }`}
                  title={`Select size ${size}`}
                  aria-label={`Size ${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-98 cursor-pointer ${
              isOutOfStock
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 shadow-2xs'
            }`}
            title={isOutOfStock ? 'Product is currently sold out' : 'Add to cart'}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
              </>
            )}
          </button>

          <Link
            to={`/product/${product.slug}`}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            title="View product details"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={handleOpenBuyNow}
          disabled={isOutOfStock}
          className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-98 cursor-pointer ${
            isOutOfStock
              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              : 'bg-neutral-950 text-white hover:bg-neutral-800 shadow-xs'
          }`}
          title={isOutOfStock ? 'Product is currently sold out' : 'Buy Now'}
        >
          <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
          <span>Buy Now</span>
        </button>
      </div>

      {/* Buy Now Express Checkout Modal */}
      <BuyNowModal
        isOpen={isBuyNowOpen}
        onClose={() => setIsBuyNowOpen(false)}
        product={product}
        initialSize={selectedSize}
      />
    </div>
  )
}
