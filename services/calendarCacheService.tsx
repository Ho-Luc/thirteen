interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CalendarCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for stats
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup expired entries every 5 minutes
    this.startAutoCleanup();
  }

  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredEntries();
    }, 5 * 60 * 1000);
  }

  // OPTIMIZATION 1: Generic cache methods to reduce code duplication
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    const cacheTime = ttl || this.CACHE_TTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheTime
    });
  }

  getCachedUserMonth(userId: string, groupId: string, year: number, month: number) {
    return this.getCachedData<CalendarEntry[]>(`user-month-${userId}-${groupId}-${year}-${month}`);
  }

  setCachedUserMonth(userId: string, groupId: string, year: number, month: number, data: CalendarEntry[]): void {
    this.setCachedData(`user-month-${userId}-${groupId}-${year}-${month}`, data);
  }

  getCachedUserStats(userId: string, groupId: string) {
    return this.getCachedData<UserStats>(`user-stats-${userId}-${groupId}`);
  }

  setCachedUserStats(userId: string, groupId: string, stats: UserStats): void {
    this.setCachedData(`user-stats-${userId}-${groupId}`, stats, this.STATS_CACHE_TTL);
  }

  getCachedWeeklyEntries(groupId: string, weekKey: string) {
    return this.getCachedData<CalendarEntry[]>(`weekly-${groupId}-${weekKey}`);
  }

  setCachedWeeklyEntries(groupId: string, weekKey: string, data: CalendarEntry[]): void {
    this.setCachedData(`weekly-${groupId}-${weekKey}`, data);
  }

  generateWeekKey(weekDates: Date[]): string {
    if (weekDates.length === 0) return '';
    
    const startDate = weekDates[0].toISOString().split('T')[0];
    const endDate = weekDates[weekDates.length - 1].toISOString().split('T')[0];
    return `${startDate}_${endDate}`;
  }

  invalidateUserCache(userId: string, groupId: string, date?: string): void {
    const patterns = [
      `user-stats-${userId}-${groupId}`,
      `user-month-${userId}-${groupId}`,
      `weekly-${groupId}`
    ];
    
    for (const [key] of this.cache) {
      if (patterns.some(pattern => key.startsWith(pattern))) {
        this.cache.delete(key);
      }
    }
  }

  invalidateMonthCache(userId: string, groupId: string, year: number, month: number): void {
    this.cache.delete(`user-month-${userId}-${groupId}-${year}-${month}`);
  }

  clearAllCache(): void {
    this.cache.clear();
  }

  cleanExpiredEntries(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    // If cache is getting too large, remove oldest entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toDelete = entries.slice(0, this.cache.size - 50);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  getCacheStats(): { size: number; keys: string[]; memoryUsage: string } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.values())).length / 1024)}KB`
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAllCache();
  }
}

export const calendarCacheService = new CalendarCacheService();