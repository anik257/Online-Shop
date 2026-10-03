import React, { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  X,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Loader2,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react'
import { BRAND } from '../../lib/brand'
import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  type AdminOrderRow,
  type AdminOrderFilterOptions,
  type OrderStatus,
  type PaymentStatus,
} from '../../services/orders'

// ── Color and Badge Helpers ───────────────────────────────────────────────────

export const getOrderStatusBadge = (status: string) => {
  const norm = (status || '').toLowerCase()
  switch (norm) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" />
          <span>Pending</span>
        </span>
      )
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
          <CheckCircle2 className="h-3 w-3" />
          <span>Confirmed</span>
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
          <Package className="h-3 w-3" />
          <span>Processing</span>
        </span>
      )
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
          <Truck className="h-3 w-3" />
          <span>Shipped</span>
        </span>
      )
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          <span>Delivered</span>
        </span>
      )
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
          <XCircle className="h-3 w-3" />
          <span>Cancelled</span>
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-700 border border-neutral-200">
          <span>{status}</span>
        </span>
      )
  }
}

export const getPaymentStatusBadge = (status: string) => {
  const norm = (status || '').toLowerCase()
  switch (norm) {
    case 'paid':
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
          Paid
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
          Unpaid
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
          Failed
        </span>
      )
    case 'refunded':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
          Refunded
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 border border-neutral-200">
          {status}
        </span>
      )
  }
}

export const formatPaymentMethod = (method: string) => {
  const norm = (method || '').toLowerCase()
  switch (norm) {
    case 'cod':
      return 'Cash on Delivery'
    case 'bkash':
      return 'bKash Online'
    case 'nagad':
      return 'Nagad Online'
    case 'card':
      return 'Credit/Debit Card'
    default:
      return method.toUpperCase()
  }
}

// ── Main Page Component ───────────────────────────────────────────────────────

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [filterOrderStatus, setFilterOrderStatus] = useState('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all')
  const [sortBy, setSortBy] = useState<AdminOrderFilterOptions['sortBy']>('newest')

  // Details Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [activeOrder, setActiveOrder] = useState<AdminOrderRow | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  // Modal Status Update State
  const [modalOrderStatus, setModalOrderStatus] = useState<OrderStatus>('pending')
  const [modalPaymentStatus, setModalPaymentStatus] = useState<PaymentStatus>('pending')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Cancellation Confirmation Dialog
  const [cancellationConfirmOrder, setCancellationConfirmOrder] = useState<{
    orderId: string
    newOrderStatus: OrderStatus
    newPaymentStatus?: PaymentStatus
  } | null>(null)

  // ── Data Fetching ─────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setListError(null)

    const filters: AdminOrderFilterOptions = {
      search: search || undefined,
      orderStatus: filterOrderStatus !== 'all' ? filterOrderStatus : undefined,
      paymentStatus: filterPaymentStatus !== 'all' ? filterPaymentStatus : undefined,
      paymentMethod: filterPaymentMethod !== 'all' ? filterPaymentMethod : undefined,
      sortBy,
    }

    const { data, error } = await getAdminOrders(filters)
    setIsLoading(false)

    if (error) {
      setListError(error)
      return
    }

    setOrders(data)
  }, [search, filterOrderStatus, filterPaymentStatus, filterPaymentMethod, sortBy])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  // ── Open Order Details ────────────────────────────────────────────────────

  const openOrderDetails = async (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsLoadingDetails(true)
    setUpdateError(null)

    const { data, error } = await getAdminOrderById(orderId)
    setIsLoadingDetails(false)

    if (error || !data) {
      showToast(error || 'Failed to load order details.', 'error')
      setSelectedOrderId(null)
      return
    }

    setActiveOrder(data)
    setModalOrderStatus(data.order_status.toLowerCase() as OrderStatus)
    setModalPaymentStatus(data.payment_status.toLowerCase() as PaymentStatus)
  }

  const closeOrderDetails = () => {
    setSelectedOrderId(null)
    setActiveOrder(null)
    setUpdateError(null)
    setIsUpdatingStatus(false)
  }

  // ── Status Updates ────────────────────────────────────────────────────────

  const performStatusUpdate = async (
    orderId: string,
    newOrderStatus: OrderStatus,
    newPaymentStatus?: PaymentStatus
  ) => {
    setIsUpdatingStatus(true)
    setUpdateError(null)

    const prevOrder = orders.find((o) => o.id === orderId) || activeOrder
    const previousPaymentStatus = prevOrder?.payment_status?.toLowerCase()
    const previousOrderStatus = prevOrder?.order_status?.toLowerCase()

    const res = await updateAdminOrderStatus(orderId, newOrderStatus, newPaymentStatus)
    setIsUpdatingStatus(false)

    if (!res.success || res.error) {
      setUpdateError(res.error || 'Failed to update order status.')
      showToast(res.error || 'Status update failed.', 'error')
      return
    }

    // Refresh active order if modal is open
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder((prev) =>
        prev
          ? {
              ...prev,
              order_status: res.order_status || newOrderStatus,
              payment_status: res.payment_status || (newPaymentStatus ?? prev.payment_status),
              stock_restored: res.stock_restored ?? prev.stock_restored,
            }
          : null
      )
    }

    // Refresh orders list
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              order_status: res.order_status || newOrderStatus,
              payment_status: res.payment_status || (newPaymentStatus ?? ord.payment_status),
              stock_restored: res.stock_restored ?? ord.stock_restored,
            }
          : ord
      )
    )

    if (res.stock_restored_now) {
      showToast(
        `Order marked as Cancelled. Stock was safely restored to inventory!`,
        'success'
      )
    } else if (
      previousPaymentStatus &&
      newPaymentStatus &&
      previousPaymentStatus !== newPaymentStatus &&
      previousOrderStatus === newOrderStatus
    ) {
      showToast(`Payment status updated to "${newPaymentStatus.toUpperCase()}".`, 'success')
    } else if (
      previousPaymentStatus &&
      newPaymentStatus &&
      previousPaymentStatus !== newPaymentStatus &&
      previousOrderStatus !== newOrderStatus
    ) {
      showToast('Order status and payment status updated successfully.', 'success')
    } else {
      showToast(`Order status updated to "${newOrderStatus.toUpperCase()}".`, 'success')
    }
  }

  const handleApplyModalStatus = async () => {
    if (!activeOrder) return

    // If changing to Cancelled and not already cancelled, prompt for confirmation
    if (
      modalOrderStatus === 'cancelled' &&
      activeOrder.order_status.toLowerCase() !== 'cancelled'
    ) {
      setCancellationConfirmOrder({
        orderId: activeOrder.id,
        newOrderStatus: modalOrderStatus,
        newPaymentStatus: modalPaymentStatus,
      })
      return
    }

    await performStatusUpdate(activeOrder.id, modalOrderStatus, modalPaymentStatus)
  }

  const handleConfirmCancellation = async () => {
    if (!cancellationConfirmOrder) return
    const target = cancellationConfirmOrder
    setCancellationConfirmOrder(null)
    await performStatusUpdate(target.orderId, target.newOrderStatus, target.newPaymentStatus)
  }

  const handleCopyOrderNumber = (num: string) => {
    navigator.clipboard.writeText(num)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Order Management</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Track, process, and manage customer orders across Bangladesh for {BRAND.name}.
            {!isLoading && (
              <span className="ml-1 font-semibold text-neutral-700">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} found.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Toast Notifications ───────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-neutral-400 hover:text-neutral-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Filter and Search Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer name, phone, address..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-xs focus:border-neutral-900 focus:outline-none"
          />
        </div>

        {/* Order Status Filter */}
        <div className="relative">
          <select
            value={filterOrderStatus}
            onChange={(e) => setFilterOrderStatus(e.target.value)}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">All Order Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

        {/* Payment Status Filter */}
        <div className="relative">
          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">All Payment Statuses</option>
            <option value="pending">Unpaid (Pending)</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

        {/* Payment Method Filter */}
        <div className="relative">
          <select
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">All Payment Methods</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="card">Card / Online</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

        {/* Sorting */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as AdminOrderFilterOptions['sortBy'])}
            className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-desc">Total: High to Low</option>
            <option value="amount-asc">Total: Low to High</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {listError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error Loading Orders</p>
            <p className="mt-0.5">{listError}</p>
          </div>
        </div>
      )}

      {/* ── Orders Table ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-400 mb-3" />
            <p className="text-xs text-neutral-500">Loading orders from Supabase...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="text-sm font-bold text-neutral-700">No Orders Found</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              {search || filterOrderStatus !== 'all' || filterPaymentStatus !== 'all'
                ? 'Try adjusting your search query or status filters.'
                : 'Customer orders placed on the store will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="border-b border-neutral-100 bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="py-3.5 px-5">Order Reference</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => {
                  const itemsCount =
                    order.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0

                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Order Number + Date */}
                      <td className="py-3.5 px-5">
                        <div className="font-mono font-bold text-neutral-900 flex items-center gap-1.5">
                          <span>{order.order_number}</span>
                          {order.stock_restored && (
                            <span
                              title="Stock was restored to inventory"
                              className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700"
                            >
                              Restored
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900">{order.customer_name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{order.phone}</div>
                      </td>

                      {/* Destination */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-800">
                          {order.district}, {order.division}
                        </div>
                        {order.area && (
                          <div className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                            {order.area}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">
                          {BRAND.currency.symbol}
                          {order.total_amount.toLocaleString('en-BD')}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-neutral-700">
                            {formatPaymentMethod(order.payment_method)}
                          </span>
                          <div>{getPaymentStatusBadge(order.payment_status)}</div>
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4">{getOrderStatusBadge(order.order_status)}</td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => openOrderDetails(order.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && orders.length > 0 && (
          <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 flex items-center justify-between text-[11px] text-neutral-400">
            <span>
              Showing {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
            <span>Outfit Avenue Live Supabase Order Stream</span>
          </div>
        )}
      </div>

      {/* ── Order Details Modal ────────────────────────────────────────── */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-neutral-200 bg-white shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono font-bold text-base text-neutral-900">
                      {activeOrder?.order_number || 'Loading Order...'}
                    </h2>
                    {activeOrder && (
                      <button
                        type="button"
                        onClick={() => handleCopyOrderNumber(activeOrder.order_number)}
                        className="rounded p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
                        title="Copy order number"
                      >
                        {copiedId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Placed on{' '}
                    {activeOrder?.created_at &&
                      new Date(activeOrder.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeOrder && getOrderStatusBadge(activeOrder.order_status)}
                <button
                  type="button"
                  onClick={closeOrderDetails}
                  className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-200/50 hover:text-neutral-700 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {isLoadingDetails || !activeOrder ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-neutral-400 mb-2" />
                <p className="text-xs text-neutral-500">Fetching order details & line items...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* ── Status Management Action Bar ──────────────────────── */}
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-neutral-500" />
                      Manage Order Status & Payment
                    </span>
                    {activeOrder.stock_restored && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                        <Check className="h-3 w-3 text-rose-700" />
                        Stock Restored to Catalog
                      </span>
                    )}
                  </div>

                  {updateError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{updateError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Order Status Select */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Order Status
                      </label>
                      <div className="relative">
                        <select
                          value={modalOrderStatus}
                          onChange={(e) => setModalOrderStatus(e.target.value as OrderStatus)}
                          className="w-full appearance-none rounded-xl border border-neutral-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-neutral-800 focus:border-neutral-900 focus:outline-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled (Restore Stock)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                      </div>
                    </div>

                    {/* Payment Status Select */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                        Payment Status
                      </label>
                      <div className="relative">
                        <select
                          value={modalPaymentStatus}
                          onChange={(e) => setModalPaymentStatus(e.target.value as PaymentStatus)}
                          className="w-full appearance-none rounded-xl border border-neutral-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-neutral-800 focus:border-neutral-900 focus:outline-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                    <p className="text-[11px] text-neutral-500">
                      {modalOrderStatus === 'cancelled' && !activeOrder.stock_restored ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Selecting Cancelled will return reserved items back to inventory stock.
                        </span>
                      ) : (
                        'Changes update live in Supabase PostgreSQL.'
                      )}
                    </p>

                    <button
                      type="button"
                      onClick={handleApplyModalStatus}
                      disabled={
                        isUpdatingStatus ||
                        (modalOrderStatus === activeOrder.order_status.toLowerCase() &&
                          modalPaymentStatus === activeOrder.payment_status.toLowerCase())
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Update Status</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Customer & Delivery Information ───────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Info */}
                  <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-neutral-400" />
                      Customer Details
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Full Name</span>
                        <span className="font-semibold text-neutral-900">
                          {activeOrder.customer_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <a
                          href={`tel:${activeOrder.phone}`}
                          className="font-mono font-medium text-neutral-800 hover:text-neutral-950 underline"
                        >
                          {activeOrder.phone}
                        </a>
                      </div>
                      {activeOrder.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span className="text-neutral-700">{activeOrder.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Location */}
                  <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      Delivery Destination
                    </h3>
                    <div className="space-y-1.5 text-xs text-neutral-700">
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Address</span>
                        <span className="font-semibold text-neutral-900">
                          {activeOrder.address}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600">
                        {activeOrder.area && `${activeOrder.area}, `}
                        {activeOrder.district}, {activeOrder.division}
                      </div>
                      {activeOrder.delivery_notes && (
                        <div className="mt-2 rounded-xl bg-amber-50/80 border border-amber-200/80 p-2 text-[11px] text-amber-900">
                          <span className="font-semibold block text-[10px] text-amber-700 uppercase">
                            Delivery Notes:
                          </span>
                          {activeOrder.delivery_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Ordered Products List ──────────────────────────────── */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-neutral-400" />
                    Ordered Products ({activeOrder.order_items?.length || 0})
                  </h3>

                  <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                    <table className="w-full text-left text-xs text-neutral-700">
                      <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-semibold uppercase text-neutral-500">
                        <tr>
                          <th className="py-2.5 px-4">Item</th>
                          <th className="py-2.5 px-3 text-right">Price</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-4 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {(activeOrder.order_items || []).map((item) => (
                          <tr key={item.id} className="hover:bg-neutral-50/40">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                                  {item.products?.image_url ? (
                                    <img
                                      src={item.products.image_url}
                                      alt={item.product_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Package className="h-4 w-4 text-neutral-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-neutral-900">
                                    {item.product_name}
                                  </div>
                                  {item.products?.stock !== undefined && (
                                    <div className="text-[10px] text-neutral-400">
                                      Current Catalog Stock: {item.products.stock}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-neutral-800">
                              {BRAND.currency.symbol}
                              {item.unit_price.toLocaleString('en-BD')}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-neutral-900">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-neutral-900">
                              {BRAND.currency.symbol}
                              {item.subtotal.toLocaleString('en-BD')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Financial & Payment Breakdown ──────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Payment Details */}
                  <div className="rounded-2xl border border-neutral-200 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                      Payment Information
                    </h4>
                    <div className="space-y-1.5 text-xs text-neutral-700">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Method</span>
                        <span className="font-semibold text-neutral-900">
                          {formatPaymentMethod(activeOrder.payment_method)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Payment Status</span>
                        <div>{getPaymentStatusBadge(activeOrder.payment_status)}</div>
                      </div>
                      {activeOrder.payments && activeOrder.payments.length > 0 && (
                        <div className="pt-2 text-[10px] text-neutral-400 border-t border-neutral-100">
                          {activeOrder.payments[0].transaction_id && (
                            <div>
                              Transaction Ref: {activeOrder.payments[0].transaction_id}
                            </div>
                          )}
                          {activeOrder.payments[0].paid_at && (
                            <div>
                              Paid at:{' '}
                              {new Date(activeOrder.payments[0].paid_at).toLocaleString('en-BD')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Totals */}
                  <div className="rounded-2xl border border-neutral-200 p-4 space-y-2 bg-neutral-50/40">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Order Summary
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-neutral-600">
                        <span>Items Subtotal</span>
                        <span>
                          {BRAND.currency.symbol}
                          {activeOrder.subtotal.toLocaleString('en-BD')}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Delivery Charge</span>
                        <span>
                          {activeOrder.delivery_charge === 0 ? (
                            <span className="font-semibold text-emerald-600">FREE</span>
                          ) : (
                            `${BRAND.currency.symbol}${activeOrder.delivery_charge.toLocaleString('en-BD')}`
                          )}
                        </span>
                      </div>
                      <div className="border-t border-neutral-200 pt-2 flex justify-between font-serif text-sm font-bold text-neutral-900">
                        <span>Grand Total</span>
                        <span className="text-base text-neutral-950 font-sans font-bold">
                          {BRAND.currency.symbol}
                          {activeOrder.total_amount.toLocaleString('en-BD')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="border-t border-neutral-100 bg-neutral-50/70 px-6 py-3 flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                Order ID: <code className="font-mono text-[11px]">{activeOrder?.id}</code>
              </span>
              <button
                type="button"
                onClick={closeOrderDetails}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation & Stock Restoration Safety Modal ─────────────── */}
      {cancellationConfirmOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 mx-auto text-rose-600">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                Confirm Order Cancellation
              </h3>
              <p className="text-xs text-neutral-600">
                You are about to cancel this order. Our database system will automatically and
                safely <strong>restore the product stock</strong> back to the catalog.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                Safety Guarantee:
              </p>
              <p className="text-[11px] text-amber-700">
                Stock is returned strictly once to prevent duplicate inventory inflation.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellationConfirmOrder(null)}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                No, Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Confirm & Restore Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
