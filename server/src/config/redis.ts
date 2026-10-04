import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export let isRedisConnected = false;

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true,
});

redisClient.on('connect', () => {
  isRedisConnected = true;
  logger.info('Redis connected successfully');
});

redisClient.on('error', (err) => {
  isRedisConnected = false;
  logger.warn(`Redis Connection Warning: ${err.message}`);
});

export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.connect();
    isRedisConnected = true;
    return true;
  } catch (error) {
    isRedisConnected = false;
    logger.warn('Redis connection could not be established at startup.');
    return false;
  }
};
