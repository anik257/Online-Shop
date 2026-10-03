export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  itemCount?: number
  featured?: boolean
}

export interface Product {
  id: string
  title: string
  slug: string
  price: number
  originalPrice?: number
  category: string
  description: string
  images: string[]
  inStock: boolean
  isNew?: boolean
  isFeatured?: boolean
  sizes?: string[]
  colors?: string[]
}

export interface CartItem {
  productId: string
  title: string
  price: number
  quantity: number
  size?: string
  color?: string
  imageUrl?: string
}

export interface NavItem {
  label: string
  href: string
  badge?: string
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderPreview {
  id: string
  customerName: string
  totalAmount: number
  status: OrderStatus
  createdAt: string
  itemsCount: number
}

export * from './database'
