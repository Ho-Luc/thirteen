// services/groupsService.ts
import { databases, appwriteConfig, generateId } from '../lib/appwrite';
import { userProfileService } from './userProfileService';
import { runDatabaseDiagnostics } from '../utils/databaseDebug';
import { runFieldSizeTests } from '../utils/databaseFieldTest';
import { 
  GroupRecord, 
  GroupMemberRecord, 
  CreateGroupPayload, 
  CreateGroupMemberPayload,
  Group 
} from '../utils/database';

/**
 * Service for managing groups and group memberships
 * Follows DRY principles and implements proper error handling
 */
class GroupsService {
  /**
   * Create a new group with automatic membership for creator
   */
  async createGroup(groupData: {
    name: string;
    shareKey: string;
    createdBy: string;
  }): Promise<Group> {
    try {
      console.log('🚀 Creating group with data:', groupData);
      
      // Create group document
      const groupPayload: CreateGroupPayload = {
        name: groupData.name,
        shareKey: groupData.shareKey,
        createdBy: groupData.createdBy,
      };

      const groupResponse = await databases.createDocument<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        generateId(),
        groupPayload
      );

      console.log('✅ Group created successfully:', groupResponse.$id);

      console.log('🔗 Creating membership for group creator...');
      
      // Run diagnostics if in development mode
      if (__DEV__) {
        console.log('🧪 Running database diagnostics...');
        await runDatabaseDiagnostics(groupData.createdBy, groupResponse.$id);
        
        console.log('🔬 Testing database field sizes...');
        await runFieldSizeTests();
      }
      
      await this.createMembership({
        userId: groupData.createdBy,
        groupId: groupResponse.$id,
      });

      console.log('✅ Group creation process completed');
      return this.transformGroupRecord(groupResponse);
    } catch (error) {
      console.error('❌ Error creating group:', error);
      throw new Error('Failed to create group. Please try again.');
    }
  }

  /**
   * Create group membership with user profile data
   */
  private async createMembership(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<void> {
    try {
      console.log('📝 Starting membership creation for:', membershipData);
      
      // Get user profile for name and avatar
      const userProfile = await userProfileService.getUserProfile();
      console.log('👤 User profile retrieved:', userProfile);
      
      const userName = userProfile?.name || 'Anonymous User';
      
      // Handle avatarUrl - upload to cloud storage if it's a local file
      let avatarUrl: string | undefined = undefined;
      
      if (userProfile?.avatarUri && userProfile.avatarUri.trim() !== '') {
        const originalUrl = userProfile.avatarUri;
        console.log('🖼️ Processing avatar URL:', originalUrl.substring(0, 50) + '...');
        
        try {
          if (originalUrl.startsWith('file://')) {
            console.log('☁️ Uploading local avatar to cloud storage...');
            
            // Import avatarUploadService dynamically to avoid circular imports
            const { avatarUploadService } = await import('./avatarUploadService');
            
            // Upload to Appwrite storage and get cloud URL
            avatarUrl = await avatarUploadService.uploadAvatar(originalUrl, membershipData.userId);
            console.log('✅ Avatar uploaded to cloud successfully');
            console.log(`🔗 Cloud URL length: ${avatarUrl?.length || 0} characters`);
            
          } else if (originalUrl.length <= 500) {
            // Use existing cloud URL if it's short enough
            avatarUrl = originalUrl;
            console.log('✅ Using existing cloud URL');
          } else {
            console.log(`⚠️ Avatar URL too long (${originalUrl.length} chars) - skipping`);
            avatarUrl = undefined;
          }
        } catch (uploadError) {
          console.error('❌ Avatar upload failed:', uploadError.message || uploadError);
          console.log('📝 Continuing membership creation without avatar...');
          // Set avatarUrl to undefined so it's not included in payload
          avatarUrl = undefined;
        }
      }

      // Build payload - start with required fields only
      const membershipPayload: any = {
        userId: membershipData.userId,
        groupId: membershipData.groupId,
        joinedAt: new Date().toISOString(),
        userName: userName,
      };

      // Only include avatarUrl if we have a valid, short value
      if (avatarUrl && avatarUrl.trim() !== '' && avatarUrl.length <= 100) {
        membershipPayload.avatarUrl = avatarUrl;
        console.log('✅ Including valid avatar URL in payload');
      } else {
        console.log('ℹ️ Skipping avatar URL - will create membership without avatar');
      }

      console.log('📤 Sending membership payload (avatar status: ' + (avatarUrl ? 'included' : 'skipped') + ')');
      console.log('🎯 Target collection:', appwriteConfig.groupMembersCollectionId);

      const membershipResponse = await databases.createDocument<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        membershipPayload
      );

      console.log('✅ Group membership created successfully:', {
        membershipId: membershipResponse.$id,
        userName: userName,
        hasAvatar: !!avatarUrl,
        avatarStatus: avatarUrl ? 'cloud URL included' : 'no avatar (upload failed or skipped)',
        groupId: membershipData.groupId
      });
      
    } catch (error) {
      console.error('❌ Error creating group membership - Full error details:', error);
      console.error('📋 Membership data that failed:', membershipData);
      console.error('🔧 Collection ID being used:', appwriteConfig.groupMembersCollectionId);
      console.error('🔧 Database ID being used:', appwriteConfig.databaseId);
      
      // If this is still an avatarUrl error, try once more without avatar
      if (error.message?.includes('avatarUrl')) {
        console.log('🔄 Retrying membership creation without avatar...');
        
        try {
          const fallbackPayload = {
            userId: membershipData.userId,
            groupId: membershipData.groupId,
            joinedAt: new Date().toISOString(),
            userName: userProfile?.name || 'Anonymous User',
          };
          
          const retryResponse = await databases.createDocument<GroupMemberRecord>(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            generateId(),
            fallbackPayload
          );
          
          console.log('✅ Group membership created successfully on retry (without avatar):', {
            membershipId: retryResponse.$id,
            userName: userProfile?.name || 'Anonymous User',
            groupId: membershipData.groupId
          });
          
          return; // Success on retry
          
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          throw new Error(`Failed to create group membership even without avatar: ${retryError.message || retryError}`);
        }
      }
      
      // Re-throw with more context for other errors
      throw new Error(`Failed to create group membership: ${error.message || error}`);
    }
  }

  /**
   * Get all groups for a user (created + joined)
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      const [allGroups, userMemberships] = await Promise.all([
        this.getAllGroups(),
        this.getUserMemberships(userId)
      ]);

      // Get created groups
      const createdGroups = allGroups.filter(group => group.createdBy === userId);

      // Get joined groups from memberships
      const membershipGroupIds = userMemberships.map(m => m.groupId);
      const joinedGroups = allGroups.filter(group => 
        membershipGroupIds.includes(group.$id)
      );

      // Combine and deduplicate
      const allUserGroups = [...createdGroups, ...joinedGroups];
      const uniqueGroups = this.deduplicateGroups(allUserGroups);

      return uniqueGroups.map(this.transformGroupRecord);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw new Error('Failed to fetch groups. Please try again.');
    }
  }

  /**
   * Join a group by share key
   */
  async joinGroup(shareKey: string, userId: string): Promise<Group> {
    try {
      const group = await this.findGroupByShareKey(shareKey);
      if (!group) {
        throw new Error('Group not found');
      }

      const isAlreadyMember = await this.checkMembership(userId, group.$id);
      if (isAlreadyMember) {
        throw new Error('Already a member');
      }

      await this.createMembership({
        userId: userId,
        groupId: group.$id,
      });

      return this.transformGroupRecord(group);
    } catch (error) {
      console.error('Error joining group:', error);
      throw error; // Re-throw to preserve specific error messages
    }
  }

  /**
   * Delete a group and all associated data
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      // Delete group memberships first
      await this.deleteGroupMemberships(groupId);
      
      // Delete the group
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );
    } catch (error) {
      console.error('Error deleting group:', error);
      throw new Error('Failed to delete group. Please try again.');
    }
  }

  /**
   * Get single group by ID
   */
  async getGroup(groupId: string): Promise<Group> {
    try {
      const response = await databases.getDocument<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      return this.transformGroupRecord(response);
    } catch (error) {
      console.error('Error fetching group:', error);
      throw new Error('Failed to fetch group. Please try again.');
    }
  }

  /**
   * Sync user profile to all group memberships
   */
  async syncUserProfileToAllGroups(userId: string): Promise<void> {
    try {
      const userProfile = await userProfileService.getUserProfile();
      if (!userProfile) {
        console.warn('No user profile found for sync');
        return;
      }

      const memberships = await this.getUserMemberships(userId);
      console.log(`🔄 Syncing profile for ${memberships.length} group memberships`);

      // Process avatar URL - upload if it's a local file
      let avatarUrl: string | null = null;
      if (userProfile.avatarUri && userProfile.avatarUri.trim() !== '') {
        const originalUrl = userProfile.avatarUri;
        console.log('🖼️ Processing avatar for sync:', originalUrl.substring(0, 50) + '...');
        
        try {
          if (originalUrl.startsWith('file://')) {
            console.log('☁️ Uploading local avatar to cloud storage during sync...');
            
            // Import and use avatar upload service
            const { avatarUploadService } = await import('./avatarUploadService');
            avatarUrl = await avatarUploadService.uploadAvatar(originalUrl, userId);
            
            console.log('✅ Avatar uploaded during sync successfully');
            console.log(`🔗 Cloud URL length: ${avatarUrl.length} characters`);
            
          } else if (originalUrl.length <= 500) {
            // Use existing cloud URL if it's short enough
            avatarUrl = originalUrl;
            console.log('✅ Using existing cloud URL for sync');
          } else {
            console.warn(`Avatar URL too long (${originalUrl.length} chars) - skipping in sync`);
            avatarUrl = null;
          }
        } catch (uploadError) {
          console.error('❌ Avatar upload failed during sync:', uploadError);
          console.log('📝 Continuing sync without avatar...');
          avatarUrl = null; // Continue without avatar
        }
      }

      // Update all memberships
      const updatePromises = memberships.map(async (membership) => {
        try {
          const updatePayload: any = {
            userName: userProfile.name,
          };

          // Only include avatarUrl if we have a valid value
          if (avatarUrl) {
            updatePayload.avatarUrl = avatarUrl;
          }

          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            membership.$id,
            updatePayload
          );

          console.log(`✅ Updated membership ${membership.$id} with ${avatarUrl ? 'avatar' : 'name only'}`);
          return true;
        } catch (error) {
          console.error(`❌ Failed to update membership ${membership.$id}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      
      console.log(`📊 Sync completed: ${successCount}/${memberships.length} memberships updated`);
      console.log(`🖼️ Avatar status: ${avatarUrl ? 'uploaded and synced' : 'not available'}`);
      
    } catch (error) {
      console.error('❌ Error syncing user profile to groups:', error);
    }
  }

  // ============== PRIVATE HELPER METHODS ==============

  private async getAllGroups(): Promise<GroupRecord[]> {
    const response = await databases.listDocuments<GroupRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId
    );
    return response.documents;
  }

  private async getUserMemberships(userId: string): Promise<GroupMemberRecord[]> {
    const response = await databases.listDocuments<GroupMemberRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId
    );
    return response.documents.filter(doc => doc.userId === userId);
  }

  private async findGroupByShareKey(shareKey: string): Promise<GroupRecord | null> {
    const allGroups = await this.getAllGroups();
    return allGroups.find(group => group.shareKey === shareKey) || null;
  }

  private async checkMembership(userId: string, groupId: string): Promise<boolean> {
    try {
      const memberships = await this.getUserMemberships(userId);
      return memberships.some(membership => membership.groupId === groupId);
    } catch (error) {
      return false;
    }
  }

  private async deleteGroupMemberships(groupId: string): Promise<void> {
    const response = await databases.listDocuments<GroupMemberRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId
    );

    const groupMemberships = response.documents.filter(doc => doc.groupId === groupId);
    
    const deletePromises = groupMemberships.map(membership =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membership.$id
      )
    );

    await Promise.allSettled(deletePromises);
  }

  private deduplicateGroups(groups: GroupRecord[]): GroupRecord[] {
    const seen = new Set<string>();
    return groups.filter(group => {
      if (seen.has(group.$id)) {
        return false;
      }
      seen.add(group.$id);
      return true;
    });
  }

  private transformGroupRecord(record: GroupRecord): Group {
    return {
      id: record.$id,
      name: record.name,
      shareKey: record.shareKey,
      createdAt: new Date(record.$createdAt),
    };
  }
}

export const groupsService = new GroupsService();