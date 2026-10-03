import { supabase } from '../lib/supabase'

export interface DashboardStats {
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalSales: number
  lowStockCount: number
}

export interface RecentOrderSummary {
  id: string
  order_number: string
  customer_name: string
  phone: string
  division: string
  district: string
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  created_at: string
}

export interface LowStockProductItem {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  is_available: boolean
  image_url: string | null
}

/**
 * Fetches real aggregated statistics from Supabase for the Admin Dashboard
 */
export async function getAdminDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  try {
    // 1. Total Products Count
    const { count: totalProducts, error: prodErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (prodErr) throw prodErr

    // 2. Low-Stock Products Count (stock <= 10)
    const { count: lowStockCount, error: lowStockErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('stock', 10)

    if (lowStockErr) throw lowStockErr

    // 3. Orders stats (all orders to compute counts & sales sum)
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, total_amount, order_status, payment_status')

    if (ordersErr) throw ordersErr

    const totalOrders = orders ? orders.length : 0
    let pendingOrders = 0
    let completedOrders = 0
    let totalSales = 0

    if (orders) {
      for (const ord of orders) {
        const status = ord.order_status?.toLowerCase() || ''
        if (status === 'pending') {
          pendingOrders++
        } else if (status === 'delivered' || status === 'completed' || status === 'shipped') {
          completedOrders++
        }

        // Sum total sales (excluding cancelled or failed)
        if (status !== 'cancelled') {
          totalSales += Number(ord.total_amount) || 0
        }
      }
    }

    return {
      data: {
        totalProducts: totalProducts || 0,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSales,
        lowStockCount: lowStockCount || 0,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admin stats'
    console.error('[AdminService] getAdminDashboardStats error:', err)
    return { data: null, error: message }
  }
}

/**
 * Fetches the most recent orders from Supabase
 */
export async function getRecentAdminOrders(limit = 6): Promise<{
  data: RecentOrderSummary[]
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, customer_name, phone, division, district, total_amount, payment_method, payment_status, order_status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const formatted: RecentOrderSummary[] = (data || []).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      customer_name: row.customer_name,
      phone: row.phone,
      division: row.division,
      district: row.district,
      total_amount: Number(row.total_amount) || 0,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      order_status: row.order_status,
      created_at: row.created_at,
    }))

    return { data: formatted, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch recent orders'
    console.error('[AdminService] getRecentAdminOrders error:', err)
    return { data: [], error: message }
  }
}

/**
 * Fetches low stock products (stock <= threshold)
 */
export async function getLowStockAlertProducts(threshold = 10, limit = 5): Promise<{
  data: LowStockProductItem[]
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, price, stock, is_available, image_url')
      .lte('stock', threshold)
      .order('stock', { ascending: true })
      .limit(limit)

    if (error) throw error

    const formatted: LowStockProductItem[] = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price) || 0,
      stock: p.stock,
      is_available: p.is_available,
      image_url: p.image_url,
    }))

    return { data: formatted, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch low stock items'
    console.error('[AdminService] getLowStockAlertProducts error:', err)
    return { data: [], error: message }
  }
}
