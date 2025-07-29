// services/autoCloudUploadService.tsx - Safe version with fallbacks
import { userProfileService } from './userProfileService';
import { calendarService } from './calendarService';

class AutoCloudUploadService {
  private uploadEnabled = true; // Flag to disable uploads if they keep failing
  
  /**
   * Safely ensures user avatar is uploaded to cloud with comprehensive error handling
   */
  async ensureAvatarInCloud(userId: string): Promise<string | null> {
    // Skip if uploads are disabled due to previous failures
    if (!this.uploadEnabled) {
      console.log('⚠️ Avatar uploads disabled due to previous failures');
      return null;
    }

    try {
      console.log('\n☁️ SAFELY ENSURING AVATAR IS IN CLOUD...');
      console.log(`👤 User ID: ${userId}`);
      
      // Get user profile
      const userProfile = await userProfileService.getUserProfile();
      
      if (!userProfile?.avatarUri) {
        console.log('ℹ️ No avatar to upload');
        return null;
      }

      console.log('🖼️ Found avatar:', {
        length: userProfile.avatarUri.length,
        isLocal: userProfile.avatarUri.startsWith('file://'),
        preview: userProfile.avatarUri.substring(0, 50) + '...'
      });

      // If already a cloud URL, return it
      if (userProfile.avatarUri.startsWith('http')) {
        console.log('✅ Avatar already in cloud');
        return userProfile.avatarUri;
      }

      // Try to upload local file to cloud with timeout
      console.log('☁️ Attempting safe upload to cloud...');
      
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
          console.log('❌ Upload capability test failed');
          return null;
        }
        
        // Attempt upload with timeout
        const cloudUrl = await this.timeoutPromise(
          avatarUploadService.uploadAvatar(userProfile.avatarUri, userId),
          30000, // 30 second timeout
          'Avatar upload timeout'
        );
        
        console.log('✅ Upload successful:', cloudUrl.substring(0, 80) + '...');

        // Update user profile with cloud URL
        const updatedProfile = { ...userProfile, avatarUri: cloudUrl };
        await userProfileService.saveUserProfile(updatedProfile);
        console.log('✅ User profile updated with cloud URL');

        return cloudUrl;
        
      } catch (uploadError: any) {
        console.error('❌ Avatar upload failed:', uploadError.message);
        
        // If we get repeated failures, disable uploads temporarily
        if (uploadError.message.includes('File not found') || 
            uploadError.message.includes('ArrayBuffer') ||
            uploadError.message.includes('timeout')) {
          console.warn('⚠️ Disabling avatar uploads due to repeated failures');
          this.uploadEnabled = false;
          
          // Re-enable after 5 minutes
          setTimeout(() => {
            console.log('🔄 Re-enabling avatar uploads');
            this.uploadEnabled = true;
          }, 5 * 60 * 1000);
        }
        
        return null;
      }
      
    } catch (error: any) {
      console.error('❌ Failed to ensure avatar in cloud:', error.message);
      return null; // Always return null, never throw
    }
  }

  /**
   * Safely sync avatar to all user's group memberships
   */
  async syncAvatarToAllGroups(userId: string, avatarUrl: string): Promise<void> {
    try {
      console.log('\n🔄 SAFELY SYNCING AVATAR TO ALL GROUPS...');
      console.log(`👤 User ID: ${userId}`);
      console.log(`🔗 Avatar URL: ${avatarUrl.substring(0, 80)}...`);
      
      // Get all user's groups with timeout
      const { groupsService } = await import('./groupsService');
      const userGroups = await this.timeoutPromise(
        groupsService.getUserGroups(userId),
        10000,
        'Get user groups timeout'
      );
      
      console.log(`📊 Found ${userGroups.length} groups to sync`);
      
      // Update avatar in each group membership (with individual timeouts)
      const syncPromises = userGroups.map(async (group) => {
        try {
          console.log(`🔄 Syncing to group: ${group.name}`);
          
          await this.timeoutPromise(
            calendarService.updateUserAvatar(userId, group.id, avatarUrl),
            5000,
            `Sync to ${group.name} timeout`
          );
          
          console.log(`✅ Synced to ${group.name}`);
          return true;
        } catch (error: any) {
          console.error(`❌ Failed to sync to ${group.name}:`, error.message);
          return false;
        }
      });

      const results = await Promise.allSettled(syncPromises);
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
      
      console.log(`📊 Avatar sync completed: ${successCount}/${userGroups.length} groups updated`);
      
    } catch (error: any) {
      console.error('❌ Failed to sync avatar to all groups:', error.message);
      // Don't throw - this is enhancement
    }
  }

  /**
   * Complete avatar cloud workflow with safe error handling
   */
  async processUserAvatar(userId: string): Promise<void> {
    try {
      console.log('\n🚀 STARTING SAFE AVATAR CLOUD WORKFLOW...');
      
      // Step 1: Safely ensure avatar is in cloud
      const cloudUrl = await this.ensureAvatarInCloud(userId);
      
      if (!cloudUrl) {
        console.log('ℹ️ No avatar to process or upload failed safely');
        return;
      }
      
      // Step 2: Safely sync to all group memberships
      await this.syncAvatarToAllGroups(userId, cloudUrl);
      
      console.log('✅ Safe avatar workflow finished');
      
    } catch (error: any) {
      console.error('❌ Avatar workflow failed:', error.message);
      // Never throw - this should not break core functionality
    }
  }

  /**
   * Process avatar when user joins a specific group (safe version)
   */
  async processAvatarForGroup(userId: string, groupId: string): Promise<void> {
    try {
      console.log('\n🏷️ SAFELY PROCESSING AVATAR FOR SPECIFIC GROUP...');
      console.log(`👤 User ID: ${userId}`);
      console.log(`🏷️ Group ID: ${groupId}`);
      
      // Safely ensure avatar is in cloud
      const cloudUrl = await this.ensureAvatarInCloud(userId);
      
      if (!cloudUrl) {
        console.log('ℹ️ No avatar to process for group or upload failed safely');
        return;
      }
      
      // Update avatar for this specific group with timeout
      await this.timeoutPromise(
        calendarService.updateUserAvatar(userId, groupId, cloudUrl),
        5000,
        'Group avatar update timeout'
      );
      
      console.log('✅ Avatar safely processed for group');
      
    } catch (error: any) {
      console.error('❌ Failed to process avatar for group:', error.message);
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
    console.log('🔄 Manually re-enabling avatar uploads');
    this.uploadEnabled = true;
  }

  /**
   * Manually disable avatar uploads
   */
  disableUploads(): void {
    console.log('⛔ Manually disabling avatar uploads');
    this.uploadEnabled = false;
  }
}

export const autoCloudUploadService = new AutoCloudUploadService();