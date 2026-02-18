'use client';

import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  ReactNode,
  useState,
  useId,
} from 'react';
import { classNames } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  /** 입력 필드 크기 */
  inputSize?: 'sm' | 'md' | 'lg';
  /** 비밀번호 표시/숨김 토글 */
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = true,
      inputSize = 'md',
      showPasswordToggle = false,
      className = '',
      type,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;

    const sizeClasses = {
      sm: 'py-1.5 text-sm',
      md: 'py-2 text-sm',
      lg: 'py-3 text-base',
    };

    const hasError = Boolean(error);
    const hasSuccess = Boolean(success);

    return (
      <div className={classNames(fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error
                ? `${inputId}-error`
                : success
                  ? `${inputId}-success`
                  : hint
                    ? `${inputId}-hint`
                    : undefined
            }
            className={classNames(
              'block w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60',
              sizeClasses[inputSize],
              // Error state
              hasError
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                : hasSuccess
                  ? 'border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-blue-400/20 dark:focus:border-blue-400',
              // Padding based on icons
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon || (isPasswordType && showPasswordToggle) ? 'pr-10' : 'pr-4',
              className
            )}
            {...props}
          />
          {/* Password toggle or right icon */}
          {isPasswordType && showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          ) : rightIcon ? (
            <div
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          ) : null}
        </div>

        {/* Error, success, or hint message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {!error && success && (
          <p
            id={`${inputId}-success`}
            className="mt-1.5 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {success}
          </p>
        )}
        {!error && !success && hint && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5"
          >
            <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea 컴포넌트
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  fullWidth?: boolean;
  /** 자동 높이 조절 */
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      success,
      hint,
      fullWidth = true,
      autoResize = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const hasError = Boolean(error);
    const hasSuccess = Boolean(success);

    return (
      <div className={classNames(fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${inputId}-error`
              : success
                ? `${inputId}-success`
                : hint
                  ? `${inputId}-hint`
                  : undefined
          }
          className={classNames(
            'block w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60',
            'px-4 py-2.5 text-sm min-h-[80px]',
            autoResize && 'resize-none overflow-hidden',
            hasError
              ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
              : hasSuccess
                ? 'border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500',
            className
          )}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {!error && success && (
          <p
            id={`${inputId}-success`}
            className="mt-1.5 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {success}
          </p>
        )}
        {!error && !success && hint && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5"
          >
            <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select 컴포넌트
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  selectSize?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder = '선택해주세요',
      fullWidth = true,
      selectSize = 'md',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const hasError = Boolean(error);

    const sizeClasses = {
      sm: 'py-1.5 text-sm',
      md: 'py-2 text-sm',
      lg: 'py-3 text-base',
    };

    return (
      <div className={classNames(fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={classNames(
              'block w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60',
              'appearance-none cursor-pointer',
              'pl-4 pr-10',
              sizeClasses[selectSize],
              hasError
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500',
              className
            )}
            {...props}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div
            className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400"
            aria-hidden="true"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {!error && hint && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
