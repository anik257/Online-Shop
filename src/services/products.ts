import { supabase } from '../lib/supabase'
import type { ProductRow, CategoryRow } from '../types/database'

export interface ProductWithCategory extends ProductRow {
  categories?: Pick<CategoryRow, 'id' | 'name' | 'slug'> | null
}

export interface ProductFilterOptions {
  search?: string
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  availability?: 'all' | 'in_stock' | 'out_of_stock'
  sortBy?: 'featured' | 'newest' | 'price-asc' | 'price-desc'
  limit?: number
}

/**
 * Fetch products from Supabase with filtering and sorting
 */
export async function getProducts(
  options: ProductFilterOptions = {}
): Promise<{ data: ProductWithCategory[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_available', true)

    // Category filter
    if (options.categorySlug && options.categorySlug !== 'all') {
      // Find category id for this slug first
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', options.categorySlug)
        .maybeSingle()

      if (cat) {
        query = query.eq('category_id', cat.id)
      } else {
        // Category slug doesn't exist, return empty result
        return { data: [], error: null }
      }
    }

    // Search query
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`name.ilike.${term},description.ilike.${term}`)
    }

    // Price range filters
    if (options.minPrice !== undefined && options.minPrice > 0) {
      query = query.gte('price', options.minPrice)
    }
    if (options.maxPrice !== undefined && options.maxPrice > 0) {
      query = query.lte('price', options.maxPrice)
    }

    // Availability filter
    if (options.availability === 'in_stock') {
      query = query.gt('stock', 0)
    } else if (options.availability === 'out_of_stock') {
      query = query.eq('stock', 0)
    }

    // Sorting
    switch (options.sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'price-asc':
        query = query.order('price', { ascending: true })
        break
      case 'price-desc':
        query = query.order('price', { ascending: false })
        break
      case 'featured':
      default:
        // Featured order: discount products or newest
        query = query.order('created_at', { ascending: false })
        break
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching products from Supabase:', error)
      return { data: null, error: new Error(error.message) }
    }

    return { data: (data as ProductWithCategory[]) || [], error: null }
  } catch (err) {
    console.error('Unexpected error fetching products:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Fetch featured products for Homepage
 */
export async function getFeaturedProducts(
  limit = 4
): Promise<{ data: ProductWithCategory[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_available', true)
      .gt('stock', 0)
      .not('discount_price', 'is', null)
      .order('price', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    return { data: (data as ProductWithCategory[]) || [], error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Fetch popular / top products for Homepage
 */
export async function getPopularProducts(
  limit = 4
): Promise<{ data: ProductWithCategory[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_available', true)
      .order('stock', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    return { data: (data as ProductWithCategory[]) || [], error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Fetch a single product by slug or id
 */
export async function getProductBySlug(
  slugOrId: string
): Promise<{ data: ProductWithCategory | null; error: Error | null }> {
  try {
    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_available', true)

    // Check if it's a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)
    if (isUuid) {
      query = query.eq('id', slugOrId)
    } else {
      query = query.eq('slug', slugOrId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    return { data: (data as ProductWithCategory) || null, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Fetch related products in the same category
 */
export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 4
): Promise<{ data: ProductWithCategory[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('is_available', true)
      .eq('category_id', categoryId)
      .neq('id', excludeId)
      .limit(limit)

    if (error) return { data: null, error: new Error(error.message) }
    return { data: (data as ProductWithCategory[]) || [], error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Fetch minimal product data by a list of IDs – used by the cart to
 * validate stock / availability of persisted items.
 */
export async function getProductsByIds(
  ids: string[]
): Promise<{
  data: { id: string; stock: number; is_available: boolean; price: number; discount_price: number | null }[] | null
  error: Error | null
}> {
  if (ids.length === 0) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, stock, is_available, price, discount_price')
      .in('id', ids)

    if (error) return { data: null, error: new Error(error.message) }
    return { data: data || [], error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface AdminProductFilterOptions {
  search?: string
  categoryId?: string
  availability?: 'all' | 'available' | 'hidden'
  stockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  sortBy?: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'name-asc'
}

export interface AdminProductPayload {
  name: string
  description?: string | null
  category_id?: string | null
  price: number
  discount_price?: number | null
  stock: number
  image_url?: string | null
  is_available: boolean
}

/**
 * Fetch all products for Admin (including hidden / unavailable)
 */
export async function getAdminProductList(
  options: AdminProductFilterOptions = {}
): Promise<{ data: ProductWithCategory[]; error: string | null }> {
  try {
    let query = supabase
      .from('products')
      .select('*, categories(id, name, slug)')

    // Category filter
    if (options.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId)
    }

    // Availability filter
    if (options.availability === 'available') {
      query = query.eq('is_available', true)
    } else if (options.availability === 'hidden') {
      query = query.eq('is_available', false)
    }

    // Stock filter
    if (options.stockFilter === 'in_stock') {
      query = query.gt('stock', 10)
    } else if (options.stockFilter === 'low_stock') {
      query = query.gt('stock', 0).lte('stock', 10)
    } else if (options.stockFilter === 'out_of_stock') {
      query = query.lte('stock', 0)
    }

    // Search term
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`name.ilike.${term},description.ilike.${term}`)
    }

    // Sorting
    switch (options.sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'price-asc':
        query = query.order('price', { ascending: true })
        break
      case 'price-desc':
        query = query.order('price', { ascending: false })
        break
      case 'stock-asc':
        query = query.order('stock', { ascending: true })
        break
      case 'stock-desc':
        query = query.order('stock', { ascending: false })
        break
      case 'name-asc':
        query = query.order('name', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query

    if (error) {
      console.error('[AdminProducts] Query error:', error)
      return { data: [], error: error.message }
    }

    return { data: (data as ProductWithCategory[]) || [], error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch admin products'
    return { data: [], error: msg }
  }
}

/**
 * Create a new product (Admin only)
 */
export async function createAdminProduct(
  payload: AdminProductPayload
): Promise<{ data: ProductWithCategory | null; error: string | null }> {
  const trimmedName = payload.name.trim()
  if (!trimmedName) {
    return { data: null, error: 'Product title is required.' }
  }
  if (payload.price <= 0) {
    return { data: null, error: 'Price must be greater than 0.' }
  }
  if (payload.stock < 0) {
    return { data: null, error: 'Stock cannot be negative.' }
  }
  if (payload.discount_price != null && payload.discount_price > payload.price) {
    return { data: null, error: 'Discount price cannot be higher than regular price.' }
  }

  // Generate unique slug
  let slug = generateProductSlug(trimmedName)
  if (!slug) {
    slug = `product-${Date.now()}`
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: trimmedName,
        slug,
        description: payload.description?.trim() || null,
        category_id: payload.category_id || null,
        price: payload.price,
        discount_price: payload.discount_price != null && payload.discount_price > 0 ? payload.discount_price : null,
        stock: Math.max(0, Math.floor(payload.stock)),
        image_url: payload.image_url?.trim() || null,
        is_available: payload.is_available,
      })
      .select('*, categories(id, name, slug)')
      .single()

    if (error) {
      console.error('[AdminProducts] Insert error:', error)
      return { data: null, error: error.message }
    }

    return { data: data as ProductWithCategory, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create product'
    return { data: null, error: msg }
  }
}

/**
 * Update an existing product (Admin only)
 */
export async function updateAdminProduct(
  id: string,
  payload: Partial<AdminProductPayload>
): Promise<{ data: ProductWithCategory | null; error: string | null }> {
  try {
    const updates: Partial<ProductRow> = {
      updated_at: new Date().toISOString(),
    }

    if (payload.name !== undefined) {
      const trimmed = payload.name.trim()
      if (!trimmed) return { data: null, error: 'Product name cannot be empty.' }
      updates.name = trimmed
    }

    if (payload.description !== undefined) {
      updates.description = payload.description?.trim() || null
    }

    if (payload.category_id !== undefined) {
      updates.category_id = payload.category_id || null
    }

    if (payload.price !== undefined) {
      if (payload.price <= 0) return { data: null, error: 'Price must be greater than 0.' }
      updates.price = payload.price
    }

    if (payload.discount_price !== undefined) {
      if (payload.discount_price != null && payload.price != null && payload.discount_price > payload.price) {
        return { data: null, error: 'Discount price cannot exceed base price.' }
      }
      updates.discount_price = payload.discount_price != null && payload.discount_price > 0 ? payload.discount_price : null
    }

    if (payload.stock !== undefined) {
      if (payload.stock < 0) return { data: null, error: 'Stock cannot be negative.' }
      updates.stock = Math.max(0, Math.floor(payload.stock))
    }

    if (payload.image_url !== undefined) {
      updates.image_url = payload.image_url?.trim() || null
    }

    if (payload.is_available !== undefined) {
      updates.is_available = payload.is_available
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*, categories(id, name, slug)')
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as ProductWithCategory, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update product'
    return { data: null, error: msg }
  }
}

/**
 * Quick stock update (Admin only)
 */
export async function updateProductStock(
  id: string,
  newStock: number
): Promise<{ success: boolean; error: string | null }> {
  if (newStock < 0) return { success: false, error: 'Stock cannot be negative.' }

  try {
    const { error } = await supabase
      .from('products')
      .update({
        stock: Math.floor(newStock),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update stock'
    return { success: false, error: msg }
  }
}

/**
 * Quick toggle availability (Admin only)
 */
export async function toggleProductAvailability(
  id: string,
  currentStatus: boolean
): Promise<{ success: boolean; newStatus: boolean; error: string | null }> {
  try {
    const newStatus = !currentStatus
    const { error } = await supabase
      .from('products')
      .update({
        is_available: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { success: false, newStatus: currentStatus, error: error.message }
    return { success: true, newStatus, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to toggle availability'
    return { success: false, newStatus: currentStatus, error: msg }
  }
}

/**
 * Delete a product (Admin only)
 */
export async function deleteAdminProduct(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete product'
    return { success: false, error: msg }
  }
}
