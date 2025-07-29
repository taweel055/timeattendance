
interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug'
};

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    if (this.isDevelopment) {
      switch (level) {
        case LOG_LEVELS.ERROR:
          console.error(`[${timestamp}] ERROR:`, message, data || '');
          break;
        case LOG_LEVELS.WARN:
          console.warn(`[${timestamp}] WARN:`, message, data || '');
          break;
        case LOG_LEVELS.INFO:
          console.info(`[${timestamp}] INFO:`, message, data || '');
          break;
        case LOG_LEVELS.DEBUG:
          console.debug(`[${timestamp}] DEBUG:`, message, data || '');
          break;
        default:
          console.log(`[${timestamp}] ${level.toUpperCase()}:`, message, data || '');
      }
    } else {
      console.log(JSON.stringify(logData));
    }
  }

  error(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.ERROR, message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    this.formatMessage(LOG_LEVELS.DEBUG, message, data);
  }
}

const logger = new Logger();
export default logger;
