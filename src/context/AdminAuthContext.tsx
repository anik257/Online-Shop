import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AdminAuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    // 1. Initial session restoration from localStorage
    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('[AdminAuth] Error restoring session:', error.message)
        }
        if (isMounted) {
          setSession(data.session)
          setUser(data.session?.user ?? null)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('[AdminAuth] Unexpected error restoring session:', err)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    // 2. Subscribe to auth changes (token refresh, sign in, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  /**
   * Log in administrator via Supabase Auth
   */
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        let friendlyMessage = error.message
        if (error.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Invalid email or password. Please verify your admin credentials.'
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage = 'Admin email address has not been confirmed.'
        }
        return { success: false, error: friendlyMessage }
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Authentication failed. Please try again.' }
      }

      setSession(data.session)
      setUser(data.user)
      return { success: true, error: null }
    } catch (err: unknown) {
      const authErr = err as AuthError
      return {
        success: false,
        error: authErr.message || 'An unexpected error occurred during admin authentication.',
      }
    }
  }

  /**
   * Log out administrator
   */
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[AdminAuth] Sign out error:', err)
    } finally {
      setSession(null)
      setUser(null)
    }
  }

  const value: AdminAuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: Boolean(session && user),
    login,
    logout,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
