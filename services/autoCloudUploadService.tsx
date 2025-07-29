import { userProfileService } from './userProfileService';
import { calendarService } from './calendarService';

class AutoCloudUploadService {
  private uploadEnabled = true; // Flag to disable uploads if they keep failing

  // Safely ensures user avatar is uploaded to cloud with comprehensive error handling
  async ensureAvatarInCloud(userId: string): Promise<string | null> {
    // Skip if uploads are disabled due to previous failures
    if (!this.uploadEnabled) {
      return null;
    }

    try {
      // Get user profile
      const userProfile = await userProfileService.getUserProfile();
      
      if (!userProfile?.avatarUri) {
        return null;
      }

      // If already a cloud URL, return it
      if (userProfile.avatarUri.startsWith('http')) {
        return userProfile.avatarUri;
      }

      // Try to upload local file to cloud with timeout
      try {
        // Import avatar upload service dynamically
        const { avatarUploadService } = await import('./avatarUploadService');
        
        // Test capability first
        const canUpload = await this.timeoutPromise(
          avatarUploadService.testUploadCapability(),
          5000, // 5 second timeout
          'Upload capability test timeout'
        );
        
        if (!canUpload) {
          return null;
        }
        
        // Attempt upload with timeout
        const cloudUrl = await this.timeoutPromise(
          avatarUploadService.uploadAvatar(userProfile.avatarUri, userId),
          30000, // 30 second timeout
          'Avatar upload timeout'
        );

        // Update user profile with cloud URL
        const updatedProfile = { ...userProfile, avatarUri: cloudUrl };
        await userProfileService.saveUserProfile(updatedProfile);

        return cloudUrl;
        
      } catch (uploadError: any) {
        // If we get repeated failures, disable uploads temporarily
        if (uploadError.message.includes('File not found') || 
            uploadError.message.includes('ArrayBuffer') ||
            uploadError.message.includes('timeout')) {
          this.uploadEnabled = false;
          
          // Re-enable after 5 minutes
          setTimeout(() => {
            this.uploadEnabled = true;
          }, 5 * 60 * 1000);
        }
        
        return null;
      }
      
    } catch (error: any) {
      return null; // Always return null, never throw
    }
  }

  /**
   * Safely sync avatar to all user's group memberships
   */
  async syncAvatarToAllGroups(userId: string, avatarUrl: string): Promise<void> {
    try {
      // Get all user's groups with timeout
      const { groupsService } = await import('./groupsService');
      const userGroups = await this.timeoutPromise(
        groupsService.getUserGroups(userId),
        10000,
        'Get user groups timeout'
      );
      
      // Update avatar in each group membership (with individual timeouts)
      const syncPromises = userGroups.map(async (group) => {
        try {
          await this.timeoutPromise(
            calendarService.updateUserAvatar(userId, group.id, avatarUrl),
            5000,
            `Sync to ${group.name} timeout`
          );
          
          return true;
        } catch (error: any) {
          return false;
        }
      });

      await Promise.allSettled(syncPromises);
      
    } catch (error: any) {
      // Don't throw - this is enhancement
    }
  }

  /**
   * Complete avatar cloud workflow with safe error handling
   */
  async processUserAvatar(userId: string): Promise<void> {
    try {
      // Step 1: Safely ensure avatar is in cloud
      const cloudUrl = await this.ensureAvatarInCloud(userId);
      
      if (!cloudUrl) {
        return;
      }
      
      // Step 2: Safely sync to all group memberships
      await this.syncAvatarToAllGroups(userId, cloudUrl);
      
    } catch (error: any) {
      // Never throw - this should not break core functionality
    }
  }

  /**
   * Process avatar when user joins a specific group (safe version)
   */
  async processAvatarForGroup(userId: string, groupId: string): Promise<void> {
    try {
      // Safely ensure avatar is in cloud
      const cloudUrl = await this.ensureAvatarInCloud(userId);
      
      if (!cloudUrl) {
        return;
      }
      
      // Update avatar for this specific group with timeout
      await this.timeoutPromise(
        calendarService.updateUserAvatar(userId, groupId, cloudUrl),
        5000,
        'Group avatar update timeout'
      );
      
    } catch (error: any) {
      // Don't throw - this should not break group joining
    }
  }

  /**
   * Utility function to add timeout to promises
   */
  private timeoutPromise<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Check if avatar uploads are currently enabled
   */
  isUploadEnabled(): boolean {
    return this.uploadEnabled;
  }

  /**
   * Manually re-enable avatar uploads
   */
  enableUploads(): void {
    this.uploadEnabled = true;
  }

  /**
   * Manually disable avatar uploads
   */
  disableUploads(): void {
    this.uploadEnabled = false;
  }
}

export const autoCloudUploadService = new AutoCloudUploadService();