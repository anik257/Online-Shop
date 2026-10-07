import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[Outfit Avenue] Supabase URL or Anon/Publishable Key is missing in environment variables. ' +
      'Please check your .env configuration for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

/**
 * Typed Supabase Client for Outfit Avenue
 * Uses anonymous / publishable key adhering to Row Level Security (RLS) policies.
 */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)
