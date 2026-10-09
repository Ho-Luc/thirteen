import { account } from '../lib/appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_ID: 'userId',
  SESSION_ID: 'sessionId',
  PREVIOUS_USER_IDS: 'previousUserIds'
} as const;

const ERROR_MESSAGES = {
  INVALID_SESSION: 'Failed to create user session',
  INITIALIZATION_FAILED: 'Failed to initialize user session',
  SESSION_UNAVAILABLE: 'Could not reach the server to verify your session',
  SESSION_DELETION_FAILED: 'Failed to delete session'
} as const;

// Appwrite returns 401 from account.get() when the device has no valid session.
// That is the ONLY case where a new anonymous user should be created.
const NO_SESSION_STATUS = 401;

/**
 * Thrown when the session could not be verified for a reason other than
 * "there is no session" (offline, timeout, 5xx). Callers should show a retry
 * instead of creating a new user, which would orphan the user's groups.
 */
export class SessionUnavailableError extends Error {
  constructor(public readonly cause?: unknown) {
    super(ERROR_MESSAGES.SESSION_UNAVAILABLE);
    this.name = 'SessionUnavailableError';
  }
}

const isNoSessionError = (error: unknown): boolean =>
  (error as { code?: number })?.code === NO_SESSION_STATUS;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class UserService {
  private cachedUserId: string | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  // Backoff between account.get() attempts on transient failures. Overridable in tests.
  retryDelaysMs: number[] = [500, 1500];

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

  /**
   * Returns the signed-in user's id, or null when the device has no session (401).
   * Retries transient failures, then throws SessionUnavailableError rather than
   * returning null — null means "safe to create a new user", and a network blip
   * must never be interpreted that way.
   */
  async getCurrentUserId(): Promise<string | null> {
    if (this.isCacheValid()) {
      return this.cachedUserId;
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt++) {
      try {
        const currentUser = await account.get();

        if (currentUser?.$id) {
          this.setCachedUserId(currentUser.$id);
          AsyncStorage.setItem(STORAGE_KEYS.USER_ID, currentUser.$id).catch(() => {});
          return currentUser.$id;
        }

        this.clearCache();
        return null;
      } catch (error) {
        if (isNoSessionError(error)) {
          this.clearCache();
          return null;
        }

        lastError = error;
        if (attempt < this.retryDelaysMs.length) {
          await sleep(this.retryDelaysMs[attempt]);
        }
      }
    }

    this.clearCache();
    throw new SessionUnavailableError(lastError);
  }

  async getOrCreateUserId(): Promise<string> {
    if (this.isCacheValid()) {
      return this.cachedUserId!;
    }

    // Throws SessionUnavailableError when the server can't be reached; that propagates
    // to the screen so it can offer a retry instead of creating a new user.
    const userId = await this.getCurrentUserId();

    if (userId) {
      return userId;
    }

    const previousUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID).catch(() => null);

    try {
      const newUserId = await this.createAnonymousSession();

      if (previousUserId && previousUserId !== newUserId) {
        await this.recordLostSession(previousUserId, newUserId);
      }

      return newUserId;
    } catch (error) {
      this.clearCache();
      throw new Error(ERROR_MESSAGES.INITIALIZATION_FAILED);
    }
  }

  /**
   * The device used to belong to a different anonymous user whose session expired
   * or was revoked. Record the old id so the groups can be recovered with
   * scripts/merge-user.mjs. Stored in account prefs (visible in the Appwrite Console
   * and to scripts/diagnose-groups.mjs) and locally. Best-effort: never blocks startup.
   */
  private async recordLostSession(previousUserId: string, newUserId: string): Promise<void> {
    console.warn(`[userService] Session lost: previous user ${previousUserId} replaced by ${newUserId}`);

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREVIOUS_USER_IDS);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      if (!ids.includes(previousUserId)) ids.push(previousUserId);
      await AsyncStorage.setItem(STORAGE_KEYS.PREVIOUS_USER_IDS, JSON.stringify(ids));

      await account.updatePrefs({ previousUserIds: ids });
    } catch {
      // Diagnostics only
    }
  }

  async getPreviousUserIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREVIOUS_USER_IDS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async deleteCurrentSession(): Promise<void> {
    try {
      this.clearCache();

      // Server first: if it fails, keep the local id so it isn't lost.
      await account.deleteSession('current');
      await this.clearStorageData();
    } catch (error) {
      throw new Error(ERROR_MESSAGES.SESSION_DELETION_FAILED);
    }
  }

  // Removing USER_ID on explicit sign-out means the next launch is not reported
  // as a lost session.
  private async clearStorageData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.SESSION_ID)
    ]);
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
