import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../components/user/userProfileCreator';

const USER_PROFILE_KEY = 'userProfile';

class UserProfileService {
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const storedUserData = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (storedUserData) {
        return JSON.parse(storedUserData) as UserProfile;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  /**
   * Save user profile to AsyncStorage
   */
  async saveUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update existing user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const currentProfile = await this.getUserProfile();
      if (!currentProfile) {
        throw new Error('No existing profile found');
      }

      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates,
      };

      const success = await this.saveUserProfile(updatedProfile);
      return success ? updatedProfile : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete user profile from AsyncStorage
   */
  async deleteUserProfile(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user profile exists
   */
  async hasUserProfile(): Promise<boolean> {
    const profile = await this.getUserProfile();
    return profile !== null;
  }

  /**
   * Get user's display name
   */
  async getUserDisplayName(): Promise<string> {
    const profile = await this.getUserProfile();
    return profile?.name || 'Anonymous User';
  }

  /**
   * Get user's avatar URI
   */
  async getUserAvatarUri(): Promise<string | undefined> {
    const profile = await this.getUserProfile();
    return profile?.avatarUri;
  }

  /**
   * Generate a unique user ID (for use with Appwrite)
   * This combines the user's name with a timestamp for uniqueness
   */
  async generateUserId(): Promise<string> {
    const profile = await this.getUserProfile();
    const baseName = profile?.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const timestamp = Date.now();
    return `${baseName}_${timestamp}`;
  }

  /**
   * Validate user profile data
   */
  validateProfile(profile: UserProfile): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check name
    if (!profile.name || profile.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (profile.name.trim().length > 30) {
      errors.push('Name must be 30 characters or less');
    }

    // Check avatar URI format if provided
    if (profile.avatarUri && !profile.avatarUri.startsWith('file://') && !profile.avatarUri.startsWith('http')) {
      errors.push('Invalid avatar URI format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a user profile for group membership
   * This formats the profile data for Appwrite database storage
   */
  async createGroupMembershipData(groupId: string): Promise<{
    userId: string;
    groupId: string;
    userName: string;
    avatarUrl?: string;
  } | null> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        return null;
      }

      const userId = await this.generateUserId();

      return {
        userId,
        groupId,
        userName: profile.name,
        avatarUrl: profile.avatarUri,
      };
    } catch (error) {
      return null;
    }
  }
}

export const userProfileService = new UserProfileService();