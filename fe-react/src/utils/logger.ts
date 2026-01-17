/**
 * Frontend Logger Utility
 * Cung cấp structured logging với context tracking
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: any;
}

class Logger {
    /**
     * Internal log method với format nhất quán
     */
    private log(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            ...context
        };

        // Console output với format đẹp hơn
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        if (level === 'error') {
            console.error(prefix, message, context || '');
        } else if (level === 'warn') {
            console.warn(prefix, message, context || '');
        } else {
            console.log(prefix, message, context || '');
        }

    }

    /**
     * Log thông tin chung
     */
    info(message: string, context?: LogContext) {
        this.log('info', message, context);
    }

    /**
     * Log cảnh báo
     */
    warn(message: string, context?: LogContext) {
        this.log('warn', message, context);
    }

    /**
     * Log lỗi với full context
     */
    error(message: string, context?: LogContext) {
        this.log('error', message, context);
    }

}

// Export singleton instance
export const logger = new Logger();
