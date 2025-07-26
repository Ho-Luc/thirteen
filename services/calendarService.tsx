import { databases, appwriteConfig, generateId, storage, Query } from '../lib/appwrite';
import { fixAvatarUrls } from '../utils/avatarUrlFixer';

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
      console.log('Fetching group members for groupId:', groupId);
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [Query.equal('groupId', groupId)]
      );

      console.log('Raw group members response:', response);

      const members = response.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        groupId: doc.groupId,
        userName: doc.name || doc.userName || 'Anonymous User', // Try both field names for compatibility
        avatarUrl: doc.avatarUrl,
        joinedAt: new Date(doc.joinedAt || doc.$createdAt),
      }));

      // Fix any truncated avatar URLs
      const membersWithFixedUrls = fixAvatarUrls(members);

      console.log('Processed group members:', membersWithFixedUrls);
      return membersWithFixedUrls;
    } catch (error) {
      console.error('Error in getGroupMembers:', error);
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
      console.error('Error fetching calendar entries:', error);
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
      console.log('🖼️ Updating user avatar in database...');
      console.log(`👤 User: ${userId}`);
      console.log(`🏷️ Group: ${groupId}`);
      console.log(`🔗 Avatar URL length: ${avatarUrl.length} characters`);
      
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
      console.log(`📝 Found membership record: ${membership.$id}`);

      // Update the membership record with the new avatar URL
      const updatePayload = avatarUrl.trim() === '' 
        ? { avatarUrl: null } // Remove avatar
        : { avatarUrl: avatarUrl }; // Set new avatar

      const updatedMembership = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membership.$id,
        updatePayload
      );

      console.log('✅ Avatar updated successfully in database');
      console.log(`📥 Stored URL: ${updatedMembership.avatarUrl || 'null'}`);
      console.log(`🔍 URL match: ${updatedMembership.avatarUrl === avatarUrl ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.error('❌ Failed to update user avatar:', error);
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

  // Get chat messages for a group - REAL DATABASE VERSION
  async getChatMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      console.log('Fetching chat messages for groupId:', groupId);
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.orderDesc('timestamp'), // Order by custom timestamp field
          Query.limit(limit)
        ]
      );

      console.log('Raw chat messages response:', response);

      // Convert documents to ChatMessage format and reverse to show oldest first
      const messages = response.documents
        .map((doc: any) => ({
          id: doc.$id,
          userId: doc.userId,
          userName: doc.userName || 'Anonymous User',
          message: doc.message,
          timestamp: new Date(doc.timestamp || doc.$createdAt), // Use custom timestamp or fallback to $createdAt
        }))
        .reverse(); // Reverse to show oldest messages first

      console.log('Processed chat messages:', messages);
      return messages;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      // Return empty array instead of throwing to prevent chat from breaking the whole calendar
      return [];
    }
  }

  // Send a chat message - REAL DATABASE VERSION
  async sendChatMessage(
    groupId: string, 
    userId: string, 
    userName: string, 
    message: string
  ): Promise<ChatMessage> {
    try {
      console.log('Sending chat message:', { groupId, userId, userName, message });

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
          timestamp: timestamp, // Add the required timestamp field
        }
      );

      console.log('Chat message created:', response);

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
      console.error('Error sending chat message:', error);
      throw new Error(`Failed to send message: ${error.message || error}`);
    }
  }

  // Delete a chat message - REAL DATABASE VERSION
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

      console.log('Chat message deleted:', messageId);
    } catch (error) {
      console.error('Error deleting chat message:', error);
      throw new Error(`Failed to delete message: ${error.message || error}`);
    }
  }

  // Get recent chat messages with pagination - REAL DATABASE VERSION
  async getRecentChatMessages(
    groupId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.orderDesc('timestamp'), // Order by custom timestamp field
          Query.limit(limit + 1), // Get one extra to check if there are more
          Query.offset(offset)
        ]
      );

      const hasMore = response.documents.length > limit;
      const documents = hasMore ? response.documents.slice(0, limit) : response.documents;

      const messages = documents
        .map((doc: any) => ({
          id: doc.$id,
          userId: doc.userId,
          userName: doc.userName || 'Anonymous User',
          message: doc.message,
          timestamp: new Date(doc.timestamp || doc.$createdAt), // Use custom timestamp or fallback
        }))
        .reverse(); // Reverse to show oldest first

      return { messages, hasMore };
    } catch (error) {
      console.error('Error fetching recent chat messages:', error);
      return { messages: [], hasMore: false };
    }
  }

  // Subscribe to real-time chat updates (if using Appwrite realtime)
  subscribeToChat(groupId: string, callback: (message: ChatMessage) => void): () => void {
    // This would require setting up Appwrite realtime subscriptions
    // For now, return a no-op unsubscribe function
    console.log('Real-time chat subscription not implemented yet');
    return () => {};
  }
}

export const calendarService = new CalendarService();