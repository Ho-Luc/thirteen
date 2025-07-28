// services/groupsService.tsx - Complete file with fixed imports and error handling
import { databases, appwriteConfig, generateId } from '../lib/appwrite';
import { userProfileService } from './userProfileService';
import { avatarUploadService } from './avatarUploadService'; // Fixed import
import { 
  GroupRecord, 
  GroupMemberRecord, 
  CreateGroupPayload, 
  Group 
} from '../utils/database';

/**
 * Service for managing groups and group memberships
 * Enhanced with comprehensive error handling and non-blocking avatar uploads
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
      console.log('\n🚀 CREATING GROUP...');
      console.log('📋 Group Data:', groupData);
      
      // Create group document
      const groupPayload: CreateGroupPayload = {
        name: groupData.name,
        shareKey: groupData.shareKey,
        createdBy: groupData.createdBy,
      };

      console.log('📤 Creating group document...');
      const groupResponse = await databases.createDocument<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        generateId(),
        groupPayload
      );

      console.log('✅ Group created successfully:', groupResponse.$id);

      console.log('🔗 Creating membership for group creator...');
      await this.createMembership({
        userId: groupData.createdBy,
        groupId: groupResponse.$id,
      });

      console.log('✅ Group creation process completed');
      return this.transformGroupRecord(groupResponse);
    } catch (error) {
      console.error('❌ Group creation failed:', error);
      throw new Error('Failed to create group. Please try again.');
    }
  }

  /**
   * Create group membership with non-blocking avatar handling
   */
  private async createMembership(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<void> {
    try {
      console.log('\n📝 CREATING MEMBERSHIP...');
      console.log('👤 User ID:', membershipData.userId);
      console.log('🏷️ Group ID:', membershipData.groupId);
      
      // Get user profile for name and avatar
      const userProfile = await userProfileService.getUserProfile();
      console.log('👤 User profile:', {
        name: userProfile?.name || 'NOT SET',
        hasAvatar: !!userProfile?.avatarUri,
        avatarUriLength: userProfile?.avatarUri?.length || 0
      });
      
      const userName = userProfile?.name || 'Anonymous User';
      
      // Try to process avatar, but don't fail if it doesn't work
      let avatarUrl: string | undefined = undefined;
      
      if (userProfile?.avatarUri && userProfile.avatarUri.trim() !== '') {
        const originalUrl = userProfile.avatarUri;
        console.log('🖼️ Processing avatar...');
        
        try {
          if (originalUrl.startsWith('file://')) {
            console.log('☁️ Uploading local file to cloud...');
            
            // Check if service is available
            if (typeof avatarUploadService !== 'undefined' && 
                typeof avatarUploadService.uploadAvatar === 'function') {
              
              avatarUrl = await avatarUploadService.uploadAvatar(originalUrl, membershipData.userId);
              console.log('✅ Avatar uploaded successfully');
              
            } else {
              console.log('⚠️ Avatar upload service not available - skipping');
            }
          } else if (originalUrl.length <= 500) {
            avatarUrl = originalUrl;
            console.log('✅ Using existing cloud URL');
          } else {
            console.log('⚠️ URL too long - skipping');
          }
        } catch (uploadError) {
          console.error('❌ Avatar upload failed:', uploadError.message);
          console.log('📝 Continuing without avatar...');
          avatarUrl = undefined;
        }
      }

      // Build membership payload
      const membershipPayload: any = {
        userId: membershipData.userId,
        groupId: membershipData.groupId,
        joinedAt: new Date().toISOString(),
        userName: userName,
      };

      // Only include avatar if we have one
      if (avatarUrl) {
        membershipPayload.avatarUrl = avatarUrl;
        console.log('✅ Including avatar in membership');
      } else {
        console.log('ℹ️ Creating membership without avatar');
      }

      // Create membership document
      const membershipResponse = await databases.createDocument<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        membershipPayload
      );

      console.log('✅ Membership created successfully:', membershipResponse.$id);
      console.log(`🖼️ Avatar included: ${!!membershipResponse.avatarUrl}`);
      
    } catch (error) {
      console.error('❌ Membership creation failed:', error);
      
      // Try fallback without avatar
      if (error.message?.includes('avatarUrl')) {
        console.log('🔄 Retrying without avatar...');
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
          
          console.log('✅ Fallback membership created:', retryResponse.$id);
          return;
          
        } catch (retryError) {
          console.error('❌ Fallback also failed:', retryError);
        }
      }
      
      throw new Error(`Failed to create group membership: ${error.message || error}`);
    }
  }

  /**
   * Get all groups for a user (created + joined)
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      console.log(`\n📋 FETCHING USER GROUPS: ${userId}`);
      
      const [allGroups, userMemberships] = await Promise.all([
        this.getAllGroups(),
        this.getUserMemberships(userId)
      ]);

      console.log(`📊 Found ${allGroups.length} total groups, ${userMemberships.length} memberships`);

      // Get created groups
      const createdGroups = allGroups.filter(group => group.createdBy === userId);
      console.log(`📊 User created ${createdGroups.length} groups`);

      // Get joined groups from memberships
      const membershipGroupIds = userMemberships.map(m => m.groupId);
      const joinedGroups = allGroups.filter(group => 
        membershipGroupIds.includes(group.$id)
      );
      console.log(`📊 User joined ${joinedGroups.length} groups`);

      // Combine and deduplicate
      const allUserGroups = [...createdGroups, ...joinedGroups];
      const uniqueGroups = this.deduplicateGroups(allUserGroups);
      console.log(`📊 Total unique groups: ${uniqueGroups.length}`);

      return uniqueGroups.map(this.transformGroupRecord);
    } catch (error) {
      console.error('❌ Error fetching user groups:', error);
      throw new Error('Failed to fetch groups. Please try again.');
    }
  }

  /**
   * Join a group by share key
   */
  async joinGroup(shareKey: string, userId: string): Promise<Group> {
    try {
      console.log(`\n🚪 JOINING GROUP: ${shareKey}`);
      
      const group = await this.findGroupByShareKey(shareKey);
      if (!group) {
        console.log('❌ Group not found');
        throw new Error('Group not found');
      }

      console.log('✅ Group found:', group.name);

      const isAlreadyMember = await this.checkMembership(userId, group.$id);
      if (isAlreadyMember) {
        console.log('❌ Already a member');
        throw new Error('Already a member');
      }

      console.log('✅ Creating membership...');
      await this.createMembership({
        userId: userId,
        groupId: group.$id,
      });

      console.log('✅ Successfully joined group');
      return this.transformGroupRecord(group);
    } catch (error) {
      console.error('❌ Error joining group:', error);
      throw error;
    }
  }

  /**
   * Delete a group and all associated data
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      console.log(`\n🗑️ DELETING GROUP: ${groupId}`);
      
      // Delete group memberships first
      await this.deleteGroupMemberships(groupId);
      
      // Delete the group
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      console.log('✅ Group deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting group:', error);
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
      console.error('❌ Error fetching group:', error);
      throw new Error('Failed to fetch group. Please try again.');
    }
  }

  /**
   * Sync user profile to all group memberships - NON-BLOCKING VERSION
   */
  async syncUserProfileToAllGroups(userId: string): Promise<void> {
    try {
      console.log(`\n🔄 SYNCING USER PROFILE TO ALL GROUPS: ${userId}`);
      
      const userProfile = await userProfileService.getUserProfile();
      if (!userProfile) {
        console.warn('⚠️ No user profile found for sync');
        return;
      }

      console.log('👤 Profile to sync:', {
        name: userProfile.name,
        hasAvatar: !!userProfile.avatarUri,
        avatarLength: userProfile.avatarUri?.length || 0
      });

      const memberships = await this.getUserMemberships(userId);
      console.log(`🔄 Syncing profile for ${memberships.length} group memberships`);

      // Try to process avatar, but don't fail the entire sync if it doesn't work
      let avatarUrl: string | null = null;
      
      if (userProfile.avatarUri && userProfile.avatarUri.trim() !== '') {
        const originalUrl = userProfile.avatarUri;
        console.log(`🖼️ Processing avatar for sync...`);
        
        try {
          if (originalUrl.startsWith('file://')) {
            console.log('☁️ Attempting avatar upload (non-blocking)...');
            
            // Check if service is available before using it
            if (typeof avatarUploadService !== 'undefined' && 
                typeof avatarUploadService.uploadAvatar === 'function') {
              
              // Set timeout to prevent hanging
              const uploadPromise = avatarUploadService.uploadAvatar(originalUrl, userId);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Upload timeout')), 15000)
              );
              
              avatarUrl = await Promise.race([uploadPromise, timeoutPromise]);
              console.log('✅ Avatar uploaded during sync');
              
            } else {
              console.log('⚠️ Avatar upload service not available during sync');
              throw new Error('avatarUploadService is not available');
            }
            
          } else if (originalUrl.length <= 500) {
            avatarUrl = originalUrl;
            console.log('✅ Using existing cloud URL for sync');
          } else {
            console.warn('⚠️ Avatar URL too long - skipping in sync');
            avatarUrl = null;
          }
        } catch (uploadError) {
          console.error('❌ Avatar upload failed during sync:', uploadError.message);
          console.log('📝 Continuing sync without avatar - user can upload later');
          avatarUrl = null;
        }
      }

      // Update all memberships (proceed regardless of avatar result)
      const updatePromises = memberships.map(async (membership) => {
        try {
          const updatePayload: any = {
            userName: userProfile.name,
          };

          // Only include avatar if upload was successful
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
      console.log('⚠️ Continuing with app functionality despite sync error');
      // Don't throw - let the user proceed even if sync fails
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