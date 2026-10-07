import React, { useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  Bell,
  LogOut,
  User,
} from 'lucide-react'
import { BRAND } from '../lib/brand'
import { useAdminAuth } from '../context/AdminAuthContext'

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAdminAuth()

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Products', href: '/admin/products', icon: Package, end: false },
    { label: 'Categories', href: '/admin/categories', icon: FolderTree, end: false },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingBag, end: false },
  ]

  const getPageTitle = () => {
    if (location.pathname === '/admin' || location.pathname === '/admin/dashboard') return 'Overview Dashboard'
    if (location.pathname.startsWith('/admin/products')) return 'Product Management'
    if (location.pathname.startsWith('/admin/categories')) return 'Category Management'
    if (location.pathname.startsWith('/admin/orders')) return 'Order Operations'
    return 'Admin Portal'
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-neutral-950 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Admin Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-neutral-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-serif font-black text-xl text-neutral-950 shadow-md">
              OA
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                {BRAND.adminName}
              </h1>
              <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Management Portal
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Store Administration
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-amber-400 text-neutral-950 font-semibold shadow-sm'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Quick Shortcuts */}
          <div className="mt-8 pt-6 border-t border-neutral-800/80">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Quick Shortcuts
            </p>
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4 text-amber-400" />
                <span>View Live Store</span>
              </div>
              <span className="text-xs text-neutral-400">New tab</span>
            </Link>
          </div>
        </div>

        {/* Admin User & Logout Footer */}
        <div className="border-t border-neutral-800 p-4 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800 text-amber-400 border border-neutral-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.email || 'Administrator'}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />
                Supabase Authenticated
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-900/50 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out of Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Top Navbar */}
        <header className="flex h-20 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                {getPageTitle()}
              </h2>
              <p className="text-xs text-neutral-500 hidden sm:block">
                Outfit Avenue Administration Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </Link>

            <button
              type="button"
              className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
            </button>

            {/* Admin User Profile & Sign Out */}
            <div className="flex items-center gap-3 pl-3 border-l border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white shadow-xs">
                  <User className="h-4 w-4 text-amber-400" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-neutral-900 truncate max-w-[160px]">
                    {user?.email || 'admin@outfitavenue.com'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Active Session</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
                title="Log out of Admin"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
