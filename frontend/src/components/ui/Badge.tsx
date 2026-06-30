import React from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-900/50 text-emerald-300 border border-emerald-800',
  warning: 'bg-amber-900/50 text-amber-300 border border-amber-800',
  error: 'bg-red-900/50 text-red-300 border border-red-800',
  info: 'bg-blue-900/50 text-blue-300 border border-blue-800',
  neutral: 'bg-gray-800 text-gray-400 border border-gray-700',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-gray-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Map indexing status to badge variant
 */
export function IndexingBadge({
  status,
}: {
  status: 'pending' | 'indexing' | 'indexed' | 'error' | 'cloning' | 'parsing' | 'embedding' | string;
}) {
  const variantMap: Record<string, BadgeVariant> = {
    indexed: 'success',
    indexing: 'info',
    cloning: 'info',
    parsing: 'info',
    embedding: 'info',
    pending: 'neutral',
    error: 'error',
  };
  const labelMap: Record<string, string> = {
    indexed: 'Indexed',
    indexing: 'Indexing...',
    cloning: 'Cloning...',
    parsing: 'Parsing...',
    embedding: 'Embedding...',
    pending: 'Pending',
    error: 'Error',
  };

  const variant = variantMap[status] ?? 'neutral';
  const label = labelMap[status] ?? status;

  return (
    <Badge variant={variant} dot size="sm">
      {label}
    </Badge>
  );
}
