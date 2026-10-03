import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { BRAND } from '../../lib/brand'

interface AdminProtectedRouteProps {
  children?: React.ReactNode
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const location = useLocation()

  // 1. Session check in progress: display neutral loading state to prevent flash of redirect
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-neutral-950 font-serif font-black text-2xl shadow-xl mb-6 animate-pulse">
          OA
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold text-neutral-200">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          <span>Verifying {BRAND.adminName} Credentials...</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Connecting to secure Supabase authentication</p>
      </div>
    )
  }

  // 2. Unauthenticated: Redirect to /admin/login while preserving original destination
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // 3. Authenticated Admin: render outlet or child elements
  return children ? <>{children}</> : <Outlet />
}
