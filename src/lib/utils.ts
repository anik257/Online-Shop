import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { BRAND } from './brand'

/**
 * Standard utility to conditionally merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format price in BDT currency
 */
export function formatPrice(amount: number): string {
  return `${BRAND.currency.symbol}${amount.toLocaleString('en-BD')}`
}

/**
 * Format date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
