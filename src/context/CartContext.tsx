import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

// ─── Cart Item Shape ────────────────────────────────────────────────────────
export interface CartItem {
  id: string           // unique cart entry id (productId + timestamp)
  productId: string    // DB product id
  name: string
  slug: string
  /** Original listed price – always stored for display/strikethrough */
  originalPrice: number
  /** Effective unit price paid (discountPrice if present, else originalPrice) */
  unitPrice: number
  discountPrice?: number | null
  imageUrl?: string | null
  quantity: number
  stock: number
  isAvailable: boolean
  categoryName?: string
}

// ─── Product shape expected by addItem ─────────────────────────────────────
export interface AddItemProduct {
  id: string
  name: string
  slug: string
  price: number
  discount_price?: number | null
  image_url?: string | null
  stock: number
  is_available?: boolean
  category_name?: string
}

// ─── Context type ───────────────────────────────────────────────────────────
interface CartContextType {
  items: CartItem[]
  totalItems: number
  subtotal: number
  addItem: (product: AddItemProduct, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  syncCartItems: (
    liveProducts: { id: string; stock: number; is_available: boolean; price: number; discount_price: number | null }[]
  ) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_STORAGE_KEY = 'outfit_avenue_cart'

// ─── Provider ───────────────────────────────────────────────────────────────
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage quota exceeded – silently ignore
    }
  }, [items])

  const addItem = useCallback((product: AddItemProduct, quantity = 1) => {
    if (product.stock <= 0) return
    if (product.is_available === false) return

    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      const unitPrice = product.discount_price ?? product.price

      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock)
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: newQty, stock: product.stock }
            : item
        )
      }

      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          slug: product.slug,
          originalPrice: product.price,
          unitPrice,
          discountPrice: product.discount_price,
          imageUrl: product.image_url,
          quantity: Math.min(quantity, product.stock),
          stock: product.stock,
          isAvailable: product.is_available ?? true,
          categoryName: product.category_name,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item
          if (!item.isAvailable || item.stock <= 0) return item
          const safeQty = Math.max(1, Math.min(quantity, item.stock))
          return { ...item, quantity: safeQty }
        })
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const syncCartItems = useCallback(
    (liveProducts: { id: string; stock: number; is_available: boolean; price: number; discount_price: number | null }[]) => {
      const liveMap = new Map(liveProducts.map((p) => [p.id, p]))
      setItems((prev) =>
        prev.map((item) => {
          const live = liveMap.get(item.productId)
          if (!live) {
            return { ...item, isAvailable: false, stock: 0 }
          }
          const nowAvailable = live.is_available && live.stock > 0
          const newStock = live.stock
          const newUnitPrice = live.discount_price ?? live.price
          const safeQty = nowAvailable ? Math.min(item.quantity, newStock) : 0
          return {
            ...item,
            stock: newStock,
            isAvailable: live.is_available,
            originalPrice: live.price,
            unitPrice: newUnitPrice,
            discountPrice: live.discount_price,
            quantity: Math.max(safeQty, nowAvailable ? 1 : 0),
          }
        })
      )
    },
    []
  )

  const totalItems = items.reduce((sum, item) => sum + (item.isAvailable ? item.quantity : 0), 0)
  const subtotal = items.reduce(
    (sum, item) => sum + (item.isAvailable ? item.unitPrice * item.quantity : 0),
    0
  )

  return (
    <CartContext.Provider
      value={{ items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart, syncCartItems }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
