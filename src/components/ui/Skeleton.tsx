import React from 'react'
import { cn } from '../../lib/utils'

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-neutral-200/80', className)}
      {...props}
    />
  )
}

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="mt-3.5 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-1/2 mt-2" />
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-10 rounded-xl" />
      </div>
    </div>
  )
}
