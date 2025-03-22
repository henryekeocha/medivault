import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import redis from './redis.js';

// Declare global types
declare global {
  var optimizedPrisma: OptimizedPrismaClient | undefined;
}

// Cache TTL in seconds
const DEFAULT_CACHE_TTL = 300; // 5 minutes

// Create a hash of the query for cache key
function createQueryHash(query: string, params: any): string {
  const hash = createHash('sha256');
  hash.update(query + JSON.stringify(params));
  return hash.digest('hex');
}

// Wrapper for Prisma client with caching
export class OptimizedPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // Cache wrapper for queries
  async cachedQuery<T>(
    key: string,
    ttl: number,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryFn();
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  }

  // Batch query executor
  async batchQueries<T>(
    queries: Array<() => Promise<T>>,
    batchSize = 5
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(q => q()));
      results.push(...batchResults);
    }
    return results;
  }

  // Optimized query methods
  async getImageStats(userId: string) {
    const cacheKey = `image-stats:${userId}`;
    return this.cachedQuery(cacheKey, DEFAULT_CACHE_TTL, async () => {
      const [totalCount, totalSize] = await Promise.all([
        this.image.count({ where: { userId } }),
        this.image.aggregate({
          where: { userId },
          _sum: { fileSize: true },
        }),
      ]);
      return { totalCount, totalSize: totalSize._sum.fileSize || 0 };
    });
  }

  async getUserActivities(userId: string, limit = 10) {
    const cacheKey = `user-activities:${userId}:${limit}`;
    return this.cachedQuery(cacheKey, 60, async () => {
      return this.userActivity.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async getFileTypes() {
    const cacheKey = 'file-types';
    return this.cachedQuery(cacheKey, 3600, async () => {
      return this.image.groupBy({
        by: ['fileType'],
        _count: true,
      });
    });
  }

  // Cache invalidation methods
  async invalidateUserCache(userId: string) {
    const keys = await redis.keys(`*:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async invalidateImageCache() {
    const keys = await redis.keys('image-*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Export singleton instance
export const optimizedPrisma = global.optimizedPrisma || new OptimizedPrismaClient();
if (process.env.NODE_ENV !== 'production') {
  global.optimizedPrisma = optimizedPrisma;
} 