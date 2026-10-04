import type { NavItem } from '../types'

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { label: 'Shop', href: '/shop' },
]

export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Products', href: '/admin/products', icon: 'Package' },
  { label: 'Categories', href: '/admin/categories', icon: 'FolderTree' },
  { label: 'Orders', href: '/admin/orders', icon: 'ShoppingBag' },
] as const

export const POPULAR_SEARCH_TAGS = [
  'Panjabi',
  'Lawn Kurtis',
  'Oversized T-Shirts',
  'Polo Shirts',
  'Denim Jeans',
  'Formal Shirts',
  'Accessories',
]
