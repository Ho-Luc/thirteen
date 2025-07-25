import { groupsService } from '../../services/groupsService';
import { databases } from '../../lib/appwrite';
import { expect, describe, beforeEach, jest, it } from '@jest/globals';

// Mock the Appwrite dependencies
jest.mock('../../lib/appwrite', () => {
  const mockJest = require('@jest/globals').jest;
  return {
    databases: {
      createDocument: mockJest.fn(),
      listDocuments: mockJest.fn(),
      deleteDocument: mockJest.fn(),
      updateDocument: mockJest.fn(),
      getDocument: mockJest.fn(),
    },
    appwriteConfig: {
      databaseId: 'test-database-id',
      groupsCollectionId: 'test-groups-collection-id',
      groupMembersCollectionId: 'test-members-collection-id',
    },
    generateId: mockJest.fn(() => 'generated-id-123'),
  };
});

describe('GroupsService', () => {
  const mockUserId = 'user-123';
  const mockGroupId = 'group-456';
  const mockShareKey = 'ABC123';
  
  const mockGroup = {
    $id: mockGroupId,
    $createdAt: '2025-01-15T10:00:00.000Z',
    $updatedAt: '2025-01-15T10:00:00.000Z',
    name: 'Test Group',
    shareKey: mockShareKey,
    createdBy: mockUserId,
  };

  const mockMembership = {
    $id: 'membership-789',
    userId: mockUserId,
    groupId: mockGroupId,
    joinedAt: '2025-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('successfully creates a group', async () => {
      databases.createDocument.mockResolvedValue(mockGroup);

      const groupData = {
        name: 'Test Group',
        shareKey: mockShareKey,
        createdBy: mockUserId,
      };

      const result = await groupsService.createGroup(groupData);

      expect(databases.createDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-groups-collection-id',
        'generated-id-123',
        groupData
      );

      expect(result).toEqual({
        id: mockGroupId,
        name: 'Test Group',
        shareKey: mockShareKey,
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
      });
    });

    it('throws error when creation fails', async () => {
      databases.createDocument.mockRejectedValue(new Error('Database error'));

      const groupData = {
        name: 'Test Group',
        shareKey: mockShareKey,
        createdBy: mockUserId,
      };

      await expect(groupsService.createGroup(groupData)).rejects.toThrow(
        'Failed to create group. Please try again.'
      );
    });

    it('handles special characters in group name', async () => {
      const specialGroup = {
        ...mockGroup,
        name: 'Group @#$%^&*()',
      };
      
      databases.createDocument.mockResolvedValue(specialGroup);

      const groupData = {
        name: 'Group @#$%^&*()',
        shareKey: mockShareKey,
        createdBy: mockUserId,
      };

      const result = await groupsService.createGroup(groupData);

      expect(result.name).toBe('Group @#$%^&*()');
    });
  });

  describe('getUserGroups', () => {
    it('returns combined created and joined groups', async () => {
      const allGroups = [
        mockGroup,
        {
          $id: 'group-789',
          name: 'Another Group',
          shareKey: 'XYZ789',
          createdBy: 'other-user',
          $createdAt: '2025-01-16T10:00:00.000Z',
        }
      ];

      const memberships = [
        {
          $id: 'membership-1',
          userId: mockUserId,
          groupId: 'group-789',
        }
      ];

      databases.listDocuments
        .mockResolvedValueOnce({ documents: allGroups }) // First call for groups
        .mockResolvedValueOnce({ documents: memberships }); // Second call for memberships

      const result = await groupsService.getUserGroups(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Group'); // Created group
      expect(result[1].name).toBe('Another Group'); // Joined group
    });

    it('deduplicates groups when user is both creator and member', async () => {
      const duplicateMembership = {
        $id: 'membership-1',
        userId: mockUserId,
        groupId: mockGroupId, // Same as created group
      };

      databases.listDocuments
        .mockResolvedValueOnce({ documents: [mockGroup] })
        .mockResolvedValueOnce({ documents: [duplicateMembership] });

      const result = await groupsService.getUserGroups(mockUserId);

      expect(result).toHaveLength(1); // Should be deduplicated
      expect(result[0].id).toBe(mockGroupId);
    });

    it('returns empty array when user has no groups', async () => {
      databases.listDocuments
        .mockResolvedValueOnce({ documents: [] })
        .mockResolvedValueOnce({ documents: [] });

      const result = await groupsService.getUserGroups(mockUserId);

      expect(result).toEqual([]);
    });

    it('throws error when fetching fails', async () => {
      databases.listDocuments.mockRejectedValue(new Error('Database error'));

      await expect(groupsService.getUserGroups(mockUserId)).rejects.toThrow(
        'Failed to fetch groups. Please try again.'
      );
    });
  });

  describe('deleteGroup', () => {
    it('successfully deletes group and all memberships', async () => {
      const memberships = [
        { $id: 'membership-1', groupId: mockGroupId },
        { $id: 'membership-2', groupId: mockGroupId },
      ];

      databases.deleteDocument.mockResolvedValue({});
      databases.listDocuments.mockResolvedValue({ documents: memberships });

      await groupsService.deleteGroup(mockGroupId);

      // Should delete the group
      expect(databases.deleteDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-groups-collection-id',
        mockGroupId
      );

      // Should delete all memberships
      expect(databases.deleteDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-members-collection-id',
        'membership-1'
      );
      expect(databases.deleteDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-members-collection-id',
        'membership-2'
      );

      expect(databases.deleteDocument).toHaveBeenCalledTimes(3);
    });

    it('throws error when deletion fails', async () => {
      databases.deleteDocument.mockRejectedValue(new Error('Database error'));

      await expect(groupsService.deleteGroup(mockGroupId)).rejects.toThrow(
        'Failed to delete group. Please try again.'
      );
    });
  });

  describe('updateGroup', () => {
    it('successfully updates group name', async () => {
      const updatedGroup = {
        ...mockGroup,
        name: 'Updated Group Name',
      };

      databases.updateDocument.mockResolvedValue(updatedGroup);

      const result = await groupsService.updateGroup(mockGroupId, {
        name: 'Updated Group Name',
      });

      expect(databases.updateDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-groups-collection-id',
        mockGroupId,
        { name: 'Updated Group Name' }
      );

      expect(result.name).toBe('Updated Group Name');
    });

    it('throws error when update fails', async () => {
      databases.updateDocument.mockRejectedValue(new Error('Database error'));

      await expect(
        groupsService.updateGroup(mockGroupId, { name: 'New Name' })
      ).rejects.toThrow('Failed to update group. Please try again.');
    });
  });

  describe('getGroup', () => {
    it('successfully retrieves single group', async () => {
      databases.getDocument.mockResolvedValue(mockGroup);

      const result = await groupsService.getGroup(mockGroupId);

      expect(databases.getDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-groups-collection-id',
        mockGroupId
      );

      expect(result).toEqual({
        id: mockGroupId,
        name: 'Test Group',
        shareKey: mockShareKey,
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
      });
    });

    it('throws error when group not found', async () => {
      databases.getDocument.mockRejectedValue(new Error('Document not found'));

      await expect(groupsService.getGroup('nonexistent-id')).rejects.toThrow(
        'Failed to fetch group. Please try again.'
      );
    });
  });

  describe('joinGroupByShareKey', () => {
    it('finds group by share key', async () => {
      databases.listDocuments.mockResolvedValue({
        documents: [mockGroup],
      });

      const result = await groupsService.joinGroupByShareKey(mockShareKey);

      expect(result).toEqual({
        id: mockGroupId,
        name: 'Test Group',
        shareKey: mockShareKey,
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
      });
    });

    it('returns null when no group found with share key', async () => {
      databases.listDocuments.mockResolvedValue({
        documents: [],
      });

      const result = await groupsService.joinGroupByShareKey('INVALID');

      expect(result).toBeNull();
    });

    it('returns first group when multiple groups have same share key', async () => {
      const duplicateGroups = [mockGroup, { ...mockGroup, $id: 'group-999' }];
      
      databases.listDocuments.mockResolvedValue({
        documents: duplicateGroups,
      });

      const result = await groupsService.joinGroupByShareKey(mockShareKey);

      expect(result.id).toBe(mockGroupId); // Should return first one
    });

    it('throws error when search fails', async () => {
      databases.listDocuments.mockRejectedValue(new Error('Database error'));

      await expect(
        groupsService.joinGroupByShareKey(mockShareKey)
      ).rejects.toThrow('Failed to find group. Please check the share key and try again.');
    });
  });

  describe('joinGroup', () => {
    it('successfully joins group when not already a member', async () => {
      // Mock finding the group
      databases.listDocuments
        .mockResolvedValueOnce({ documents: [mockGroup] }) // For finding group
        .mockResolvedValueOnce({ documents: [] }); // For checking membership (empty = not a member)

      databases.createDocument.mockResolvedValue(mockMembership);

      const result = await groupsService.joinGroup(mockShareKey, mockUserId);

      expect(databases.createDocument).toHaveBeenCalledWith(
        'test-database-id',
        'test-members-collection-id',
        'generated-id-123',
        expect.objectContaining({
          userId: mockUserId,
          groupId: mockGroupId,
        })
      );

      expect(result).toEqual({
        id: mockGroupId,
        name: 'Test Group',
        shareKey: mockShareKey,
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
      });
    });

    it('throws error when already a member', async () => {
      databases.listDocuments
        .mockResolvedValueOnce({ documents: [mockGroup] })
        .mockResolvedValueOnce({ documents: [mockMembership] }); // User is already a member

      await expect(
        groupsService.joinGroup(mockShareKey, mockUserId)
      ).rejects.toThrow('Joining group error: Error: Already a member');
    });

    it('throws error when group not found', async () => {
      databases.listDocuments.mockResolvedValueOnce({ documents: [] });

      await expect(
        groupsService.joinGroup('INVALID', mockUserId)
      ).rejects.toThrow('Joining group error: Error: Group not found');
    });

    it('throws error when membership creation fails', async () => {
      databases.listDocuments
        .mockResolvedValueOnce({ documents: [mockGroup] })
        .mockResolvedValueOnce({ documents: [] });

      databases.createDocument.mockRejectedValue(new Error('Database error'));

      await expect(
        groupsService.joinGroup(mockShareKey, mockUserId)
      ).rejects.toThrow('Joining group error:');
    });
  });

  describe('checkMembership', () => {
    it('returns true when user is a member', async () => {
      databases.listDocuments.mockResolvedValue({
        documents: [mockMembership],
      });

      const result = await groupsService.checkMembership(mockUserId, mockGroupId);

      expect(result).toBe(true);
    });

    it('returns false when user is not a member', async () => {
      databases.listDocuments.mockResolvedValue({
        documents: [],
      });

      const result = await groupsService.checkMembership(mockUserId, mockGroupId);

      expect(result).toBe(false);
    });

    it('returns false when membership check fails', async () => {
      databases.listDocuments.mockRejectedValue(new Error('Database error'));

      const result = await groupsService.checkMembership(mockUserId, mockGroupId);

      expect(result).toBe(false);
    });

    it('correctly filters memberships for specific user and group', async () => {
      const memberships = [
        { userId: mockUserId, groupId: 'other-group' },
        { userId: 'other-user', groupId: mockGroupId },
        { userId: mockUserId, groupId: mockGroupId }, // This should match
      ];

      databases.listDocuments.mockResolvedValue({
        documents: memberships,
      });

      const result = await groupsService.checkMembership(mockUserId, mockGroupId);

      expect(result).toBe(true);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('handles malformed date strings gracefully', async () => {
      const groupWithBadDate = {
        ...mockGroup,
        $createdAt: 'invalid-date',
      };

      databases.createDocument.mockResolvedValue(groupWithBadDate);

      const result = await groupsService.createGroup({
        name: 'Test',
        shareKey: 'ABC123',
        createdBy: mockUserId,
      });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(isNaN(result.createdAt.getTime())).toBe(true); // Invalid date
    });

    it('handles empty strings and null values', async () => {
      const emptyGroup = {
        $id: 'test-id',
        $createdAt: '2025-01-15T10:00:00.000Z',
        name: '',
        shareKey: '',
        createdBy: '',
      };

      databases.createDocument.mockResolvedValue(emptyGroup);

      const result = await groupsService.createGroup({
        name: '',
        shareKey: '',
        createdBy: '',
      });

      expect(result.name).toBe('');
      expect(result.shareKey).toBe('');
    });

    it('handles very long input strings', async () => {
      const longName = 'A'.repeat(1000);
      const longGroup = {
        ...mockGroup,
        name: longName,
      };

      databases.createDocument.mockResolvedValue(longGroup);

      const result = await groupsService.createGroup({
        name: longName,
        shareKey: mockShareKey,
        createdBy: mockUserId,
      });

      expect(result.name).toBe(longName);
    });
  });
});