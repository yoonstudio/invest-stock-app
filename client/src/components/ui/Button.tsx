'use client';

import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import { classNames } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** 버튼 눌림 효과 활성화 */
  pressEffect?: boolean;
  /** 아이콘만 있는 버튼 (정사각형) */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      pressEffect = true,
      iconOnly = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = classNames(
      // Base styles
      'relative inline-flex items-center justify-center font-medium rounded-lg',
      // Transition for smooth interactions
      'transition-all duration-200 ease-out',
      // Focus styles for accessibility
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'dark:focus-visible:ring-offset-gray-900',
      // Disabled styles
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
      // Press effect
      pressEffect && !disabled && 'active:scale-[0.98]'
    );

    const variantClasses = {
      primary: classNames(
        'bg-gradient-to-b from-blue-500 to-blue-600 text-white',
        'shadow-sm shadow-blue-500/25',
        'hover:from-blue-600 hover:to-blue-700 hover:shadow-md hover:shadow-blue-500/30',
        'focus-visible:ring-blue-500',
        'dark:from-blue-500 dark:to-blue-600 dark:shadow-blue-500/20',
        'dark:hover:from-blue-400 dark:hover:to-blue-500'
      ),
      secondary: classNames(
        'bg-gradient-to-b from-gray-500 to-gray-600 text-white',
        'shadow-sm shadow-gray-500/25',
        'hover:from-gray-600 hover:to-gray-700 hover:shadow-md hover:shadow-gray-500/30',
        'focus-visible:ring-gray-500',
        'dark:from-gray-600 dark:to-gray-700 dark:shadow-gray-500/20'
      ),
      outline: classNames(
        'border-2 border-gray-300 text-gray-700 bg-transparent',
        'hover:border-gray-400 hover:bg-gray-50',
        'focus-visible:ring-blue-500',
        'dark:border-gray-600 dark:text-gray-200',
        'dark:hover:border-gray-500 dark:hover:bg-gray-800/50'
      ),
      ghost: classNames(
        'text-gray-700 bg-transparent',
        'hover:bg-gray-100',
        'focus-visible:ring-blue-500',
        'dark:text-gray-200 dark:hover:bg-gray-800'
      ),
      danger: classNames(
        'bg-gradient-to-b from-red-500 to-red-600 text-white',
        'shadow-sm shadow-red-500/25',
        'hover:from-red-600 hover:to-red-700 hover:shadow-md hover:shadow-red-500/30',
        'focus-visible:ring-red-500',
        'dark:from-red-500 dark:to-red-600 dark:shadow-red-500/20'
      ),
      success: classNames(
        'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white',
        'shadow-sm shadow-emerald-500/25',
        'hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md hover:shadow-emerald-500/30',
        'focus-visible:ring-emerald-500',
        'dark:from-emerald-500 dark:to-emerald-600 dark:shadow-emerald-500/20'
      ),
    };

    const sizeClasses = iconOnly
      ? {
          xs: 'w-6 h-6 text-xs',
          sm: 'w-8 h-8 text-sm',
          md: 'w-10 h-10 text-sm',
          lg: 'w-12 h-12 text-base',
          xl: 'w-14 h-14 text-lg',
        }
      : {
          xs: 'px-2 py-1 text-xs gap-1',
          sm: 'px-3 py-1.5 text-sm gap-1.5',
          md: 'px-4 py-2 text-sm gap-2',
          lg: 'px-6 py-3 text-base gap-2',
          xl: 'px-8 py-4 text-lg gap-3',
        };

    return (
      <button
        ref={ref}
        className={classNames(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">로딩 중...</span>
          </span>
        )}

        {/* Button content */}
        <span
          className={classNames(
            'inline-flex items-center justify-center gap-inherit',
            loading && 'invisible'
          )}
        >
          {leftIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {children}
          {rightIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// 아이콘 버튼 래퍼 컴포넌트
interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <Button ref={ref} iconOnly className={className} {...props}>
        <span aria-hidden="true">{icon}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// 버튼 그룹 컴포넌트
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  /** 버튼들을 붙여서 표시 */
  attached?: boolean;
}

export function ButtonGroup({ children, className = '', attached = false }: ButtonGroupProps) {
  return (
    <div
      className={classNames(
        'inline-flex',
        attached ? '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:border-l-0' : 'gap-2',
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
}
