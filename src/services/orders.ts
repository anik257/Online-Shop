import { supabase } from '../lib/supabase'
import type { PaymentMethodCode } from './paymentGateways'

export interface CheckoutCustomerInfo {
  fullName: string
  phone: string
  email?: string
  division: string
  district: string
  area?: string
  address: string
  deliveryNotes?: string
  paymentMethod: PaymentMethodCode
}

export interface CheckoutCartItemPayload {
  productId: string
  quantity: number
  size?: string
}

export interface OrderPlacedResult {
  success: boolean
  order_id: string
  order_number: string
  customer_name: string
  phone: string
  division: string
  district: string
  area: string | null
  address: string
  delivery_notes: string | null
  subtotal: number
  delivery_charge: number
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
}

export interface OrderConfirmationItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  image_url: string | null
  slug: string | null
  size?: string | null
}

export interface OrderConfirmationDetails {
  id: string
  order_number: string
  customer_name: string
  phone: string
  email: string | null
  division: string
  district: string
  area: string | null
  address: string
  delivery_notes: string | null
  subtotal: number
  delivery_charge: number
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  created_at: string
  items: OrderConfirmationItem[]
}

export interface CartVerificationResult {
  isValid: boolean
  error?: string
  subtotal: number
  deliveryCharge: number
  total: number
  items: Array<{
    id: string
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
}

export const FREE_SHIPPING_THRESHOLD = 2000
export const STANDARD_DELIVERY_CHARGE = 80

/**
 * Pre-order database verification
 * Fetches fresh product information directly from Supabase, verifies stock & availability,
 * and calculates subtotal, delivery charge, and grand total independently of browser state.
 */
export async function verifyCartBeforeCheckout(
  cartItems: CheckoutCartItemPayload[]
): Promise<CartVerificationResult> {
  if (!cartItems.length) {
    return {
      isValid: false,
      error: 'Your shopping cart is empty.',
      subtotal: 0,
      deliveryCharge: 0,
      total: 0,
      items: [],
    }
  }

  const productIds = cartItems.map((item) => item.productId)

  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('id, name, price, discount_price, stock, is_available')
    .in('id', productIds)

  if (error || !dbProducts) {
    return {
      isValid: false,
      error: 'Failed to verify product availability with the server. Please try again.',
      subtotal: 0,
      deliveryCharge: 0,
      total: 0,
      items: [],
    }
  }

  const productMap = new Map(dbProducts.map((p) => [p.id, p]))
  let calculatedSubtotal = 0
  const verifiedItems: CartVerificationResult['items'] = []

  for (const item of cartItems) {
    const product = productMap.get(item.productId)

    if (!product) {
      return {
        isValid: false,
        error: 'One or more items in your cart could not be located in our catalog.',
        subtotal: 0,
        deliveryCharge: 0,
        total: 0,
        items: [],
      }
    }

    if (!product.is_available) {
      return {
        isValid: false,
        error: `"${product.name}" is currently unavailable. Please remove it from your cart.`,
        subtotal: 0,
        deliveryCharge: 0,
        total: 0,
        items: [],
      }
    }

    if (product.stock < item.quantity) {
      return {
        isValid: false,
        error: `"${product.name}" has only ${product.stock} items remaining in stock, but ${item.quantity} was requested.`,
        subtotal: 0,
        deliveryCharge: 0,
        total: 0,
        items: [],
      }
    }

    // Verified price strictly from database
    const unitPrice =
      product.discount_price != null &&
      product.discount_price < product.price &&
      product.discount_price > 0
        ? Number(product.discount_price)
        : Number(product.price)

    const lineSubtotal = unitPrice * item.quantity
    calculatedSubtotal += lineSubtotal

    verifiedItems.push({
      id: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: lineSubtotal,
    })
  }

  const deliveryCharge =
    calculatedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_DELIVERY_CHARGE
  const grandTotal = calculatedSubtotal + deliveryCharge

  return {
    isValid: true,
    subtotal: calculatedSubtotal,
    deliveryCharge,
    total: grandTotal,
    items: verifiedItems,
  }
}

/**
 * Places a customer order atomically via Supabase database RPC:
 * 1. Checks and locks product rows
 * 2. Verifies stock and availability
 * 3. Calculates verified prices
 * 4. Deducts stock safely
 * 5. Generates unique order number
 * 6. Creates order and order_items records
 */
export async function placeCustomerOrder(
  customerInfo: CheckoutCustomerInfo,
  cartItems: CheckoutCartItemPayload[]
): Promise<{ data: OrderPlacedResult | null; error: string | null }> {
  // Pre-flight check
  if (!customerInfo.fullName.trim()) {
    return { data: null, error: 'Full name is required.' }
  }
  if (!customerInfo.phone.trim()) {
    return { data: null, error: 'Valid phone number is required.' }
  }
  if (!customerInfo.division.trim()) {
    return { data: null, error: 'Division is required.' }
  }
  if (!customerInfo.district.trim()) {
    return { data: null, error: 'District is required.' }
  }
  if (!customerInfo.address.trim()) {
    return { data: null, error: 'Delivery address is required.' }
  }
  if (!cartItems.length) {
    return { data: null, error: 'Cart is empty.' }
  }

  const allowedMethods: PaymentMethodCode[] = ['cod', 'bkash', 'nagad', 'card']
  if (!allowedMethods.includes(customerInfo.paymentMethod)) {
    return {
      data: null,
      error: `Unsupported payment method: ${customerInfo.paymentMethod}.`,
    }
  }

  try {
    // 1. Verify availability and stock against live DB
    const verification = await verifyCartBeforeCheckout(cartItems)
    if (!verification.isValid) {
      return { data: null, error: verification.error || 'Cart validation failed.' }
    }

    // 2. Call secure atomic Supabase RPC
    const { data, error } = await supabase.rpc('place_customer_order', {
      p_customer_name: customerInfo.fullName.trim(),
      p_phone: customerInfo.phone.trim(),
      p_email: customerInfo.email?.trim() || null,
      p_division: customerInfo.division.trim(),
      p_district: customerInfo.district.trim(),
      p_area: customerInfo.area?.trim() || null,
      p_address: customerInfo.address.trim(),
      p_delivery_notes: customerInfo.deliveryNotes?.trim() || null,
      p_payment_method: customerInfo.paymentMethod,
      p_items: cartItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        size: item.size || null,
      })),
    })

    if (error) {
      console.error('[Outfit Avenue] Order creation RPC error:', error)
      return {
        data: null,
        error: error.message || 'Failed to place order. Please review your cart and try again.',
      }
    }

    return { data: data as unknown as OrderPlacedResult, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
    console.error('[Outfit Avenue] Unexpected order submission error:', err)
    return { data: null, error: message }
  }
}

/**
 * Retrieves full order details by order number for confirmation page.
 * Uses a SECURITY DEFINER RPC — no direct table access needed or allowed.
 * No login required.
 */
export async function getOrderByNumber(
  orderNumber: string
): Promise<{ data: OrderConfirmationDetails | null; error: string | null }> {
  if (!orderNumber || !orderNumber.trim()) {
    return { data: null, error: 'Invalid order number.' }
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_by_number', {
      p_order_number: orderNumber.trim(),
    })

    if (rpcError) {
      console.error('[getOrderByNumber] RPC error:', rpcError.message)
      return { data: null, error: 'Order not found. Please check your order reference.' }
    }

    if (!rpcData) {
      return { data: null, error: 'Order not found. Please check your order reference.' }
    }

    return { data: rpcData as unknown as OrderConfirmationDetails, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching order.'
    return { data: null, error: message }
  }
}

// ── Admin Order Management Types & Services ──────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface AdminOrderItem {
  id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  products?: {
    id: string
    name: string
    slug: string
    image_url: string | null
    stock: number
  } | null
}

export interface AdminOrderRow {
  id: string
  order_number: string
  customer_name: string
  phone: string
  email: string | null
  division: string
  district: string
  area: string | null
  address: string
  delivery_notes: string | null
  subtotal: number
  delivery_charge: number
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  stock_restored: boolean
  created_at: string
  updated_at: string
  order_items?: AdminOrderItem[]
  payments?: {
    id: string
    payment_method: string
    transaction_id: string | null
    amount: number
    payment_status: string
    paid_at: string | null
    created_at: string
  }[]
}

export interface AdminOrderFilterOptions {
  search?: string
  orderStatus?: string
  paymentStatus?: string
  paymentMethod?: string
  sortBy?: 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'
}

export interface UpdateOrderStatusResult {
  success: boolean
  order_id?: string
  order_status?: string
  payment_status?: string
  stock_restored?: boolean
  stock_restored_now?: boolean
  error?: string
}

/**
 * Fetch all orders for admin with search, filter, and sorting
 */
export async function getAdminOrders(
  options: AdminOrderFilterOptions = {}
): Promise<{ data: AdminOrderRow[]; error: string | null }> {
  try {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(id, name, slug, image_url, stock)), payments(*)')

    // Status filter
    if (options.orderStatus && options.orderStatus !== 'all') {
      query = query.eq('order_status', options.orderStatus.toLowerCase())
    }

    // Payment status filter
    if (options.paymentStatus && options.paymentStatus !== 'all') {
      query = query.eq('payment_status', options.paymentStatus.toLowerCase())
    }

    // Payment method filter
    if (options.paymentMethod && options.paymentMethod !== 'all') {
      query = query.eq('payment_method', options.paymentMethod.toLowerCase())
    }

    // Search filter
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(
        `order_number.ilike.${term},customer_name.ilike.${term},phone.ilike.${term},address.ilike.${term},district.ilike.${term}`
      )
    }

    // Sorting
    switch (options.sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'amount-desc':
        query = query.order('total_amount', { ascending: false })
        break
      case 'amount-asc':
        query = query.order('total_amount', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query

    if (error) {
      console.error('[AdminOrders] Fetch error:', error)
      return { data: [], error: error.message }
    }

    const formatted: AdminOrderRow[] = (data || []).map((row: any) => ({
      id: row.id,
      order_number: row.order_number,
      customer_name: row.customer_name,
      phone: row.phone,
      email: row.email,
      division: row.division,
      district: row.district,
      area: row.area,
      address: row.address,
      delivery_notes: row.delivery_notes,
      subtotal: Number(row.subtotal) || 0,
      delivery_charge: Number(row.delivery_charge) || 0,
      total_amount: Number(row.total_amount) || 0,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      order_status: row.order_status,
      stock_restored: Boolean(row.stock_restored),
      created_at: row.created_at,
      updated_at: row.updated_at,
      order_items: (row.order_items || []).map((oi: any) => ({
        id: oi.id,
        product_id: oi.product_id,
        product_name: oi.product_name,
        quantity: oi.quantity,
        unit_price: Number(oi.unit_price) || 0,
        subtotal: Number(oi.subtotal) || 0,
        products: oi.products || null,
      })),
      payments: row.payments || [],
    }))

    return { data: formatted, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch orders'
    return { data: [], error: msg }
  }
}

/**
 * Fetch a single order by ID with full details (for admin modal/drawer)
 */
export async function getAdminOrderById(
  orderId: string
): Promise<{ data: AdminOrderRow | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(id, name, slug, image_url, stock)), payments(*)')
      .eq('id', orderId)
      .single()

    if (error || !data) {
      return { data: null, error: error?.message || 'Order not found' }
    }

    const formatted: AdminOrderRow = {
      id: data.id,
      order_number: data.order_number,
      customer_name: data.customer_name,
      phone: data.phone,
      email: data.email,
      division: data.division,
      district: data.district,
      area: data.area,
      address: data.address,
      delivery_notes: data.delivery_notes,
      subtotal: Number(data.subtotal) || 0,
      delivery_charge: Number(data.delivery_charge) || 0,
      total_amount: Number(data.total_amount) || 0,
      payment_method: data.payment_method,
      payment_status: data.payment_status,
      order_status: data.order_status,
      stock_restored: Boolean(data.stock_restored),
      created_at: data.created_at,
      updated_at: data.updated_at,
      order_items: (data.order_items || []).map((oi: any) => ({
        id: oi.id,
        product_id: oi.product_id,
        product_name: oi.product_name,
        quantity: oi.quantity,
        unit_price: Number(oi.unit_price) || 0,
        subtotal: Number(oi.subtotal) || 0,
        products: oi.products || null,
      })),
      payments: data.payments || [],
    }

    return { data: formatted, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch order details'
    return { data: null, error: msg }
  }
}

/**
 * Update order status and/or payment status via atomic RPC.
 * Automatically restores stock safely and strictly ONCE if cancelled.
 * Falls back to direct table update via authenticated admin session if RPC encounters an issue.
 */
export async function updateAdminOrderStatus(
  orderId: string,
  newOrderStatus: OrderStatus,
  newPaymentStatus?: PaymentStatus
): Promise<UpdateOrderStatusResult> {
  try {
    const { data, error } = await supabase.rpc('update_order_status_admin', {
      p_order_id: orderId,
      p_order_status: newOrderStatus.toLowerCase(),
      p_payment_status: newPaymentStatus ? newPaymentStatus.toLowerCase() : null,
    })

    if (!error && data) {
      const res = data as any
      return {
        success: true,
        order_id: res.order_id,
        order_status: res.order_status,
        payment_status: res.payment_status,
        stock_restored: Boolean(res.stock_restored),
        stock_restored_now: Boolean(res.stock_restored_now),
      }
    }

    if (error) {
      console.warn('[AdminOrders] RPC update_order_status_admin issue, falling back to authenticated session update:', error.message)

      // Direct fallback using authenticated admin session
      const updatePayload: { order_status: string; payment_status?: string; updated_at: string } = {
        order_status: newOrderStatus.toLowerCase(),
        updated_at: new Date().toISOString(),
      }
      if (newPaymentStatus) {
        updatePayload.payment_status = newPaymentStatus.toLowerCase()
      }

      const { data: updatedOrder, error: updateError } = await (supabase
        .from('orders') as any)
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single()

      if (updateError || !updatedOrder) {
        console.error('[AdminOrders] Fallback update failed:', updateError)
        return { success: false, error: updateError?.message || error.message }
      }

      // Sync payments table if payment_status changed
      if (newPaymentStatus) {
        await (supabase
          .from('payments') as any)
          .update({
            payment_status: newPaymentStatus.toLowerCase(),
            paid_at: newPaymentStatus.toLowerCase() === 'paid' ? new Date().toISOString() : null,
          })
          .eq('order_id', orderId)
      }

      return {
        success: true,
        order_id: updatedOrder.id,
        order_status: updatedOrder.order_status,
        payment_status: updatedOrder.payment_status,
        stock_restored: Boolean(updatedOrder.stock_restored),
      }
    }

    return { success: false, error: 'Unknown error occurred while updating order status' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update order status'
    return { success: false, error: msg }
  }
}

/**
 * Update payment status of an order via admin authenticated session
 */
export async function updateAdminPaymentStatus(
  orderId: string,
  newPaymentStatus: PaymentStatus,
  currentOrderStatus?: OrderStatus
): Promise<UpdateOrderStatusResult> {
  const statusToKeep = currentOrderStatus || 'pending'
  return updateAdminOrderStatus(orderId, statusToKeep, newPaymentStatus)
}


