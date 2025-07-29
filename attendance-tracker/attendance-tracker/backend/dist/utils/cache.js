"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const logger_1 = __importDefault(require("./logger"));
class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.initializeClient();
    }
    async initializeClient() {
        try {
            this.client = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    connectTimeout: 5000
                }
            });
            this.client.on('error', (err) => {
                logger_1.default.error('Redis Client Error:', { error: err.message });
                this.isConnected = false;
            });
            this.client.on('connect', () => {
                logger_1.default.info('Redis client connected');
                this.isConnected = true;
            });
            this.client.on('disconnect', () => {
                logger_1.default.warn('Redis client disconnected');
                this.isConnected = false;
            });
            await this.client.connect();
        }
        catch (error) {
            logger_1.default.warn('Redis connection failed, caching disabled:', { error: error.message });
            this.client = null;
            this.isConnected = false;
        }
    }
    async get(key) {
        if (!this.client || !this.isConnected) {
            return null;
        }
        try {
            const value = await this.client.get(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        }
        catch (error) {
            logger_1.default.error('Cache get error:', { key, error: error.message });
            return null;
        }
    }
    async set(key, value, ttlSeconds = 300) {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache set error:', { key, error: error.message });
            return false;
        }
    }
    async del(key) {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            await this.client.del(key);
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache delete error:', { key, error: error.message });
            return false;
        }
    }
    async delPattern(pattern) {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache delete pattern error:', { pattern, error: error.message });
            return false;
        }
    }
    async flush() {
        if (!this.client || !this.isConnected) {
            return false;
        }
        try {
            await this.client.flushAll();
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache flush error:', { error: error.message });
            return false;
        }
    }
    isAvailable() {
        return this.client !== null && this.isConnected;
    }
    async disconnect() {
        if (this.client) {
            try {
                await this.client.disconnect();
                logger_1.default.info('Redis client disconnected gracefully');
            }
            catch (error) {
                logger_1.default.error('Error disconnecting Redis client:', { error: error.message });
            }
        }
    }
}
exports.default = new CacheService();
//# sourceMappingURL=cache.js.map