import { createClient, RedisClientType } from 'redis';
import logger from './logger';

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error: any) {
      logger.warn('Redis connection failed, caching disabled:', { error: error.message });
      this.client = null;
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error: any) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error: any) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error: any) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  async delPattern(pattern: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error: any) {
      logger.error('Cache delete pattern error:', { pattern, error: error.message });
      return false;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error: any) {
      logger.error('Cache flush error:', { error: error.message });
      return false;
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        logger.info('Redis client disconnected gracefully');
      } catch (error: any) {
        logger.error('Error disconnecting Redis client:', { error: error.message });
      }
    }
  }
}

export default new CacheService();
