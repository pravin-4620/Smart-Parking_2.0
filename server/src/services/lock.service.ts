import { Redis } from 'ioredis';
import crypto from 'node:crypto';

// In-memory fallback lock table for when Redis is offline
const inMemoryLocks = new Map<string, { token: string; expiresAt: number }>();

export class LockService {
  private static redisClient: Redis | null = null;

  public static setRedisClient(client: Redis) {
    LockService.redisClient = client;
  }

  /**
   * Acquire a temporary lock on a resource (e.g., slotId during reservation creation)
   * @param resourceKey Unique resource identifier (e.g., slotId)
   * @param ttlMs Lock expiry in milliseconds (default: 5000ms)
   * @returns boolean - true if lock acquired, false if locked by another concurrent process
   */
  public static async acquireLock(resourceKey: string, ttlMs = 5000): Promise<string | null> {
    const lockKey = `lock:${resourceKey}`;
    const token = crypto.randomUUID();

    // Try Redis Lock if available
    if (LockService.redisClient && LockService.redisClient.status === 'ready') {
      try {
        const result = await LockService.redisClient.set(
          lockKey,
          token,
          'PX',
          ttlMs,
          'NX'
        );
        return result === 'OK' ? token : null;
      } catch (err) {
        // Fallback to in-memory lock
      }
    }

    // In-memory atomic mutex implementation
    const now = Date.now();
    const existingLock = inMemoryLocks.get(lockKey);

    if (existingLock && existingLock.expiresAt > now) {
      // Lock is currently held by another thread/request
      return null;
    }

    // Acquire lock with TTL expiry timestamp
    inMemoryLocks.set(lockKey, { token, expiresAt: now + ttlMs });
    return token;
  }

  /**
   * Release a previously acquired lock
   * @param resourceKey Unique resource identifier
   */
  public static async releaseLock(resourceKey: string, token: string): Promise<void> {
    const lockKey = `lock:${resourceKey}`;

    if (LockService.redisClient && LockService.redisClient.status === 'ready') {
      try {
        await LockService.redisClient.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          1,
          lockKey,
          token
        );
      } catch (err) {
        // Fallback
      }
    }

    if (inMemoryLocks.get(lockKey)?.token === token) inMemoryLocks.delete(lockKey);
  }
}
