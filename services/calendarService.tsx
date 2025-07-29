// services/calendarService.tsx - Fixed streak calculation for TODO #3
import { databases, appwriteConfig, generateId, storage, Query } from '../lib/appwrite';
import { fixAvatarUrls } from '../utils/avatarUrlFixer';
import * as FileSystem from 'expo-file-system';

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
  // Get all members of a group - FIXED VERSION
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [Query.equal('groupId', groupId)]
      );

      if (response.documents.length === 0) {
        return [];
      }

      // Process each member with FIXED logging
      const members = response.documents.map((doc: any, index: number) => {
        return {
          id: doc.$id,
          userId: doc.userId,
          groupId: doc.groupId,
          userName: doc.name || doc.userName || 'Anonymous User',
          avatarUrl: doc.avatarUrl,
          joinedAt: new Date(doc.joinedAt || doc.$createdAt),
        };
      });

      // Fix any truncated avatar URLs (this will now preserve local file URLs)
      const membersWithFixedUrls = fixAvatarUrls(members);
      
      return membersWithFixedUrls;
    } catch (error) {
      throw new Error('Failed to fetch group members');
    }
  }

  // Get calendar entries for a specific week
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

  // Create a new calendar entry
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

  // Update an existing calendar entry
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

  // Enhanced updateUserAvatar with comprehensive logging
  async updateUserAvatar(userId: string, groupId: string, avatarUrl: string): Promise<void> {
    try {
      // Find the user's membership record with detailed logging
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

      // Prepare update payload with logging
      const updatePayload = avatarUrl.trim() === '' 
        ? { avatarUrl: null } 
        : { avatarUrl: avatarUrl };

      // Perform the update
      const updatedMembership = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membership.$id,
        updatePayload
      );
      
    } catch (error) {
      throw new Error('Failed to update user avatar');
    }
  }

  // Sync user avatar to current group membership with fallback handling
  async syncCurrentUserAvatar(userId: string, groupId: string): Promise<void> {
    try {
      // Get user profile
      const { userProfileService } = await import('../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      if (!userProfile?.avatarUri) {
        return;
      }

      let avatarUrl = userProfile.avatarUri;
      
      // Try to upload if it's a local file, but don't fail if upload doesn't work
      if (userProfile.avatarUri.startsWith('file://')) {
        try {
          // Upload to Appwrite storage
          const { avatarUploadService } = await import('../services/avatarUploadService');
          const canUpload = await avatarUploadService.testUploadCapability();
          
          if (canUpload) {
            avatarUrl = await avatarUploadService.uploadAvatar(userProfile.avatarUri, userId);
            
            // Update the user profile with the cloud URL
            const updatedProfile = { ...userProfile, avatarUri: avatarUrl };
            await userProfileService.saveUserProfile(updatedProfile);
          }
          
        } catch (uploadError: any) {
          // Continue with local URL as fallback
        }
      }

      // Update the user's avatar in this group's membership
      await this.updateUserAvatar(userId, groupId, avatarUrl);
      
    } catch (error: any) {
      // Don't throw - this is non-critical
    }
  }

  // Test avatar display capabilities
  async testAvatarDisplay(userId: string, groupId: string): Promise<void> {
    try {
      // 1. Check user profile
      const { userProfileService } = await import('../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      if (userProfile?.avatarUri) {
        // Test if the avatar file exists (for local files)
        if (userProfile.avatarUri.startsWith('file://')) {
          const fileInfo = await FileSystem.getInfoAsync(userProfile.avatarUri);
        }
      }
      
      // 2. Check group membership
      const members = await this.getGroupMembers(groupId);
      const currentUserMember = members.find(m => m.userId === userId);
      
      // 3. Test upload service
      try {
        const { avatarUploadService } = await import('../services/avatarUploadService');
        const canUpload = await avatarUploadService.testUploadCapability();
      } catch (serviceError: any) {
        // Handle error
      }
      
    } catch (error: any) {
      // Handle error
    }
  }

  // FIXED: Get user streaks with proper calculation - TODO #3
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

  // FIXED: Calculate streak for a single user - TODO #3
  private calculateUserStreak(userEntries: any[]): { currentStreak: number; lastActiveDate: string } {
    if (userEntries.length === 0) {
      return { currentStreak: 0, lastActiveDate: '' };
    }

    // Sort entries by date (most recent first)
    const sortedEntries = userEntries.sort((a, b) => b.date.localeCompare(a.date));
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Start checking from today and go backwards
    for (let i = 0; i < 365; i++) { // Limit to prevent infinite loops
      const dateString = checkDate.toISOString().split('T')[0];
      const hasEntryForDate = sortedEntries.some(entry => entry.date === dateString);
      
      if (hasEntryForDate) {
        currentStreak++;
      } else {
        // If we haven't found any entries yet and today is missing, that's okay
        // But if we've started counting and hit a gap, stop counting
        if (currentStreak > 0) {
          break;
        }
        // If today is missing but yesterday exists, we can still start counting from yesterday
        if (dateString === todayString) {
          // Continue to check yesterday
        } else {
          // No consecutive streak found
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

  // Get chat messages for a group
  async getChatMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.orderDesc('timestamp'),
          Query.limit(limit)
        ]
      );

      // Convert documents to ChatMessage format and reverse to show oldest first
      const messages = response.documents
        .map((doc: any) => ({
          id: doc.$id,
          userId: doc.userId,
          userName: doc.userName || 'Anonymous User',
          message: doc.message,
          timestamp: new Date(doc.timestamp || doc.$createdAt),
        }))
        .reverse();

      return messages;
    } catch (error) {
      return [];
    }
  }

  // Send a chat message
  async sendChatMessage(
    groupId: string, 
    userId: string, 
    userName: string, 
    message: string
  ): Promise<ChatMessage> {
    try {
      // Validate input
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 1000) {
        throw new Error('Message is too long (max 1000 characters)');
      }

      // Create timestamp for the message
      const timestamp = new Date().toISOString();

      // Create message in database
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        generateId(),
        {
          groupId: groupId,
          userId: userId,
          userName: userName,
          message: message.trim(),
          timestamp: timestamp,
        }
      );

      // Return formatted message
      const chatMessage: ChatMessage = {
        id: response.$id,
        userId: response.userId,
        userName: response.userName,
        message: response.message,
        timestamp: new Date(response.timestamp || response.$createdAt),
      };

      return chatMessage;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message || error}`);
    }
  }

  // Delete a chat message
  async deleteChatMessage(messageId: string, userId: string): Promise<void> {
    try {
      // First, get the message to verify ownership
      const message = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        messageId
      );

      // Check if the user owns this message
      if (message.userId !== userId) {
        throw new Error('You can only delete your own messages');
      }

      // Delete the message
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        messageId
      );
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message || error}`);
    }
  }

  // Subscribe to real-time chat updates (placeholder)
  subscribeToChat(groupId: string, callback: (message: ChatMessage) => void): () => void {
    return () => {};
  }
}

export const calendarService = new CalendarService();