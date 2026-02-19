// Cache Module - Redis Implementation - Max 200 lines
const redis = require('redis');
const config = require('../../config');
const logger = require('../logger');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.defaultTTL = config.redis.ttl || 3600;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        password: config.redis.password,
        database: config.redis.db,
        keyPrefix: config.redis.keyPrefix
      });

      this.client.on('error', (error) => {
        logger.error('Redis error:', error);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.connected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      logger.info('Redis disconnected');
    }
  }

  async get(key) {
    try {
      if (!this.connected) return null;
      
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.connected) return false;
      
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.connected) return false;
      
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.connected) return false;
      
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      if (!this.connected) return false;
      
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.connected) return false;
      
      await this.client.flushDb();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  // Pattern-based operations
  async keys(pattern) {
    try {
      if (!this.connected) return [];
      
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  async delPattern(pattern) {
    try {
      if (!this.connected) return false;
      
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Specific cache strategies
  async cacheQuery(key, queryFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached) {
        logger.debug('Cache hit:', key);
        return cached;
      }

      // Execute query and cache result
      logger.debug('Cache miss:', key);
      const result = await queryFunction();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error('Cache query error:', error);
      throw error;
    }
  }

  // Session management
  async getSession(sessionId) {
    return this.get(`session:${sessionId}`);
  }

  async setSession(sessionId, data, ttl = 86400) {
    return this.set(`session:${sessionId}`, data, ttl);
  }

  async deleteSession(sessionId) {
    return this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async incrementCounter(key, window = 60) {
    try {
      if (!this.connected) return { count: 0, ttl: 0 };
      
      const exists = await this.exists(key);
      
      if (!exists) {
        await this.set(key, 1, window);
        return { count: 1, ttl: window };
      }
      
      const count = await this.client.incr(key);
      const ttl = await this.client.ttl(key);
      
      return { count, ttl };
    } catch (error) {
      logger.error('Rate limit error:', error);
      return { count: 0, ttl: 0 };
    }
  }

  // Cache invalidation helpers
  async invalidateUser(userId) {
    await this.delPattern(`user:${userId}:*`);
  }

  async invalidateProduct(productId) {
    await this.delPattern(`product:${productId}:*`);
  }

  async invalidateOrder(orderId) {
    await this.delPattern(`order:${orderId}:*`);
  }

  // Health check
  async ping() {
    try {
      if (!this.connected) return false;
      
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Statistics
  async getStats() {
    try {
      if (!this.connected) return null;
      
      const info = await this.client.info('stats');
      return info;
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
}

module.exports = new CacheService();