/**
 * Structured logging service
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  };
}

interface LoggerOptions {
  level: LogLevel;
  context?: string;
  useJson: boolean;
}

const DEFAULT_OPTIONS: LoggerOptions = {
  level: LogLevel.INFO,
  useJson: process.env.NODE_ENV === 'production',
};

class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Override with environment variable if set
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.options.level = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    return new Logger({
      ...this.options,
      context: this.options.context ? `${this.options.context}:${context}` : context,
    });
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log at INFO level
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log at WARN level
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorInfo = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error
        ? { message: String(error) }
        : undefined;

    this.log(LogLevel.ERROR, message, data, errorInfo);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: { name?: string; message: string; stack?: string | undefined }
  ): void {
    if (level < this.options.level) {
      return;
    }

    const entry: LogEntry = {
      level: LogLevel[level],
      message,
      timestamp: new Date().toISOString(),
    };

    if (this.options.context) {
      entry.context = this.options.context;
    }

    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        name: error.name ?? 'Error',
        message: error.message,
        stack: error.stack,
      };
    }

    this.output(level, entry);
  }

  /**
   * Output log entry to appropriate stream
   */
  private output(level: LogLevel, entry: LogEntry): void {
    const output = level >= LogLevel.ERROR ? console.error : console.log;

    if (this.options.useJson) {
      output(JSON.stringify(entry));
    } else {
      const levelStr = this.colorize(entry.level, level);
      const contextStr = entry.context ? `[${entry.context}] ` : '';
      const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      const errorStr = entry.error
        ? `\n  Error: ${entry.error.message}${entry.error.stack ? '\n' + entry.error.stack : ''}`
        : '';

      output(`${entry.timestamp} ${levelStr} ${contextStr}${entry.message}${dataStr}${errorStr}`);
    }
  }

  /**
   * Add color to log level (for terminal output)
   */
  private colorize(levelStr: string, level: LogLevel): string {
    // Skip colors in production or non-TTY environments
    if (this.options.useJson || !process.stdout.isTTY) {
      return `[${levelStr}]`;
    }

    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };

    const reset = '\x1b[0m';
    return `${colors[level]}[${levelStr}]${reset}`;
  }

  /**
   * Log request/response for API calls
   */
  logApiCall(
    method: string,
    url: string,
    status: number,
    durationMs: number,
    error?: Error
  ): void {
    const data = {
      method,
      url,
      status,
      durationMs,
    };

    if (error || status >= 400) {
      this.error(`API call failed: ${method} ${url}`, error, data);
    } else {
      this.info(`API call: ${method} ${url}`, data);
    }
  }

  /**
   * Log MCP tool invocation
   */
  logToolCall(
    tool: string,
    params: Record<string, unknown>,
    success: boolean,
    durationMs: number,
    error?: Error
  ): void {
    const data = {
      tool,
      params,
      success,
      durationMs,
    };

    if (error || !success) {
      this.error(`MCP tool call failed: ${tool}`, error, data);
    } else {
      this.info(`MCP tool call: ${tool}`, data);
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Export class for custom logger instances
export { Logger };
export type { LoggerOptions, LogEntry };
