import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { useAdminAuth } from '../../context/AdminAuthContext'

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading: authLoading } = useAdminAuth()

  // Target route to redirect to after successful login
  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin'

  const [email, setEmail] = useState('admin@outfitavenue.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // If already authenticated, redirect straight to admin panel
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(fromLocation, { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate, fromLocation])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim()) {
      setErrorMessage('Admin email address is required.')
      return
    }

    if (!password) {
      setErrorMessage('Password is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const { success, error } = await login(email.trim(), password)

      if (!success) {
        setErrorMessage(error || 'Failed to authenticate. Please check your credentials.')
        setIsSubmitting(false)
        return
      }

      // Successful login: navigate to destination
      navigate(fromLocation, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
      setIsSubmitting(false)
    }
  }

  // Pre-fill demo credentials helper
  const handleUseDemoCredentials = () => {
    setEmail('admin@outfitavenue.com')
    setPassword('Admin123456!')
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-neutral-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {BRAND.name} Storefront</span>
        </Link>

        <div className="flex justify-center mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-neutral-950 font-serif font-black text-2xl shadow-lg">
            OA
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {BRAND.adminName}
        </h1>
        <p className="mt-1 text-xs text-neutral-400">
          Supabase-Authenticated E-commerce Management Suite
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-md space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-rose-200">Authentication Failed</span>
                <span className="mt-0.5 block leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Redirect Notice if coming from a protected route */}
          {location.state?.from && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Please sign in to access the protected admin section.</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Admin Email Address <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@outfitavenue.com"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Password <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-10 text-xs text-white placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer p-0.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer ${
                isSubmitting
                  ? 'bg-neutral-800 text-neutral-400 cursor-wait'
                  : 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Fast-Fill Demo Credentials Card for Easy Testing */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Default Admin Credentials
              </span>
              <button
                type="button"
                onClick={handleUseDemoCredentials}
                className="text-[11px] font-semibold text-neutral-300 hover:text-white underline cursor-pointer"
              >
                Autofill
              </button>
            </div>
            <div className="text-[11px] font-mono text-neutral-400 space-y-0.5">
              <p>
                Email: <span className="text-white">admin@outfitavenue.com</span>
              </p>
              <p>
                Password: <span className="text-white">Admin123456!</span>
              </p>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-4 text-center">
            <span className="text-[11px] text-neutral-500">
              Strictly for Outfit Avenue management • Unauthorized access logged
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
