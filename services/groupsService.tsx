import { databases, appwriteConfig, generateId } from '../lib/appwrite';
import { userProfileService } from './userProfileService';
import { autoCloudUploadService } from './autoCloudUploadService';
import { 
  GroupRecord, 
  GroupMemberRecord, 
  CreateGroupPayload, 
  Group 
} from '../utils/database';

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
      return false;
    }
  }

  /**
   * Leave a group (for non-creators) - removes membership but keeps chat history
   */
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    try {
      const isCreator = await this.isGroupCreator(userId, groupId);
      if (isCreator) {
        throw new Error('Group creators cannot leave their own group. Use delete instead.');
      }
      
      const memberships = await this.getUserMemberships(userId);
      const membershipToRemove = memberships.find(m => m.groupId === groupId);
      
      if (!membershipToRemove) {
        throw new Error('You are not a member of this group');
      }
      
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membershipToRemove.$id
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to leave group. Please try again.');
    }
  }

  /**
   * Delete a group permanently (creators only) - removes everything
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    try {
      const isCreator = await this.isGroupCreator(userId, groupId);
      if (!isCreator) {
        throw new Error('Only the group creator can permanently delete the group');
      }
      
      await this.deleteGroupMemberships(groupId);
      await this.deleteGroupCalendarEntries(groupId);
      await this.deleteGroupChatMessages(groupId);
      
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );
    } catch (error: any) {
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
    } catch (error) {
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
    } catch (error) {
      // Don't throw - this is cleanup
    }
  }

  /**
   * Create a new group
   */
  async createGroup(groupData: {
    name: string;
    shareKey: string;
    createdBy: string;
  }): Promise<Group> {
    try {
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

      try {
        await this.createMembershipWithSafeAvatar({
          userId: groupData.createdBy,
          groupId: groupResponse.$id,
        });
      } catch (membershipError: any) {
        await this.createMembershipFallback({
          userId: groupData.createdBy,
          groupId: groupResponse.$id,
        });
      }

      return this.transformGroupRecord(groupResponse);
    } catch (error: any) {
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
    const userProfile = await userProfileService.getUserProfile();
    const userName = userProfile?.name || 'Anonymous User';
    
    let cloudAvatarUrl: string | null = null;
    try {
      const avatarPromise = autoCloudUploadService.ensureAvatarInCloud(membershipData.userId);
      const timeoutPromise = new Promise<string | null>((_, reject) =>
        setTimeout(() => reject(new Error('Avatar processing timeout')), 15000)
      );
      
      cloudAvatarUrl = await Promise.race([avatarPromise, timeoutPromise]);
    } catch (avatarError: any) {
      // Continue without avatar - this is not critical
    }

    const membershipPayload: any = {
      userId: membershipData.userId,
      groupId: membershipData.groupId,
      joinedAt: new Date().toISOString(),
      userName: userName,
    };

    if (cloudAvatarUrl) {
      membershipPayload.avatarUrl = cloudAvatarUrl;
    }

    const membershipResponse = await databases.createDocument<GroupMemberRecord>(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId,
      generateId(),
      membershipPayload
    );
  }

  /**
   * Fallback membership creation without avatar
   */
  private async createMembershipFallback(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<void> {
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

      try {
        await this.createMembershipWithSafeAvatar({
          userId: userId,
          groupId: group.$id,
        });
      } catch (membershipError: any) {
        await this.createMembershipFallback({
          userId: userId,
          groupId: group.$id,
        });
      }

      return this.transformGroupRecord(group);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Sync user profile to all group memberships
   */
  async syncUserProfileToAllGroups(userId: string): Promise<void> {
    try {
      const userProfile = await userProfileService.getUserProfile();
      if (!userProfile) {
        return;
      }

      let cloudAvatarUrl: string | null = null;
      try {
        const avatarPromise = autoCloudUploadService.ensureAvatarInCloud(userId);
        const timeoutPromise = new Promise<string | null>((_, reject) =>
          setTimeout(() => reject(new Error('Sync avatar timeout')), 10000)
        );
        
        cloudAvatarUrl = await Promise.race([avatarPromise, timeoutPromise]);
      } catch (avatarError: any) {
        // Continue with name only
      }

      const memberships = await this.getUserMemberships(userId);

      const updatePromises = memberships.map(async (membership) => {
        try {
          const updatePayload: any = {
            userName: userProfile.name,
          };

          if (cloudAvatarUrl) {
            updatePayload.avatarUrl = cloudAvatarUrl;
          }

          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            membership.$id,
            updatePayload
          );

          return true;
        } catch (error: any) {
          return false;
        }
      });

      await Promise.allSettled(updatePromises);
    } catch (error: any) {
      // Don't throw - let the user proceed even if sync fails
    }
  }

  /**
   * Force avatar upload for current user across all groups
   */
  async forceAvatarUploadToAllGroups(userId: string): Promise<void> {
    try {
      if (!autoCloudUploadService.isUploadEnabled()) {
        throw new Error('Avatar uploads are currently disabled due to previous failures');
      }
      
      await autoCloudUploadService.processUserAvatar(userId);
    } catch (error: any) {
      throw new Error(`Failed to upload avatar: ${error.message || error}`);
    }
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      const [allGroups, userMemberships] = await Promise.all([
        this.getAllGroups(),
        this.getUserMemberships(userId)
      ]);

      const createdGroups = allGroups.filter(group => group.createdBy === userId);
      const membershipGroupIds = userMemberships.map(m => m.groupId);
      const joinedGroups = allGroups.filter(group => 
        membershipGroupIds.includes(group.$id)
      );

      const allUserGroups = [...createdGroups, ...joinedGroups];
      const uniqueGroups = this.deduplicateGroups(allUserGroups);

      return uniqueGroups.map(this.transformGroupRecord);
    } catch (error: any) {
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
      throw new Error('Failed to fetch group. Please try again.');
    }
  }

  // Private helper methods
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