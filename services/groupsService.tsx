// services/groupsService.ts
import { databases, appwriteConfig, generateId } from '../lib/appwrite';
import { Group } from '../components/group_management/types';

export interface AppwriteGroup {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  shareKey: string;
  createdBy: string;
}

class GroupsService {
  // Create a new group
  async createGroup(groupData: {
    name: string;
    shareKey: string;
    createdBy: string;
  }): Promise<Group> {
    try {
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        generateId(),
        {
          name: groupData.name,
          shareKey: groupData.shareKey,
          createdBy: groupData.createdBy,
        }
      );

      return {
        id: response.$id,
        name: response.name,
        shareKey: response.shareKey,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
        throw new Error('Failed to create group. Please try again.');
    }
  }

  // Get all groups for a user
  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      // Get all groups from the collection
      const allGroupsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId
      );
  
      // Filter groups created by user manually
      const createdGroups = allGroupsResponse.documents
        .filter((doc: any) => doc.createdBy === userId)
        .map((doc: any) => ({
          id: doc.$id,
          name: doc.name,
          shareKey: doc.shareKey,
          createdAt: new Date(doc.$createdAt),
        }));
  
      // Get all group memberships
      const allMembershipsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId
      );
  
      // Filter memberships for this user manually
      const userMemberships = allMembershipsResponse.documents
        .filter((doc: any) => doc.userId === userId);
  
      // Get joined groups
      const joinedGroups: Group[] = [];
      for (const membership of userMemberships) {
        const group = allGroupsResponse.documents.find((doc: any) => doc.$id === membership.groupId);
        if (group) {
          joinedGroups.push({
            id: group.$id,
            name: group.name,
            shareKey: group.shareKey,
            createdAt: new Date(group.$createdAt),
          });
        }
      }
  
      // Combine and deduplicate groups
      const allGroups = [...createdGroups, ...joinedGroups];
      const uniqueGroups = allGroups.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );
  
      return uniqueGroups;
    } catch (error) {
      throw new Error('Failed to fetch groups. Please try again.');
    }
  }

  // Delete a group
  async deleteGroup(groupId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      // Delete all memberships for this group
      const membershipsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId
      );

      const groupMemberships = membershipsResponse.documents
        .filter((doc: any) => doc.groupId === groupId);

      for (const membership of groupMemberships) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          membership.$id
        );
      }
    } catch (error) {
      throw new Error('Failed to delete group. Please try again.');
    }
  }

  // Update a group
  async updateGroup(groupId: string, updates: { name?: string }): Promise<Group> {
    try {
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId,
        updates
      );

      return {
        id: response.$id,
        name: response.name,
        shareKey: response.shareKey,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
      throw new Error('Failed to update group. Please try again.');
    }
  }

  // Get a single group by ID
  async getGroup(groupId: string): Promise<Group> {
    try {
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId
      );

      return {
        id: response.$id,
        name: response.name,
        shareKey: response.shareKey,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
      throw new Error('Failed to fetch group. Please try again.');
    }
  }

  async joinGroupByShareKey(shareKey: string): Promise<Group | null> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId
      );

      const matchingGroups = response.documents.filter((doc: any) => {
        return doc.shareKey === shareKey;
      });

      if (matchingGroups.length === 0) {
        return null;
      }

      const group = matchingGroups[0];
      
      return {
        id: group.$id,
        name: group.name,
        shareKey: group.shareKey,
        createdAt: new Date(group.$createdAt),
      };
    } catch (error) {
      throw new Error('Failed to find group. Please check the share key and try again.');
    }
  }

  // Join a group and create membership record
  async joinGroup(shareKey: string, userId: string): Promise<Group> {
    try {
      const foundGroup = await this.joinGroupByShareKey(shareKey);
      if (!foundGroup) {
        throw new Error('Group not found');
      }

      const existingMembership = await this.checkMembership(userId, foundGroup.id);      
      if (existingMembership) {
        throw new Error('Already a member');
      }

      const membershipData = {
        userId: userId,
        groupId: foundGroup.id,
        joinedAt: new Date().toISOString(),
      };
      
      const membershipResponse = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        membershipData
      );

      return foundGroup;
    } catch (error) {
      throw new Error('Joining group error: ' + error);
    }
  }
  
  async checkMembership(userId: string, groupId: string): Promise<boolean> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId
    );

    const membership = response.documents.find((doc: any) => 
      doc.userId === userId && doc.groupId === groupId
    );

    return !!membership;
  } catch (error) {
    return false; 
  }
}}
  

export const groupsService = new GroupsService();