import { Logger } from '@nestjs/common';

/**
 * Custom Logger wrapper để có structured logging format nhất quán
 */
export class AppLogger extends Logger {
    /**
     * Log error với full context và stack trace
     * Sử dụng method name khác để tránh conflict với base Logger
     */
    errorWithContext(message: string, error?: any, context?: Record<string, any>) {
        const errorContext = {
            ...context,
            timestamp: new Date().toISOString(),
            error: error?.message || error,
            stack: error?.stack
        };

        super.error(message, JSON.stringify(errorContext, null, 2));
    }

    /**
     * Log warning với context
     */
    warnWithContext(message: string, context?: Record<string, any>) {
        const warnContext = {
            ...context,
            timestamp: new Date().toISOString()
        };

        super.warn(message, JSON.stringify(warnContext, null, 2));
    }

    /**
     * Log info với context
     */
    logWithContext(message: string, context?: Record<string, any>) {
        const logContext = {
            ...context,
            timestamp: new Date().toISOString()
        };

        super.log(message, JSON.stringify(logContext, null, 2));
    }
}
