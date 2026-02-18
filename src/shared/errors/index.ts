/**
 * Custom error classes and error handling utilities
 * AI-optimized error messages with actionable recovery suggestions
 */

import type { ApiResponse } from '../types/index.js';
import { ErrorCode } from '../types/index.js';

/**
 * Error recovery suggestion for AI assistants
 */
export interface ErrorRecovery {
  suggestion: string;
  alternatives?: string[] | undefined;
  canRetry: boolean;
  retryAfterMs?: number | undefined;
}

/**
 * Base application error class with AI-friendly messages
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly recovery: ErrorRecovery;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: unknown,
    recovery?: Partial<ErrorRecovery>,
    userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.userMessage = userMessage || message;
    this.recovery = {
      suggestion: recovery?.suggestion || '잠시 후 다시 시도해주세요.',
      alternatives: recovery?.alternatives,
      canRetry: recovery?.canRetry ?? true,
      retryAfterMs: recovery?.retryAfterMs,
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Invalid stock symbol error with helpful suggestions
 */
export class InvalidSymbolError extends AppError {
  constructor(symbol: string) {
    const suggestions = getSymbolSuggestions(symbol);
    super(
      `Invalid or unknown stock symbol: ${symbol}`,
      ErrorCode.INVALID_SYMBOL,
      400,
      { symbol, suggestions },
      {
        suggestion: `"${symbol}" 종목 코드를 찾을 수 없습니다. 올바른 형식인지 확인해주세요.`,
        alternatives: suggestions,
        canRetry: false,
      },
      `"${symbol}" 종목을 찾을 수 없습니다. ${suggestions.length > 0 ? `혹시 ${suggestions.join(', ')} 중 하나를 찾으시나요?` : '종목 코드를 다시 확인해주세요.'}`
    );
    this.name = 'InvalidSymbolError';
  }
}

/**
 * Get symbol suggestions based on input
 */
function getSymbolSuggestions(symbol: string): string[] {
  const upper = symbol.toUpperCase();
  const suggestions: string[] = [];

  // Common US stock mappings
  const commonMappings: Record<string, string[]> = {
    'APPLE': ['AAPL'],
    'APPL': ['AAPL'],
    'MICROSOFT': ['MSFT'],
    'GOOGLE': ['GOOGL', 'GOOG'],
    'AMAZON': ['AMZN'],
    'TESLA': ['TSLA'],
    'NVIDIA': ['NVDA'],
    'META': ['META'],
    'FACEBOOK': ['META'],
    'SAMSUNG': ['005930.KS'],
    'HYNIX': ['000660.KS'],
    'SK': ['000660.KS'],
    'NAVER': ['035420.KS'],
    'KAKAO': ['035720.KS'],
  };

  // Check for Korean stock without .KS suffix
  if (/^\d{6}$/.test(upper)) {
    suggestions.push(`${upper}.KS (한국 주식은 .KS 접미사 필요)`);
  }

  // Check common mappings
  for (const [key, values] of Object.entries(commonMappings)) {
    if (upper.includes(key) || key.includes(upper)) {
      suggestions.push(...values);
    }
  }

  return [...new Set(suggestions)].slice(0, 3);
}

/**
 * External API error with specific guidance
 */
export class ApiError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorCode.API_ERROR,
      502,
      details,
      {
        suggestion: '외부 API 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        canRetry: true,
        retryAfterMs: 5000,
      },
      '데이터 제공 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.'
    );
    this.name = 'ApiError';
  }
}

/**
 * Rate limit error with retry guidance
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number | undefined;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    const waitTime = retryAfter || 60;
    super(
      message,
      ErrorCode.RATE_LIMIT,
      429,
      { retryAfter },
      {
        suggestion: `요청 한도를 초과했습니다. ${waitTime}초 후에 다시 시도해주세요.`,
        canRetry: true,
        retryAfterMs: waitTime * 1000,
      },
      `요청이 너무 많습니다. ${waitTime}초 후에 다시 시도해주세요.`
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Not found error with context
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(
      message,
      ErrorCode.NOT_FOUND,
      404,
      { resource, identifier },
      {
        suggestion: `요청하신 ${resource}을(를) 찾을 수 없습니다. 입력값을 확인해주세요.`,
        canRetry: false,
      },
      `${resource}${identifier ? ` "${identifier}"` : ''}을(를) 찾을 수 없습니다.`
    );
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error with specific field guidance
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      details,
      {
        suggestion: '입력값을 확인해주세요. ' + message,
        canRetry: false,
      },
      message
    );
    this.name = 'ValidationError';
  }
}

/**
 * Timeout error with operation context
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation timed out: ${operation} (${timeoutMs}ms)`,
      ErrorCode.TIMEOUT,
      504,
      { operation, timeoutMs },
      {
        suggestion: '요청 처리 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.',
        canRetry: true,
        retryAfterMs: 3000,
      },
      `처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.`
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Currency validation error
 */
export class InvalidCurrencyError extends AppError {
  constructor(currency: string, supported: string[]) {
    super(
      `Invalid currency code: ${currency}`,
      ErrorCode.VALIDATION_ERROR,
      400,
      { currency, supported },
      {
        suggestion: `"${currency}"는 지원하지 않는 통화입니다. 지원 통화: ${supported.join(', ')}`,
        alternatives: supported,
        canRetry: false,
      },
      `"${currency}"는 지원하지 않는 통화입니다. ${supported.slice(0, 5).join(', ')} 등을 사용해주세요.`
    );
    this.name = 'InvalidCurrencyError';
  }
}

/**
 * Extended API response type with recovery info
 */
export interface ExtendedApiResponse<T> extends ApiResponse<T> {
  error?: {
    code: string;
    message: string;
    userMessage?: string;
    details?: unknown;
    recovery?: ErrorRecovery;
  };
}

/**
 * Create API response from error with AI-friendly recovery suggestions
 */
export function errorToResponse(error: unknown): ExtendedApiResponse<never> {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details,
        recovery: error.recovery,
      },
      timestamp,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message,
        userMessage: '예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        recovery: {
          suggestion: '문제가 지속되면 관리자에게 문의해주세요.',
          canRetry: true,
          retryAfterMs: 3000,
        },
      },
      timestamp,
    };
  }

  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      userMessage: '알 수 없는 오류가 발생했습니다.',
      recovery: {
        suggestion: '잠시 후 다시 시도해주세요.',
        canRetry: true,
      },
    },
    timestamp,
  };
}

/**
 * Format error for MCP tool response (AI-optimized)
 */
export function formatErrorForAI(error: unknown): string {
  if (error instanceof AppError) {
    let response = `## Error: ${error.code}\n\n`;
    response += `**Message**: ${error.userMessage}\n\n`;
    response += `### Recovery Suggestion\n`;
    response += `${error.recovery.suggestion}\n`;

    if (error.recovery.alternatives && error.recovery.alternatives.length > 0) {
      response += `\n**Alternatives**: ${error.recovery.alternatives.join(', ')}\n`;
    }

    if (error.recovery.canRetry) {
      response += `\n**Can Retry**: Yes`;
      if (error.recovery.retryAfterMs) {
        response += ` (after ${error.recovery.retryAfterMs / 1000} seconds)`;
      }
    } else {
      response += `\n**Can Retry**: No - please check input parameters`;
    }

    return response;
  }

  if (error instanceof Error) {
    return `## Error\n\n**Message**: ${error.message}\n\n**Suggestion**: 잠시 후 다시 시도해주세요.`;
  }

  return `## Error\n\n**Message**: 알 수 없는 오류가 발생했습니다.\n\n**Suggestion**: 잠시 후 다시 시도해주세요.`;
}

/**
 * Create successful API response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enhanced retry wrapper for async functions with jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    maxDelayMs?: number;
    jitter?: boolean;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, nextDelayMs: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    maxDelayMs = 30000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry rate limit errors
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Don't retry validation errors
      if (error instanceof ValidationError || error instanceof InvalidSymbolError) {
        throw error;
      }

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        // Calculate delay with exponential backoff
        let delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;

        // Cap delay at max
        delay = Math.min(delay, maxDelayMs);

        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }

        // Callback before retry
        if (onRetry) {
          onRetry(error, attempt, delay);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operation: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs));
    }, timeoutMs);

    // Clean up timer on process exit
    if (timer.unref) {
      timer.unref();
    }
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker for external API calls
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly name: string,
    private readonly options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      halfOpenSuccessThreshold?: number;
    } = {}
  ) {}

  private get failureThreshold(): number {
    return this.options.failureThreshold ?? 5;
  }

  private get resetTimeoutMs(): number {
    return this.options.resetTimeoutMs ?? 30000;
  }

  private get halfOpenSuccessThreshold(): number {
    return this.options.halfOpenSuccessThreshold ?? 2;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      throw new ApiError(`Circuit breaker "${this.name}" is OPEN - service temporarily unavailable`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if state should transition
   */
  private checkState(): void {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Reset circuit to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
  }

  /**
   * Get current state
   */
  getState(): { state: CircuitState; failures: number; lastFailure: Date | null } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
    };
  }
}

/**
 * Parallel executor with concurrency limit
 */
export async function parallelWithLimit<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
    continueOnError?: boolean;
  } = {}
): Promise<Array<{ status: 'fulfilled'; value: R } | { status: 'rejected'; reason: unknown; item: T }>> {
  const { concurrency = 5, onProgress, continueOnError = true } = options;
  const results: Array<{ status: 'fulfilled'; value: R } | { status: 'rejected'; reason: unknown; item: T }> = [];
  const inProgress = new Set<Promise<void>>();
  let completed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === undefined) continue;

    const currentIndex = i;
    const currentItem = item;

    const executeTask = async (): Promise<void> => {
      try {
        const result = await fn(currentItem, currentIndex);
        results[currentIndex] = { status: 'fulfilled', value: result };
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        results[currentIndex] = { status: 'rejected', reason: error, item: currentItem };
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
      }
    };

    const taskPromise = executeTask().finally(() => {
      inProgress.delete(taskPromise);
    });

    inProgress.add(taskPromise);

    // Wait if we've reached concurrency limit
    if (inProgress.size >= concurrency) {
      await Promise.race(inProgress);
    }
  }

  // Wait for remaining promises
  await Promise.all(inProgress);

  return results;
}

/**
 * Batch API requests with automatic retry
 */
export async function batchRequest<T, R>(
  items: T[],
  fn: (items: T[]) => Promise<R[]>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, delayBetweenBatches = 100 } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await fn(batch);
    results.push(...batchResults);

    // Delay between batches to avoid rate limiting
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}
