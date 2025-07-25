import { expect, describe, beforeEach, jest, it } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../lib/appwrite', () => ({
  account: {
    createAnonymousSession: jest.fn(),
    get: jest.fn(),
    deleteSession: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { account } from '../../lib/appwrite';
import { userService } from '../../services/userService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAccount = account as jest.Mocked<typeof account>;

describe('UserService', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';
  
  const mockSession = {
    userId: mockUserId,
    $id: mockSessionId,
    $createdAt: '2025-01-15T10:00:00.000Z',
  };

  const mockUser = {
    $id: mockUserId,
    $createdAt: '2025-01-15T10:00:00.000Z',
    name: 'Anonymous User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAnonymousSession', () => {
    it('successfully creates anonymous session and stores data', async () => {
      mockAccount.createAnonymousSession.mockResolvedValue(mockSession);
      mockAsyncStorage.setItem.mockResolvedValue();
      const result = await userService.createAnonymousSession();

      expect(mockAccount.createAnonymousSession).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('userId', mockUserId);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('sessionId', mockSessionId);
      expect(result).toBe(mockUserId);
    });

    it('throws error when session creation fails', async () => {
      mockAccount.createAnonymousSession.mockRejectedValue(new Error('Network error'));

      await expect(userService.createAnonymousSession()).rejects.toThrow(
        'Failed to create user session'
      );

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('throws error when AsyncStorage setItem fails', async () => {
      mockAccount.createAnonymousSession.mockResolvedValue(mockSession);
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(userService.createAnonymousSession()).rejects.toThrow(
        'Failed to create user session'
      );
    });
  });

  describe('getCurrentUserId', () => {
    it('returns user ID when user exists', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await userService.getCurrentUserId();

      expect(mockAccount.get).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('userId', mockUserId);
      expect(result).toBe(mockUserId);
    });

    it('returns null when no current user', async () => {
      mockAccount.get.mockResolvedValue(null);

      const result = await userService.getCurrentUserId();

      expect(mockAccount.get).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns null when user fetch fails', async () => {
      mockAccount.get.mockRejectedValue(new Error('No session'));

      const result = await userService.getCurrentUserId();

      expect(result).toBeNull();
    });

    it('handles AsyncStorage failure gracefully', async () => {
      mockAccount.get.mockResolvedValue(mockUser);
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      const result = await userService.getCurrentUserId();

      expect(result).toBe(mockUserId);
      expect(mockAccount.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrCreateUserId', () => {
    it('returns existing user ID when user exists', async () => {
      mockAccount.get
        .mockResolvedValueOnce(mockUser) 
        .mockResolvedValueOnce(mockUser); 
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await userService.getOrCreateUserId();

      expect(mockAccount.get).toHaveBeenCalledTimes(2);
      expect(mockAccount.createAnonymousSession).not.toHaveBeenCalled();
      expect(result).toBe(mockUserId);
    });

    it('creates new session when no current user', async () => {
      mockAccount.get
        .mockRejectedValueOnce(new Error('No session'))
        .mockResolvedValueOnce(mockUser); 

      mockAccount.createAnonymousSession.mockResolvedValue(mockSession);
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await userService.getOrCreateUserId();

      expect(mockAccount.createAnonymousSession).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUserId);
    });

    it('throws error when both getting and creating user fails', async () => {
      mockAccount.get.mockRejectedValue(new Error('No session'));
      mockAccount.createAnonymousSession.mockRejectedValue(new Error('Creation failed'));

      await expect(userService.getOrCreateUserId()).rejects.toThrow(
        'Failed to initialize user session'
      );
    });
  });

  describe('deleteCurrentSession', () => {
    it('successfully deletes session and clears storage', async () => {
      mockAccount.deleteSession.mockResolvedValue(undefined);
      mockAsyncStorage.removeItem.mockResolvedValue();

      await userService.deleteCurrentSession();

      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('userId');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('sessionId');
    });

    it('throws error when session deletion fails', async () => {
      mockAccount.deleteSession.mockRejectedValue(new Error('Deletion failed'));

      await expect(userService.deleteCurrentSession()).rejects.toThrow(
        'Failed to delete session'
      );

      expect(mockAsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('throws error when storage cleanup fails', async () => {
      mockAccount.deleteSession.mockResolvedValue(undefined);
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(userService.deleteCurrentSession()).rejects.toThrow(
        'Failed to delete session'
      );

      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
    });
  });

  describe('Edge Cases', () => {
    it('handles session with missing userId', async () => {
      const incompleteSession = {
        $id: mockSessionId,
      };

      mockAccount.createAnonymousSession.mockResolvedValue(incompleteSession);

      await expect(userService.createAnonymousSession()).rejects.toThrow(
        'Failed to create user session'
      );
    });

    it('handles user with missing $id', async () => {
      const incompleteUser = {
        name: 'Test User',
      };

      mockAccount.get.mockResolvedValue(incompleteUser);

      const result = await userService.getCurrentUserId();

      expect(result).toBeNull();
    });

    it('handles null session response', async () => {
      mockAccount.createAnonymousSession.mockResolvedValue(null);

      await expect(userService.createAnonymousSession()).rejects.toThrow(
        'Failed to create user session'
      );
    });

    it('handles undefined user response', async () => {
      mockAccount.get.mockResolvedValue(undefined);

      const result = await userService.getCurrentUserId();

      expect(result).toBeNull();
    });
  });
});