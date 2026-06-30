import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className,
      wrapperClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-300"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-red-400">*</span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-gray-400 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-gray-900 text-gray-100 placeholder-gray-500 text-sm transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-700 hover:border-gray-600',
              leftIcon ? 'pl-9' : 'pl-3',
              rightIcon ? 'pr-9' : 'pr-3',
              'py-2.5',
              props.disabled && 'opacity-60 cursor-not-allowed',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-gray-400 pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <span>&#9888;</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
