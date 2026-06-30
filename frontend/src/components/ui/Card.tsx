import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  footerClassName?: string;
  bodyClassName?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({
  children,
  header,
  footer,
  className,
  headerClassName,
  footerClassName,
  bodyClassName,
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-800 bg-gray-900 overflow-hidden',
        hoverable &&
          'transition-all duration-150 hover:border-gray-700 hover:bg-gray-800/60 cursor-pointer',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {header && (
        <div
          className={cn(
            'px-5 py-3 border-b border-gray-800 font-medium text-gray-200',
            headerClassName,
          )}
        >
          {header}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
      {footer && (
        <div
          className={cn(
            'px-5 py-3 border-t border-gray-800 text-sm text-gray-400',
            footerClassName,
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
