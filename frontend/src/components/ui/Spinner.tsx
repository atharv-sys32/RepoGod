import React from 'react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <div
        className={cn(
          'rounded-full border-indigo-500 border-t-transparent animate-spin',
          sizeClasses[size],
        )}
      />
      {label && <span className="text-sm text-gray-400">{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <Spinner size="lg" label={label ?? 'Loading...'} />
    </div>
  );
}
