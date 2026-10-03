import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FolderTree,
  ExternalLink,
  RefreshCw,
  Loader2,
  DollarSign,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { BRAND } from '../../lib/brand'
import {
  getAdminDashboardStats,
  getRecentAdminOrders,
  getLowStockAlertProducts,
  type DashboardStats,
  type RecentOrderSummary,
  type LowStockProductItem,
} from '../../services/admin'

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrderSummary[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDashboardData = useCallback(async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setErrorMessage(null)

    try {
      const [statsRes, ordersRes, lowStockRes] = await Promise.all([
        getAdminDashboardStats(),
        getRecentAdminOrders(6),
        getLowStockAlertProducts(15, 5),
      ])

      if (statsRes.error) {
        setErrorMessage(statsRes.error)
      } else {
        setStats(statsRes.data)
      }

      setRecentOrders(ordersRes.data || [])
      setLowStockProducts(lowStockRes.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data.'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatCurrency = (amount: number) => {
    return `${BRAND.currency.symbol}${amount.toLocaleString('en-BD')}`
  }

  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Top Header / Welcome Banner ──────────────────────────────────── */}
      <div className="rounded-3xl bg-neutral-950 p-6 sm:p-8 text-white relative overflow-hidden shadow-sm border border-neutral-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Supabase Metrics</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              {BRAND.adminName}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
              Live store metrics, inventory tracking, and order fulfillment across Bangladesh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900/90 px-3.5 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh statistics from Supabase"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Sync Data'}</span>
            </button>

            <Link
              to="/admin/products"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-300 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Catalog</span>
            </Link>

            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-rose-900">Database Synchronization Error</span>
            <span className="mt-0.5 block">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            className="text-xs font-bold text-rose-900 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Cards Grid (Real Supabase Data) ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Total Sales */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Total Sales
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-7 w-24 bg-neutral-100 rounded animate-pulse" />
            ) : (
              <span className="font-serif text-2xl font-black text-neutral-950">
                {formatCurrency(stats?.totalSales || 0)}
              </span>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">Total verified orders</p>
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse" />
            ) : (
              <span className="font-serif text-2xl font-black text-neutral-950">
                {stats?.totalOrders || 0}
              </span>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">Lifetime guest &amp; online orders</p>
          </div>
        </div>

        {/* 3. Pending Orders */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse" />
            ) : (
              <span className="font-serif text-2xl font-black text-amber-600">
                {stats?.pendingOrders || 0}
              </span>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">Awaiting dispatch call</p>
          </div>
        </div>

        {/* 4. Completed Orders */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Completed Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse" />
            ) : (
              <span className="font-serif text-2xl font-black text-neutral-950">
                {stats?.completedOrders || 0}
              </span>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">Delivered &amp; settled</p>
          </div>
        </div>

        {/* 5. Total Products */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Total Products
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse" />
            ) : (
              <span className="font-serif text-2xl font-black text-neutral-950">
                {stats?.totalProducts || 0}
              </span>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">Active catalog items</p>
          </div>
        </div>

        {/* 6. Low-Stock Products */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Low-Stock
            </span>
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                (stats?.lowStockCount || 0) > 0
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse" />
            ) : (
              <span
                className={`font-serif text-2xl font-black ${
                  (stats?.lowStockCount || 0) > 0 ? 'text-rose-600' : 'text-neutral-950'
                }`}
              >
                {stats?.lowStockCount || 0}
              </span>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">Stock &le; 10 units</p>
          </div>
        </div>
      </div>

      {/* ── Order & Inventory Overview Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Recent Orders Overview (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
            <div className="border-b border-neutral-100 bg-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-neutral-600" />
                  <span>Recent Customer Orders</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Latest order placements through guest checkout
                </p>
              </div>

              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-950 transition-colors"
              >
                <span>View All Orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Loading recent orders...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-neutral-500">No orders placed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-6">Order Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {recentOrders.map((order) => {
                      const isPending = order.order_status?.toLowerCase() === 'pending'
                      return (
                        <tr key={order.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-bold text-neutral-900">
                            {order.order_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-neutral-900 leading-tight">
                              {order.customer_name}
                            </div>
                            <div className="text-[11px] text-neutral-400">{order.phone}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-neutral-800">
                              {order.district}, {order.division}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-neutral-900">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isPending ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              {order.order_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right text-neutral-400 text-[11px]">
                            {formatDate(order.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Low-Stock Inventory Alerts (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <span>Inventory Alerts</span>
              </h2>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Low Stock (&le; 15)
              </span>
            </div>

            {isLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Checking stock levels...</p>
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                All catalog items currently have healthy stock levels (&gt; 15 units).
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((prod) => {
                  const isZero = prod.stock <= 0
                  return (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-100">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 m-2.5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {prod.name}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {formatCurrency(prod.price)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isZero
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isZero ? 'Out of Stock' : `${prod.stock} left`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2 border-t border-neutral-100">
              <Link
                to="/admin/products"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <span>Manage All Inventory</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">Admin Operations</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/admin/products"
                className="p-3 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-neutral-50/60 hover:bg-white transition-all flex flex-col items-center justify-center text-center gap-1 font-semibold text-neutral-800"
              >
                <Package className="h-4 w-4 text-amber-600" />
                <span>Products</span>
              </Link>
              <Link
                to="/admin/categories"
                className="p-3 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-neutral-50/60 hover:bg-white transition-all flex flex-col items-center justify-center text-center gap-1 font-semibold text-neutral-800"
              >
                <FolderTree className="h-4 w-4 text-amber-600" />
                <span>Categories</span>
              </Link>
              <Link
                to="/admin/orders"
                className="p-3 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-neutral-50/60 hover:bg-white transition-all flex flex-col items-center justify-center text-center gap-1 font-semibold text-neutral-800"
              >
                <ShoppingBag className="h-4 w-4 text-amber-600" />
                <span>Orders</span>
              </Link>
              <Link
                to="/"
                target="_blank"
                className="p-3 rounded-xl border border-neutral-100 hover:border-neutral-900 bg-neutral-50/60 hover:bg-white transition-all flex flex-col items-center justify-center text-center gap-1 font-semibold text-neutral-800"
              >
                <ExternalLink className="h-4 w-4 text-amber-600" />
                <span>Live Shop</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
