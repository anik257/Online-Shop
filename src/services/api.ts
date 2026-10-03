/**
 * Service Layer Foundation
 * API & Supabase clients will be integrated in subsequent steps.
 */

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export const apiService = {
  status: 'initialized',
  version: '1.0.0',
}
