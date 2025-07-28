// services/groupsService.tsx - Simplified version without avatar upload dependency
import { databases, appwriteConfig, generateId } from '../lib/appwrite';
import { userProfileService } from './userProfileService';
import { 
  GroupRecord, 
  GroupMemberRecord, 
  CreateGroupPayload, 
  Group 
} from '../utils/database';

/**
 * Service for managing groups and group memberships
 * Simplified version that doesn't handle avatar uploads during sync
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
    } catch (error: any) {
      console.error('❌ Group creation failed:', error);
      throw new Error('Failed to create group. Please try again.');
    }
  }

  /**
   * Create group membership without avatar upload
   */
  private async createMembership(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<void> {
    try {
      console.log('\n📝 CREATING MEMBERSHIP...');
      console.log('👤 User ID:', membershipData.userId);
      console.log('🏷️ Group ID:', membershipData.groupId);
      
      // Get user profile for name
      const userProfile = await userProfileService.getUserProfile();
      console.log('👤 User profile:', {
        name: userProfile?.name || 'NOT SET',
        hasAvatar: !!userProfile?.avatarUri
      });
      
      const userName = userProfile?.name || 'Anonymous User';
      
      // Create membership without avatar for now
      // Avatar will be handled separately by the calendar service
      const membershipPayload: any = {
        userId: membershipData.userId,
        groupId: membershipData.groupId,
        joinedAt: new Date().toISOString(),
        userName: userName,
      };

      console.log('ℹ️ Creating membership without avatar (will be added separately)');

      // Create membership document
      const membershipResponse = await databases.createDocument<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        membershipPayload
      );

      console.log('✅ Membership created successfully:', membershipResponse.$id);
      
    } catch (error: any) {
      console.error('❌ Membership creation failed:', error);
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('❌ Error fetching group:', error);
      throw new Error('Failed to fetch group. Please try again.');
    }
  }

  /**
   * Sync user profile to all group memberships - NAME ONLY VERSION
   * Avatars are handled separately by the calendar service
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
        hasAvatar: !!userProfile.avatarUri
      });

      const memberships = await this.getUserMemberships(userId);
      console.log(`🔄 Syncing name for ${memberships.length} group memberships`);

      // Update all memberships with name only
      // Avatars will be handled by calendarService.updateUserAvatar()
      const updatePromises = memberships.map(async (membership) => {
        try {
          const updatePayload = {
            userName: userProfile.name,
          };

          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            membership.$id,
            updatePayload
          );

          console.log(`✅ Updated membership ${membership.$id} with name: ${userProfile.name}`);
          return true;
        } catch (error: any) {
          console.error(`❌ Failed to update membership ${membership.$id}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(updatePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      
      console.log(`📊 Name sync completed: ${successCount}/${memberships.length} memberships updated`);
      console.log(`🖼️ Avatar sync will be handled separately by calendar service`);
      
    } catch (error: any) {
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