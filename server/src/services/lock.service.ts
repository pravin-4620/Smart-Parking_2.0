import { Redis } from 'ioredis';

// In-memory fallback lock table for when Redis is offline
const inMemoryLocks = new Map<string, number>();

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
  public static async acquireLock(resourceKey: string, ttlMs = 5000): Promise<boolean> {
    const lockKey = `lock:${resourceKey}`;

    // Try Redis Lock if available
    if (LockService.redisClient && LockService.redisClient.status === 'ready') {
      try {
        const result = await LockService.redisClient.set(
          lockKey,
          'locked',
          'PX',
          ttlMs,
          'NX'
        );
        return result === 'OK';
      } catch (err) {
        // Fallback to in-memory lock
      }
    }

    // In-memory atomic mutex implementation
    const now = Date.now();
    const existingLockTime = inMemoryLocks.get(lockKey);

    if (existingLockTime && existingLockTime > now) {
      // Lock is currently held by another thread/request
      return false;
    }

    // Acquire lock with TTL expiry timestamp
    inMemoryLocks.set(lockKey, now + ttlMs);
    return true;
  }

  /**
   * Release a previously acquired lock
   * @param resourceKey Unique resource identifier
   */
  public static async releaseLock(resourceKey: string): Promise<void> {
    const lockKey = `lock:${resourceKey}`;

    if (LockService.redisClient && LockService.redisClient.status === 'ready') {
      try {
        await LockService.redisClient.del(lockKey);
      } catch (err) {
        // Fallback
      }
    }

    inMemoryLocks.delete(lockKey);
  }
}

