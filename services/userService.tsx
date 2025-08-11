import { account } from '../lib/appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_ID: 'userId',
  SESSION_ID: 'sessionId'
} as const;

const ERROR_MESSAGES = {
  INVALID_SESSION: 'Failed to create user session',
  INITIALIZATION_FAILED: 'Failed to initialize user session',
  SESSION_DELETION_FAILED: 'Failed to delete session'
} as const;

class UserService {
  private cachedUserId: string | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(): boolean {
    return this.cachedUserId !== null && 
           (Date.now() - this.cacheTimestamp) < this.CACHE_TTL;
  }

  private setCachedUserId(userId: string): void {
    this.cachedUserId = userId;
    this.cacheTimestamp = Date.now();
  }

  private clearCache(): void {
    this.cachedUserId = null;
    this.cacheTimestamp = 0;
  }

  async createAnonymousSession(): Promise<string> {
    try {
      const session = await account.createAnonymousSession();
      
      if (!session?.userId) {
        throw new Error('Invalid session response');
      }

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, session.userId),
        AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, session.$id)
      ]);

      this.setCachedUserId(session.userId);
      return session.userId;
    } catch (error) {
      this.clearCache();
      throw new Error(ERROR_MESSAGES.INVALID_SESSION);
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    if (this.isCacheValid()) {
      return this.cachedUserId;
    }

    try {
      const currentUser = await account.get();
      
      if (currentUser?.$id) {
        this.setCachedUserId(currentUser.$id);

        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, currentUser.$id).catch(() => {
        });

        return currentUser.$id;
      }
      
      this.clearCache();
      return null;
    } catch (error) {
      this.clearCache();
      return null;
    }
  }

  async getOrCreateUserId(): Promise<string> {
    try {
      if (this.isCacheValid()) {
        return this.cachedUserId!;
      }

      let userId = await this.getCurrentUserId();
      
      if (!userId) {
        userId = await this.createAnonymousSession();
      }
      
      if (!this.isCacheValid()) {
        const currentUser = await account.get();
        if (currentUser?.$id) {
          this.setCachedUserId(currentUser.$id);
          return currentUser.$id;
        }
      }
      
      return userId;
    } catch (error) {
      this.clearCache();
      throw new Error(ERROR_MESSAGES.INITIALIZATION_FAILED);
    }
  }

  async deleteCurrentSession(): Promise<void> {
    try {
      this.clearCache();
      
      await Promise.all([
        account.deleteSession('current'),
        this.clearStorageData()
      ]);
    } catch (error) {
      throw new Error(ERROR_MESSAGES.SESSION_DELETION_FAILED);
    }
  }

  private async clearStorageData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.SESSION_ID)
      ]);
    } catch (error) {
    }
  }

  async refreshCache(): Promise<void> {
    this.clearCache();
    await this.getCurrentUserId();
  }

  isUserCached(): boolean {
    return this.isCacheValid();
  }

  getCachedUserId(): string | null {
    return this.isCacheValid() ? this.cachedUserId : null;
  }
}

export const userService = new UserService();