// services/groupsService.tsx - Enhanced with leave/delete logic for TODO #2
import { databases, appwriteConfig, generateId } from '../lib/appwrite';
import { userProfileService } from './userProfileService';
import { autoCloudUploadService } from './autoCloudUploadService';
import { 
  GroupRecord, 
  GroupMemberRecord, 
  CreateGroupPayload, 
  Group 
} from '../utils/database';

/**
 * Service for managing groups and group memberships
 * Enhanced with leave/delete logic - TODO #2
 */
class GroupsService {
  /**
   * Check if a user is the creator of a group
   */
  async isGroupCreator(userId: string, groupId: string): Promise<boolean> {
    try {
      const group = await databases.getDocument<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );
      
      return group.createdBy === userId;
    } catch (error) {
      console.error('Error checking group creator:', error);
      return false;
    }
  }

  /**
   * Leave a group (for non-creators) - removes membership but keeps chat history
   */
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    try {
      console.log(`\n🚪 USER LEAVING GROUP...`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`🏷️ Group ID: ${groupId}`);
      
      // Check if user is the creator
      const isCreator = await this.isGroupCreator(userId, groupId);
      if (isCreator) {
        throw new Error('Group creators cannot leave their own group. Use delete instead.');
      }
      
      // Find and remove user's membership
      const memberships = await this.getUserMemberships(userId);
      const membershipToRemove = memberships.find(m => m.groupId === groupId);
      
      if (!membershipToRemove) {
        throw new Error('You are not a member of this group');
      }
      
      // Delete the membership record (this removes user from calendar)
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membershipToRemove.$id
      );
      
      console.log('✅ User successfully left the group');
      console.log('💬 Chat history preserved');
      
    } catch (error: any) {
      console.error('❌ Error leaving group:', error);
      throw new Error(error.message || 'Failed to leave group. Please try again.');
    }
  }

  /**
   * Delete a group permanently (creators only) - removes everything
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    try {
      console.log(`\n🗑️ DELETING GROUP PERMANENTLY...`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`🏷️ Group ID: ${groupId}`);
      
      // Verify user is the creator
      const isCreator = await this.isGroupCreator(userId, groupId);
      if (!isCreator) {
        throw new Error('Only the group creator can permanently delete the group');
      }
      
      // Delete all group memberships
      await this.deleteGroupMemberships(groupId);
      
      // Delete all calendar entries for this group
      await this.deleteGroupCalendarEntries(groupId);
      
      // Delete all chat messages for this group
      await this.deleteGroupChatMessages(groupId);
      
      // Finally, delete the group itself
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      console.log('✅ Group permanently deleted with all associated data');
      
    } catch (error: any) {
      console.error('❌ Error deleting group:', error);
      throw new Error(error.message || 'Failed to delete group. Please try again.');
    }
  }

  /**
   * Delete group calendar entries
   */
  private async deleteGroupCalendarEntries(groupId: string): Promise<void> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId
      );

      const groupEntries = response.documents.filter((doc: any) => doc.groupId === groupId);
      
      const deletePromises = groupEntries.map(entry =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.calendarEntriesCollectionId,
          entry.$id
        )
      );

      await Promise.allSettled(deletePromises);
      console.log(`🗑️ Deleted ${groupEntries.length} calendar entries`);
      
    } catch (error) {
      console.warn('⚠️ Error deleting group calendar entries:', error);
      // Don't throw - this is cleanup
    }
  }

  /**
   * Delete group chat messages
   */
  private async deleteGroupChatMessages(groupId: string): Promise<void> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId
      );

      const groupMessages = response.documents.filter((doc: any) => doc.groupId === groupId);
      
      const deletePromises = groupMessages.map(message =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.chatMessagesCollectionId,
          message.$id
        )
      );

      await Promise.allSettled(deletePromises);
      console.log(`🗑️ Deleted ${groupMessages.length} chat messages`);
      
    } catch (error) {
      console.warn('⚠️ Error deleting group chat messages:', error);
      // Don't throw - this is cleanup
    }
  }

  // ============== EXISTING METHODS (with safe avatar handling) ==============

  /**
   * Create a new group with safe avatar upload attempt
   */
  async createGroup(groupData: {
    name: string;
    shareKey: string;
    createdBy: string;
  }): Promise<Group> {
    try {
      console.log('\n🚀 CREATING GROUP WITH SAFE AVATAR UPLOAD...');
      console.log('📋 Group Data:', groupData);
      
      // Create group document first (critical operation)
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

      // Create membership with safe avatar upload (non-blocking)
      try {
        console.log('🔗 Creating membership with safe avatar upload...');
        await this.createMembershipWithSafeAvatar({
          userId: groupData.createdBy,
          groupId: groupResponse.$id,
        });
      } catch (membershipError: any) {
        console.error('❌ Membership creation failed, trying fallback:', membershipError.message);
        
        // Fallback: Create membership without avatar
        await this.createMembershipFallback({
          userId: groupData.createdBy,
          groupId: groupResponse.$id,
        });
      }

      console.log('✅ Group creation process completed');
      return this.transformGroupRecord(groupResponse);
    } catch (error: any) {
      console.error('❌ Group creation failed:', error);
      throw new Error('Failed to create group. Please try again.');
    }
  }

  /**
   * Create group membership with safe avatar cloud upload
   */
  private async createMembershipWithSafeAvatar(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<void> {
    console.log('\n📝 CREATING MEMBERSHIP WITH SAFE AVATAR UPLOAD...');
    console.log('👤 User ID:', membershipData.userId);
    console.log('🏷️ Group ID:', membershipData.groupId);
    
    // Get user profile for name (critical)
    const userProfile = await userProfileService.getUserProfile();
    const userName = userProfile?.name || 'Anonymous User';
    console.log('👤 User name:', userName);
    
    // Try to get cloud avatar (non-critical)
    let cloudAvatarUrl: string | null = null;
    try {
      console.log('☁️ Attempting safe avatar processing...');
      
      // Add timeout to avatar processing
      const avatarPromise = autoCloudUploadService.ensureAvatarInCloud(membershipData.userId);
      const timeoutPromise = new Promise<string | null>((_, reject) =>
        setTimeout(() => reject(new Error('Avatar processing timeout')), 15000)
      );
      
      cloudAvatarUrl = await Promise.race([avatarPromise, timeoutPromise]);
      
      if (cloudAvatarUrl) {
        console.log('✅ Avatar processed successfully for group visibility');
      } else {
        console.log('ℹ️ No avatar available or processing failed safely');
      }
    } catch (avatarError: any) {
      console.warn('⚠️ Avatar processing failed (continuing without avatar):', avatarError.message);
      // Continue without avatar - this is not critical
    }

    // Create membership document (critical operation)
    const membershipPayload: any = {
      userId: membershipData.userId,
      groupId: membershipData.groupId,
      joinedAt: new Date().toISOString(),
      userName: userName,
    };

    // Include cloud avatar URL if available
    if (cloudAvatarUrl) {
      membershipPayload.avatarUrl = cloudAvatarUrl;
      console.log('✅ Including cloud avatar in membership');
    } else {
      console.log('ℹ️ Creating membership without avatar');
    }

    const membershipResponse = await databases.createDocument<GroupMemberRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId,
      generateId(),
      membershipPayload
    );

    console.log('✅ Membership created successfully:', membershipResponse.$id);
    console.log(`🖼️ Avatar included: ${!!membershipResponse.avatarUrl}`);
  }

  /**
   * Fallback membership creation without avatar
   */
  private async createMembershipFallback(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<void> {
    console.log('🔄 Creating membership without avatar (safe fallback)...');
    
    const userProfile = await userProfileService.getUserProfile();
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
  }

  /**
   * Join a group by share key with safe avatar upload
   */
  async joinGroup(shareKey: string, userId: string): Promise<Group> {
    try {
      console.log(`\n🚪 JOINING GROUP WITH SAFE AVATAR UPLOAD: ${shareKey}`);
      
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

      // Create membership with safe avatar upload
      try {
        console.log('✅ Creating membership with safe avatar upload...');
        await this.createMembershipWithSafeAvatar({
          userId: userId,
          groupId: group.$id,
        });
      } catch (membershipError: any) {
        console.error('❌ Membership creation failed, using fallback:', membershipError.message);
        
        // Fallback: Create membership without avatar
        await this.createMembershipFallback({
          userId: userId,
          groupId: group.$id,
        });
      }

      console.log('✅ Successfully joined group');
      return this.transformGroupRecord(group);
    } catch (error: any) {
      console.error('❌ Error joining group:', error);
      throw error;
    }
  }

  /**
   * Sync user profile to all group memberships with safe avatar cloud upload
   */
  async syncUserProfileToAllGroups(userId: string): Promise<void> {
    try {
      console.log(`\n🔄 SAFE SYNCING USER PROFILE: ${userId}`);
      
      const userProfile = await userProfileService.getUserProfile();
      if (!userProfile) {
        console.warn('⚠️ No user profile found for sync');
        return;
      }

      console.log('👤 Profile to sync:', {
        name: userProfile.name,
        hasAvatar: !!userProfile.avatarUri
      });

      // Process avatar to cloud safely (non-blocking)
      let cloudAvatarUrl: string | null = null;
      try {
        console.log('☁️ Attempting safe avatar processing for sync...');
        
        // Add timeout for sync operations
        const avatarPromise = autoCloudUploadService.ensureAvatarInCloud(userId);
        const timeoutPromise = new Promise<string | null>((_, reject) =>
          setTimeout(() => reject(new Error('Sync avatar timeout')), 10000)
        );
        
        cloudAvatarUrl = await Promise.race([avatarPromise, timeoutPromise]);
        
        if (cloudAvatarUrl) {
          console.log('✅ Avatar processed for sync');
        }
      } catch (avatarError: any) {
        console.warn('⚠️ Avatar processing failed during sync (continuing with name only):', avatarError.message);
      }

      const memberships = await this.getUserMemberships(userId);
      console.log(`🔄 Syncing profile for ${memberships.length} group memberships`);

      // Update all memberships (prioritize name updates)
      const updatePromises = memberships.map(async (membership) => {
        try {
          const updatePayload: any = {
            userName: userProfile.name,
          };

          // Include cloud avatar if available
          if (cloudAvatarUrl) {
            updatePayload.avatarUrl = cloudAvatarUrl;
          }

          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            membership.$id,
            updatePayload
          );

          console.log(`✅ Updated membership ${membership.$id} with ${cloudAvatarUrl ? 'avatar' : 'name only'}`);
          return true;
        } catch (error: any) {
          console.error(`❌ Failed to update membership ${membership.$id}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      
      console.log(`📊 Safe sync completed: ${successCount}/${memberships.length} memberships updated`);
      console.log(`🖼️ Avatar status: ${cloudAvatarUrl ? 'uploaded and synced to all groups' : 'not available'}`);
      
    } catch (error: any) {
      console.error('❌ Error syncing user profile to groups:', error);
      console.log('⚠️ Continuing with app functionality despite sync error');
      // Don't throw - let the user proceed even if sync fails
    }
  }

  /**
   * Force avatar upload for current user across all groups (safe version)
   */
  async forceAvatarUploadToAllGroups(userId: string): Promise<void> {
    try {
      console.log('\n🚀 SAFELY FORCING AVATAR UPLOAD TO ALL GROUPS...');
      
      // Check if uploads are enabled
      if (!autoCloudUploadService.isUploadEnabled()) {
        throw new Error('Avatar uploads are currently disabled due to previous failures');
      }
      
      // Process complete avatar workflow safely
      await autoCloudUploadService.processUserAvatar(userId);
      
      console.log('✅ Safe force avatar upload completed');
      
    } catch (error: any) {
      console.error('❌ Safe force avatar upload failed:', error);
      throw new Error(`Failed to upload avatar: ${error.message || error}`);
    }
  }

  // ============== EXISTING METHODS (unchanged) ==============

  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      console.log(`\n📋 FETCHING USER GROUPS: ${userId}`);
      
      const [allGroups, userMemberships] = await Promise.all([
        this.getAllGroups(),
        this.getUserMemberships(userId)
      ]);

      console.log(`📊 Found ${allGroups.length} total groups, ${userMemberships.length} memberships`);

      const createdGroups = allGroups.filter(group => group.createdBy === userId);
      console.log(`📊 User created ${createdGroups.length} groups`);

      const membershipGroupIds = userMemberships.map(m => m.groupId);
      const joinedGroups = allGroups.filter(group => 
        membershipGroupIds.includes(group.$id)
      );
      console.log(`📊 User joined ${joinedGroups.length} groups`);

      const allUserGroups = [...createdGroups, ...joinedGroups];
      const uniqueGroups = this.deduplicateGroups(allUserGroups);
      console.log(`📊 Total unique groups: ${uniqueGroups.length}`);

      return uniqueGroups.map(this.transformGroupRecord);
    } catch (error: any) {
      console.error('❌ Error fetching user groups:', error);
      throw new Error('Failed to fetch groups. Please try again.');
    }
  }

  async getGroup(groupId: string): Promise<Group> {
    try {
      const response = await databases.getDocument<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      return this.transformGroupRecord(response);
    } catch (error: any) {
      console.error('❌ Error fetching group:', error);
      throw new Error('Failed to fetch group. Please try again.');
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