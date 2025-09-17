import { databases, appwriteConfig, generateId, Query } from '../lib/appwrite';
import { userProfileService } from './userProfileService';
import { autoCloudUploadService } from './autoCloudUploadService';
import { 
  GroupRecord, 
  GroupMemberRecord, 
  CreateGroupPayload, 
  Group 
} from '../utils/database';

class GroupsService {
  private creatorCache = new Map<string, { isCreator: boolean; timestamp: number }>();
  private readonly CREATOR_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private getCachedCreatorStatus(userId: string, groupId: string): boolean | null {
    const key = `${userId}-${groupId}`;
    const cached = this.creatorCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.CREATOR_CACHE_TTL) {
      return cached.isCreator;
    }
    
    this.creatorCache.delete(key);
    return null;
  }

  private setCachedCreatorStatus(userId: string, groupId: string, isCreator: boolean): void {
    const key = `${userId}-${groupId}`;
    this.creatorCache.set(key, {
      isCreator,
      timestamp: Date.now()
    });
  }

  async isGroupCreator(userId: string, groupId: string): Promise<boolean> {
    const cached = this.getCachedCreatorStatus(userId, groupId);
    if (cached !== null) {
      return cached;
    }

    try {
      const group = await databases.getDocument<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );
      
      const isCreator = group.createdBy === userId;
      this.setCachedCreatorStatus(userId, groupId, isCreator);
      return isCreator;
    } catch (error) {
      return false;
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // INDUSTRY METHOD: Idempotent upsert operation
  async createOrUpdateMembership(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<GroupMemberRecord> {
    try {
      // First, try to find existing membership
      const existingMembership = await this.findExistingMembership(
        membershipData.userId, 
        membershipData.groupId
      );

      if (existingMembership) {
        // Update existing membership if needed
        return await this.updateMembershipIfNeeded(existingMembership, membershipData);
      }

      // Create new membership with retry mechanism
      return await this.createMembershipWithRetry(membershipData);
      
    } catch (error: any) {
      // If error is "already exists", handle gracefully
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        return await this.findExistingMembership(membershipData.userId, membershipData.groupId);
      }
      throw error;
    }
  }

  // Find existing membership with precise query
  private async findExistingMembership(userId: string, groupId: string): Promise<GroupMemberRecord | null> {
    try {
      const response = await databases.listDocuments<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('groupId', groupId),
          Query.limit(1)
        ]
      );

      return response.documents[0] || null;
    } catch (error) {
      return null;
    }
  }

  // Atomic membership creation with race condition handling
  private async createMembershipWithRetry(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<GroupMemberRecord> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Double-check right before creation (race condition protection)
        const lastSecondCheck = await this.findExistingMembership(
          membershipData.userId, 
          membershipData.groupId
        );
        
        if (lastSecondCheck) {
          return lastSecondCheck;
        }

        // Get user profile
        const userProfile = await userProfileService.getUserProfile();
        const userName = userProfile?.name || 'Anonymous User';

        // Create membership payload 
        const membershipPayload = {
          userId: membershipData.userId,
          groupId: membershipData.groupId,
          joinedAt: new Date().toISOString(),
          userName: userName,
        };

        // Attempt creation
        const newMembership = await databases.createDocument<GroupMemberRecord>(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          generateId(),
          membershipPayload
        );

        return newMembership;

      } catch (error: any) {
        // Handle specific duplicate errors
        if (error.message?.includes('duplicate') || 
            error.message?.includes('already exists') ||
            error.message?.includes('unique constraint')) {
          
          // Return existing membership instead of failing
          const existing = await this.findExistingMembership(
            membershipData.userId, 
            membershipData.groupId
          );
          
          if (existing) {
            return existing;
          }
        }

        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    throw new Error('Failed to create membership after retries');
  }

  // Helper method to update membership if needed
  private async updateMembershipIfNeeded(
    existingMembership: GroupMemberRecord, 
    membershipData: { userId: string; groupId: string; }
  ): Promise<GroupMemberRecord> {
    try {
      // Get current user profile
      const userProfile = await userProfileService.getUserProfile();
      const currentUserName = userProfile?.name || 'Anonymous User';
      
      // Check if we need to update the membership
      const needsUpdate = existingMembership.userName !== currentUserName;
      
      if (needsUpdate) {
        const updatedMembership = await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          existingMembership.$id,
          {
            userName: currentUserName,
          }
        );
        return updatedMembership;
      }
      
      return existingMembership;
      
    } catch (error) {
      // If update fails, return existing membership
      return existingMembership;
    }
  }

  private async getUserMemberships(userId: string): Promise<GroupMemberRecord[]> {
    try {
      const response = await databases.listDocuments<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('userId', userId),
          Query.limit(100)
        ]
      );
      return response.documents;
    } catch (error) {
      return [];
    }
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      const [createdGroupsResponse, userMemberships] = await Promise.all([
        databases.listDocuments<GroupRecord>(
          appwriteConfig.databaseId,
          appwriteConfig.groupsCollectionId,
          [
            Query.equal('createdBy', userId),
            Query.limit(50)
          ]
        ),
        this.getUserMemberships(userId)
      ]);

      const createdGroups = createdGroupsResponse.documents;
      const membershipGroupIds = userMemberships.map(m => m.groupId);

      let joinedGroups: GroupRecord[] = [];
      if (membershipGroupIds.length > 0) {
        const batchSize = 25;
        for (let i = 0; i < membershipGroupIds.length; i += batchSize) {
          const batch = membershipGroupIds.slice(i, i + batchSize);
          const batchResponse = await databases.listDocuments<GroupRecord>(
            appwriteConfig.databaseId,
            appwriteConfig.groupsCollectionId,
            [
              Query.equal('$id', batch),
              Query.limit(batchSize)
            ]
          );
          joinedGroups = [...joinedGroups, ...batchResponse.documents];
        }
      }

      const allUserGroups = [...createdGroups, ...joinedGroups];
      const uniqueGroups = this.deduplicateGroups(allUserGroups);

      return uniqueGroups.map(this.transformGroupRecord);
    } catch (error: any) {
      throw new Error('Failed to fetch groups. Please try again.');
    }
  }

  async checkMembership(userId: string, groupId: string): Promise<boolean> {
    try {
      const response = await databases.listDocuments<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('groupId', groupId),
          Query.limit(1)
        ]
      );
      
      return response.documents.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Safe group creation with membership
  async createGroup(groupData: {
    name: string;
    shareKey: string;
    createdBy: string;
  }): Promise<Group> {
    try {
      // Create the group first
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

      // Create creator membership - simplified for group creation
      try {
        await this.createDirectMembership({
          userId: groupData.createdBy,
          groupId: groupResponse.$id,
        });
      } catch (membershipError: any) {
        // If membership creation fails, still return the group
        // The user can join manually if needed
        console.warn('Creator membership creation failed:', membershipError.message);
      }

      return this.transformGroupRecord(groupResponse);
      
    } catch (error: any) {
      throw new Error('Failed to create group. Please try again.');
    }
  }

  private async createDirectMembership(membershipData: {
    userId: string;
    groupId: string;
  }): Promise<GroupMemberRecord> {
    try {
      // Get user profile
      const userProfile = await userProfileService.getUserProfile();
      const userName = userProfile?.name || 'Anonymous User';

      // Create membership payload
      const membershipPayload = {
        userId: membershipData.userId,
        groupId: membershipData.groupId,
        joinedAt: new Date().toISOString(),
        userName: userName,
      };

      // Direct creation - no duplicate checking needed for group creators
      const newMembership = await databases.createDocument<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        membershipPayload
      );

      return newMembership;

    } catch (error: any) {
      // Re-throw for the calling method to handle
      throw error;
    }
  }

  // Safe membership creation for group joining
  async joinGroup(shareKey: string, userId: string): Promise<Group> {
    try {
      const group = await this.findGroupByShareKey(shareKey);
      if (!group) {
        throw new Error('Group not found');
      }

      // Use idempotent membership creation
      await this.createOrUpdateMembership({
        userId: userId,
        groupId: group.$id,
      });

      return this.transformGroupRecord(group);
      
    } catch (error: any) {
      throw error;
    }
  }

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

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    try {
      const isCreator = await this.isGroupCreator(userId, groupId);
      if (!isCreator) {
        throw new Error('Only the group creator can permanently delete the group');
      }
      
      await Promise.all([
        this.deleteGroupMemberships(groupId),
        this.deleteGroupCalendarEntries(groupId),
        this.deleteGroupChatMessages(groupId)
      ]);
      
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      this.clearCreatorCacheForGroup(groupId);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete group. Please try again.');
    }
  }

  // Cleanup duplicates with safe deduplication
  async cleanupAllDuplicateMemberships(groupId: string): Promise<{
    duplicatesRemoved: number;
    errors: string[];
  }> {
    try {
      // Get all memberships for this group
      const response = await databases.listDocuments<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.limit(1000)
        ]
      );

      // Group by userId to find duplicates
      const membershipsByUser = new Map<string, GroupMemberRecord[]>();
      
      response.documents.forEach(membership => {
        const userId = membership.userId;
        if (!membershipsByUser.has(userId)) {
          membershipsByUser.set(userId, []);
        }
        membershipsByUser.get(userId)!.push(membership);
      });

      // Find and remove duplicates
      let duplicatesRemoved = 0;
      const errors: string[] = [];

      for (const [userId, memberships] of membershipsByUser) {
        if (memberships.length > 1) {
          // Sort by creation date - keep the oldest one
          memberships.sort((a, b) => 
            new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
          );

          // Remove all but the first (oldest) membership
          const duplicatesToRemove = memberships.slice(1);
          
          for (const duplicate of duplicatesToRemove) {
            try {
              await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.groupMembersCollectionId,
                duplicate.$id
              );
              duplicatesRemoved++;
            } catch (error: any) {
              errors.push(`Failed to remove duplicate ${duplicate.$id}: ${error.message}`);
            }
          }
        }
      }

      return { duplicatesRemoved, errors };
      
    } catch (error: any) {
      return { 
        duplicatesRemoved: 0, 
        errors: [`Cleanup failed: ${error.message}`] 
      };
    }
  }

  async cleanupDuplicateMemberships(userId: string, groupId: string): Promise<void> {
    try {
      const response = await databases.listDocuments<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('groupId', groupId)
        ]
      );

      if (response.documents.length > 1) {
        const duplicates = response.documents.slice(1);
        const deletePromises = duplicates.map(doc =>
          databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            doc.$id
          )
        );

        await Promise.allSettled(deletePromises);
      }
    } catch (error) {
      // Continue even if cleanup fails
    }
  }

  // Batch cleanup for all groups
  async cleanupAllDuplicatesForUser(userId: string): Promise<void> {
    try {
      // Get all user's groups
      const userGroups = await this.getUserGroups(userId);
      
      // Clean up duplicates in each group
      const cleanupPromises = userGroups.map(group => 
        this.cleanupDuplicateMemberships(userId, group.id)
      );
      
      await Promise.allSettled(cleanupPromises);
      
    } catch (error) {
      // Don't throw - this is maintenance
    }
  }

  private async deleteGroupCalendarEntries(groupId: string): Promise<void> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.limit(1000)
        ]
      );

      const deletePromises = response.documents.map(entry =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.calendarEntriesCollectionId,
          entry.$id
        )
      );

      await Promise.allSettled(deletePromises);
    } catch (error) {
      // Continue cleanup even if this fails
    }
  }

  private async deleteGroupChatMessages(groupId: string): Promise<void> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.limit(1000)
        ]
      );

      const deletePromises = response.documents.map(message =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.chatMessagesCollectionId,
          message.$id
        )
      );

      await Promise.allSettled(deletePromises);
    } catch (error) {
      // Continue cleanup even if this fails
    }
  }

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
          setTimeout(() => reject(new Error('Sync avatar timeout')), 6000)
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

  async joinGroupByShareKey(shareKey: string): Promise<Group | null> {
    try {
      const group = await this.findGroupByShareKey(shareKey);
      if (!group) {
        return null;
      }

      return this.transformGroupRecord(group);
    } catch (error: any) {
      throw new Error('Failed to find group. Please check the share key and try again.');
    }
  }

  async updateGroup(groupId: string, updates: Partial<{ name: string }>): Promise<Group> {
    try {
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId,
        updates
      );

      return this.transformGroupRecord(response);
    } catch (error: any) {
      throw new Error('Failed to update group. Please try again.');
    }
  }

  private async findGroupByShareKey(shareKey: string): Promise<GroupRecord | null> {
    try {
      const response = await databases.listDocuments<GroupRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        [
          Query.equal('shareKey', shareKey),
          Query.limit(1)
        ]
      );
      return response.documents[0] || null;
    } catch (error) {
      return null;
    }
  }

  private async deleteGroupMemberships(groupId: string): Promise<void> {
    try {
      const response = await databases.listDocuments<GroupMemberRecord>(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.limit(1000)
        ]
      );

      const deletePromises = response.documents.map(membership =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          membership.$id
        )
      );

      await Promise.allSettled(deletePromises);
    } catch (error) {
      // Continue cleanup even if this fails
    }
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

  private clearCreatorCacheForGroup(groupId: string): void {
    for (const [key] of this.creatorCache) {
      if (key.endsWith(`-${groupId}`)) {
        this.creatorCache.delete(key);
      }
    }
  }

  clearCreatorCache(): void {
    this.creatorCache.clear();
  }

  getCreatorCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.creatorCache.size,
      keys: Array.from(this.creatorCache.keys())
    };
  }
}

export const groupsService = new GroupsService();