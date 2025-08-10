// services/calendarCacheService.tsx - Production caching service
import { CalendarEntry, UserStats } from './calendarService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CalendarCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for stats

  // Cache user monthly data
  getCachedUserMonth(userId: string, groupId: string, year: number, month: number): CalendarEntry[] | null {
    const key = `user-month-${userId}-${groupId}-${year}-${month}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  setCachedUserMonth(
    userId: string, 
    groupId: string, 
    year: number, 
    month: number, 
    data: CalendarEntry[]
  ): void {
    const key = `user-month-${userId}-${groupId}-${year}-${month}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    });
  }

  // Cache user stats
  getCachedUserStats(userId: string, groupId: string): UserStats | null {
    const key = `user-stats-${userId}-${groupId}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  setCachedUserStats(userId: string, groupId: string, stats: UserStats): void {
    const key = `user-stats-${userId}-${groupId}`;
    this.cache.set(key, {
      data: stats,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.STATS_CACHE_TTL
    });
  }

  // Cache weekly calendar entries
  getCachedWeeklyEntries(groupId: string, weekKey: string): CalendarEntry[] | null {
    const key = `weekly-${groupId}-${weekKey}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  setCachedWeeklyEntries(groupId: string, weekKey: string, data: CalendarEntry[]): void {
    const key = `weekly-${groupId}-${weekKey}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    });
  }

  // Generate week key for consistent caching
  generateWeekKey(weekDates: Date[]): string {
    const startDate = weekDates[0].toISOString().split('T')[0];
    const endDate = weekDates[6].toISOString().split('T')[0];
    return `${startDate}-${endDate}`;
  }

  // Invalidate cache when user updates their calendar
  invalidateUserCache(userId: string, groupId: string, date?: string): void {
    const patterns = [
      `user-stats-${userId}-${groupId}`,
      `user-month-${userId}-${groupId}`,
      `weekly-${groupId}`
    ];
    
    // Remove all matching cache entries
    for (const [key] of this.cache) {
      if (patterns.some(pattern => key.startsWith(pattern))) {
        this.cache.delete(key);
      }
    }
  }

  // Invalidate specific month cache
  invalidateMonthCache(userId: string, groupId: string, year: number, month: number): void {
    const key = `user-month-${userId}-${groupId}-${year}-${month}`;
    this.cache.delete(key);
  }

  // Clear all cache (useful for logout or major data changes)
  clearAllCache(): void {
    this.cache.clear();
  }

  // Get cache statistics (for debugging)
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Clean expired entries
  cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const calendarCacheService = new CalendarCacheService();