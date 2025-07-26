import { databases, appwriteConfig, generateId, storage, Query } from '../lib/appwrite';

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  userName: string;
  avatarUrl?: string;
  joinedAt: Date;
}

export interface CalendarEntry {
  id: string;
  userId: string;
  groupId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  createdAt: Date;
}

export interface UserStreak {
  userId: string;
  currentStreak: number;
  lastActiveDate: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

class CalendarService {
  // Get all members of a group - REAL DATABASE VERSION
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [Query.equal('groupId', groupId)]
      );

      return response.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        groupId: doc.groupId,
        userName: doc.userName || 'Anonymous User',
        avatarUrl: doc.avatarUrl,
        joinedAt: new Date(doc.$createdAt),
      }));
    } catch (error) {
      throw new Error('Failed to fetch group members');
    }
  }

  // Get calendar entries for a specific week - REAL DATABASE VERSION
  async getCalendarEntries(groupId: string, weekDates: Date[]): Promise<CalendarEntry[]> {
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.greaterThanEqual('date', startDate),
          Query.lessThanEqual('date', endDate)
        ]
      );

      return response.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        groupId: doc.groupId,
        date: doc.date,
        completed: doc.completed,
        createdAt: new Date(doc.$createdAt),
      }));
    } catch (error) {
      throw new Error('Failed to fetch calendar entries');
    }
  }

  // Create a new calendar entry - REAL DATABASE VERSION
  async createCalendarEntry(entryData: {
    userId: string;
    groupId: string;
    date: string;
    completed: boolean;
  }): Promise<CalendarEntry> {
    try {
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        generateId(),
        entryData
      );

      return {
        id: response.$id,
        userId: response.userId,
        groupId: response.groupId,
        date: response.date,
        completed: response.completed,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
      throw new Error('Failed to create calendar entry');
    }
  }

  // Update an existing calendar entry - REAL DATABASE VERSION
  async updateCalendarEntry(entryId: string, completed: boolean): Promise<CalendarEntry> {
    try {
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        entryId,
        { completed }
      );

      return {
        id: response.$id,
        userId: response.userId,
        groupId: response.groupId,
        date: response.date,
        completed: response.completed,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
      throw new Error('Failed to update calendar entry');
    }
  }

  // Get user streaks - REAL DATABASE VERSION
  async getUserStreaks(groupId: string): Promise<UserStreak[]> {
    try {
      // Get all completed calendar entries for the group
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.equal('completed', true),
          Query.orderDesc('date')
        ]
      );

      // Calculate streaks for each user
      const groupMembers = await this.getGroupMembers(groupId);
      const userStreaks: UserStreak[] = [];

      for (const member of groupMembers) {
        const userEntries = response.documents.filter((doc: any) => doc.userId === member.userId);
        const streak = this.calculateUserStreak(userEntries);
        
        userStreaks.push({
          userId: member.userId,
          currentStreak: streak.currentStreak,
          lastActiveDate: streak.lastActiveDate,
        });
      }

      return userStreaks;
    } catch (error) {
      throw new Error('Failed to calculate user streaks');
    }
  }

  // Calculate streak for a single user
  private calculateUserStreak(userEntries: any[]): { currentStreak: number; lastActiveDate: string } {
    if (userEntries.length === 0) {
      return { currentStreak: 0, lastActiveDate: '' };
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Sort entries by date (most recent first)
    const sortedEntries = userEntries.sort((a, b) => b.date.localeCompare(a.date));
    
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Check backwards from today to find consecutive days
    for (let i = 0; i < 365; i++) { // Limit to avoid infinite loops
      const dateString = checkDate.toISOString().split('T')[0];
      const hasEntry = sortedEntries.some(entry => entry.date === dateString);
      
      if (hasEntry) {
        currentStreak++;
      } else {
        // If we haven't started counting yet and today is missing, that's okay
        if (currentStreak > 0 || dateString === todayString) {
          break;
        }
      }
      
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      currentStreak,
      lastActiveDate: sortedEntries[0]?.date || '',
    };
  }

  // Update user avatar - REAL DATABASE VERSION
  async updateUserAvatar(userId: string, groupId: string, avatarUrl: string): Promise<void> {
    try {
      // Find the user's membership record
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('groupId', groupId)
        ]
      );

      if (response.documents.length === 0) {
        throw new Error('User membership not found');
      }

      const membership = response.documents[0];

      // Update the membership record with the new avatar URL
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membership.$id,
        { avatarUrl }
      );
    } catch (error) {
      throw new Error('Failed to update user avatar');
    }
  }

  // Upload and compress image file - REAL STORAGE VERSION
  async uploadAndCompressImage(imageUri: string, fileName: string): Promise<string> {
    try {
      // Convert URI to File object for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload to Appwrite storage
      const uploadResponse = await storage.createFile(
        appwriteConfig.avatarBucketId,
        generateId(),
        blob
      );

      // Return the file URL
      const fileUrl = storage.getFileView(appwriteConfig.avatarBucketId, uploadResponse.$id);
      return fileUrl.toString();
    } catch (error) {
      throw new Error('Failed to upload image');
    }
  }

  // Delete old avatar when updating - REAL STORAGE VERSION
  async deleteOldAvatar(oldAvatarUrl: string): Promise<void> {
    try {
      // Extract file ID from URL
      const urlParts = oldAvatarUrl.split('/');
      const fileId = urlParts[urlParts.length - 1];
      
      await storage.deleteFile(appwriteConfig.avatarBucketId, fileId);
    } catch (error) {
      // Don't throw error for old avatar deletion to avoid blocking new avatar upload
      console.warn('Failed to delete old avatar:', error);
    }
  }

  // Get chat messages for a group - MOCK FOR NOW
  async getChatMessages(groupId: string): Promise<ChatMessage[]> {
    // TODO: Implement real chat storage when you add chat collection
    const mockMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-5',
        userName: 'Hanzen',
        message: 'What a crazy claim: "I am the resurrection and the life"',
        timestamp: new Date('2025-01-24T17:39:00'),
      },
      {
        id: 'msg-2',
        userId: 'user-1',
        userName: 'You',
        message: 'And finish it tmrw',
        timestamp: new Date('2025-01-24T18:15:00'),
      },
    ];
    return mockMessages;
  }

  // Send a chat message - MOCK FOR NOW  
  async sendChatMessage(groupId: string, message: ChatMessage): Promise<ChatMessage> {
    // TODO: Implement real chat storage when you add chat collection
    return message;
  }
}

export const calendarService = new CalendarService();