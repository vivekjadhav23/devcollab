import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient = null;
let pubClient = null;
let subClient = null;
let isMock = false;

// Clean in-memory Redis stub for systems running without Redis installations
class InMemoryRedisMock {
  constructor() {
    this.store = new Map();
    logger.warn('⚠️  Redis not found. Initialized In-Memory Redis Mock fallback.');
  }

  on(event, cb) {
    if (event === 'connect') {
      setTimeout(() => cb(), 10);
    }
  }

  async set(key, value, ...args) {
    this.store.set(key, value);
    return 'OK';
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async del(key) {
    this.store.delete(key);
    return 1;
  }
}

const setupMockClients = () => {
  const mock = new InMemoryRedisMock();
  redisClient = mock;
  pubClient = mock;
  subClient = mock;
  isMock = true;
};

export const connectRedis = () => {
  return new Promise((resolve) => {
    let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Automatically enforce secure TLS (rediss://) for cloud Redis hosts (e.g. Upstash)
    if (redisUrl.startsWith('redis://') && !redisUrl.includes('localhost') && !redisUrl.includes('127.0.0.1') && !redisUrl.includes('redis:')) {
      redisUrl = redisUrl.replace('redis://', 'rediss://');
      logger.info('Enforced secure TLS (rediss://) connection configuration for external Redis host.');
    }
    
    try {
      const mainClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        showFriendlyErrorStack: true,
        connectTimeout: 1000, // Fail fast if server is not there
        retryStrategy(times) {
          // Stop retrying after 1 failed attempt and fallback quickly in dev
          if (times > 1) {
            logger.warn('Failed to connect to Redis server. Initiating in-memory fallback store...');
            setupMockClients();
            resolve(redisClient);
            return null; // Stop reconnection retries
          }
          return 500;
        }
      });

      const duplicateClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        showFriendlyErrorStack: true,
        connectTimeout: 1000,
        retryStrategy(times) {
          if (times > 1) return null;
          return 500;
        }
      });

      redisClient = mainClient;
      pubClient = mainClient;
      subClient = duplicateClient;
      isMock = false;

      redisClient.once('connect', () => {
        logger.info('Redis Connected successfully');
        resolve(redisClient);
      });

      redisClient.on('error', (err) => {
        if (isMock) return;
        logger.error(`Redis Connection Attempt Failed: ${err.message}`);
      });

      subClient.on('error', (err) => {
        if (isMock) return;
        logger.error(`Redis Subscription Client Error: ${err.message}`);
      });

    } catch (error) {
      logger.error(`Failed to initialize Redis client: ${error.message}. Using In-Memory fallback.`);
      setupMockClients();
      resolve(redisClient);
    }
  });
};

export const getRedis = () => {
  if (!redisClient) {
    logger.warn('getRedis() was called before connectRedis() resolved!');
  }
  return redisClient;
};

export const getPubSubClients = () => {
  if (!pubClient || !subClient) {
    logger.warn('getPubSubClients() was called before connectRedis() resolved!');
  }
  return { pubClient, subClient, isMock };
};
