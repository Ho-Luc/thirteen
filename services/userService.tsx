import { account } from '../lib/appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

class UserService {
  async createAnonymousSession(): Promise<string> {
    try {
      const session = await account.createAnonymousSession();
      await AsyncStorage.setItem('userId', session.userId);
      await AsyncStorage.setItem('sessionId', session.$id);

      return session.userId;
    } catch (error) {
      throw new Error('Failed to create user session');
    }
  }

  async getCurrentUserId(): Promise<string | null> {
    try {
      const currentUser = await account.get();
      if (currentUser) {
        await AsyncStorage.setItem('userId', currentUser.$id);
        return currentUser.$id;
      }
      
      return null;
    } catch (error) {
        return null;
    }
  }

  async getOrCreateUserId(): Promise<string> {
    try {
      let userId = await this.getCurrentUserId();
      
      if (!userId) {
        userId = await this.createAnonymousSession();
      }
      const currentUser = await account.get();
      
      return userId;
    } catch (error) {
      throw new Error('Failed to initialize user session');
    }
  }

  // Delete current session
  async deleteCurrentSession(): Promise<void> {
    try {
      await account.deleteSession('current');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('sessionId');
    } catch (error) {
        throw new Error('Failed to delete session');
    }
  }
}

export const userService = new UserService();