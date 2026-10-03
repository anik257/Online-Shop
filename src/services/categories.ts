import { supabase } from '../lib/supabase'
import type { CategoryRow } from '../types/database'

export interface CategoryWithCount extends CategoryRow {
  product_count?: number
}

export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Fetch all categories from Supabase (customer-facing)
 */
export async function getCategories(): Promise<{ data: CategoryWithCount[] | null; error: Error | null }> {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories from Supabase:', error)
      return { data: null, error: new Error(error.message) }
    }

    // Fetch product counts for each category to display live counts (available only for customer)
    const { data: productsData } = await supabase
      .from('products')
      .select('category_id')
      .eq('is_available', true)

    const countMap: Record<string, number> = {}
    if (productsData) {
      for (const p of productsData) {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
        }
      }
    }

    const categoriesWithCount = (categories || []).map((cat) => ({
      ...cat,
      product_count: countMap[cat.id] || 0,
    }))

    return { data: categoriesWithCount, error: null }
  } catch (err) {
    console.error('Unexpected error fetching categories:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Fetch all categories for Admin with TOTAL product count (including unavailable)
 */
export async function getAdminCategories(): Promise<{
  data: CategoryWithCount[]
  error: string | null
}> {
  try {
    const { data: categories, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (catErr) throw catErr

    // Count all products per category
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('category_id')

    if (prodErr) throw prodErr

    const counts: Record<string, number> = {}
    if (products) {
      for (const p of products) {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1
        }
      }
    }

    const mapped = (categories || []).map((cat) => ({
      ...cat,
      product_count: counts[cat.id] || 0,
    }))

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch categories'
    return { data: [], error: msg }
  }
}

/**
 * Fetch a single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<{ data: CategoryRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) return { data: null, error: new Error(error.message) }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Check how many products are linked to a category
 */
export async function getCategoryProductCount(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (error) {
    console.error('[Categories] Error checking product count:', error)
    return 0
  }
  return count || 0
}

/**
 * Create a new category
 */
export async function createCategory(
  name: string,
  slugInput?: string
): Promise<{ data: CategoryRow | null; error: string | null }> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { data: null, error: 'Category name is required' }
  }

  let slug = (slugInput && slugInput.trim()) || generateCategorySlug(trimmedName)
  if (!slug) {
    slug = `cat-${Date.now().toString(36)}`
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: trimmedName, slug })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A category with this slug already exists.' }
      }
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create category'
    return { data: null, error: msg }
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(
  id: string,
  name: string,
  slugInput?: string
): Promise<{ data: CategoryRow | null; error: string | null }> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { data: null, error: 'Category name is required' }
  }

  const slug = (slugInput && slugInput.trim()) || generateCategorySlug(trimmedName)

  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmedName, slug })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A category with this slug already exists.' }
      }
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update category'
    return { data: null, error: msg }
  }
}

/**
 * Delete a category safely.
 * Prevents deleting if products are assigned, unless a safe reassign category ID is provided.
 */
export async function deleteCategory(
  id: string,
  reassignCategoryId?: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Check for dependent products
    const productCount = await getCategoryProductCount(id)

    if (productCount > 0) {
      if (reassignCategoryId === undefined) {
        return {
          success: false,
          error: `Cannot delete category: ${productCount} ${
            productCount === 1 ? 'product depends' : 'products depend'
          } on it. Please reassign them first.`,
        }
      }

      // Reassign products to the requested category (or null for Uncategorized)
      const { error: reassignError } = await supabase
        .from('products')
        .update({ category_id: reassignCategoryId || null })
        .eq('category_id', id)

      if (reassignError) {
        return {
          success: false,
          error: `Failed to reassign dependent products: ${reassignError.message}`,
        }
      }
    }

    // 2. Safe to delete category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete category'
    return { success: false, error: msg }
  }
}
