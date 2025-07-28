// services/calendarService.tsx - Complete enhanced version with logging
import { databases, appwriteConfig, generateId, storage, Query } from '../lib/appwrite';
import { fixAvatarUrls } from '../utils/avatarUrlFixer';
import { AvatarLoggingService } from './avatarLoggingService';

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
      console.log('\n📋 GETTING GROUP MEMBERS WITH ENHANCED LOGGING...');
      console.log('🏷️ Group ID:', groupId);
      console.log('🗃️ Collection:', appwriteConfig.groupMembersCollectionId);
      console.log('🗃️ Database:', appwriteConfig.databaseId);
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [Query.equal('groupId', groupId)]
      );

      console.log(`📊 Query returned ${response.documents.length} members`);

      if (response.documents.length === 0) {
        console.log('⚠️ No group members found for this group');
        return [];
      }

      // Process each member with detailed logging
      const members = response.documents.map((doc: any, index: number) => {
        console.log(`\n👤 Member ${index + 1}:`);
        console.log('  Document ID:', doc.$id);
        console.log('  User ID:', doc.userId);
        console.log('  User Name:', doc.name || doc.userName || 'NOT SET');
        console.log('  Avatar URL:', doc.avatarUrl || 'NOT SET');
        console.log('  Avatar URL Length:', doc.avatarUrl?.length || 0);
        console.log('  Joined At:', doc.joinedAt || doc.$createdAt);
        
        // Analyze avatar URL if present
        if (doc.avatarUrl) {
          const urlLength = doc.avatarUrl.length;
          const looksLikeTruncation = urlLength === 100 || 
                                     doc.avatarUrl.endsWith('projec') ||
                                     !doc.avatarUrl.includes('?project=');
          
          console.log('  Avatar Analysis:');
          console.log(`    Length: ${urlLength} chars`);
          console.log(`    Truncated: ${looksLikeTruncation ? 'LIKELY ⚠️' : 'NO ✅'}`);
          
          if (looksLikeTruncation) {
            console.log('    🚨 POTENTIAL TRUNCATION DETECTED');
            console.log('    💡 This avatar may not display correctly');
          }
        }

        return {
          id: doc.$id,
          userId: doc.userId,
          groupId: doc.groupId,
          userName: doc.name || doc.userName || 'Anonymous User',
          avatarUrl: doc.avatarUrl,
          joinedAt: new Date(doc.joinedAt || doc.$createdAt),
        };
      });

      // Fix any truncated avatar URLs
      const membersWithFixedUrls = fixAvatarUrls(members);

      console.log('\n✅ Group members processing completed');
      console.log(`📊 Total members: ${membersWithFixedUrls.length}`);
      console.log(`🖼️ Members with avatars: ${membersWithFixedUrls.filter(m => m.avatarUrl).length}`);
      
      return membersWithFixedUrls;
    } catch (error) {
      console.error('\n❌ Error in getGroupMembers:', error);
      console.error('🏷️ Group ID:', groupId);
      console.error('🗃️ Collection:', appwriteConfig.groupMembersCollectionId);
      throw new Error('Failed to fetch group members');
    }
  }

  // Get calendar entries for a specific week - REAL DATABASE VERSION
  async getCalendarEntries(groupId: string, weekDates: Date[]): Promise<CalendarEntry[]> {
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      console.log(`📅 Fetching calendar entries for ${startDate} to ${endDate}`);

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.greaterThanEqual('date', startDate),
          Query.lessThanEqual('date', endDate)
        ]
      );

      console.log(`📊 Found ${response.documents.length} calendar entries`);

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
      console.log('📝 Creating calendar entry:', entryData);

      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        generateId(),
        entryData
      );

      console.log('✅ Calendar entry created:', response.$id);

      return {
        id: response.$id,
        userId: response.userId,
        groupId: response.groupId,
        date: response.date,
        completed: response.completed,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
      console.error('❌ Failed to create calendar entry:', error);
      throw new Error('Failed to create calendar entry');
    }
  }

  // Update an existing calendar entry - REAL DATABASE VERSION
  async updateCalendarEntry(entryId: string, completed: boolean): Promise<CalendarEntry> {
    try {
      console.log(`🔄 Updating calendar entry ${entryId} to completed: ${completed}`);

      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        entryId,
        { completed }
      );

      console.log('✅ Calendar entry updated successfully');

      return {
        id: response.$id,
        userId: response.userId,
        groupId: response.groupId,
        date: response.date,
        completed: response.completed,
        createdAt: new Date(response.$createdAt),
      };
    } catch (error) {
      console.error('❌ Failed to update calendar entry:', error);
      throw new Error('Failed to update calendar entry');
    }
  }

  // Enhanced updateUserAvatar with comprehensive logging
  async updateUserAvatar(userId: string, groupId: string, avatarUrl: string): Promise<void> {
    console.log('\n🖼️ ENHANCED AVATAR UPDATE WITH COMPREHENSIVE LOGGING...');
    console.log(`👤 User ID: ${userId}`);
    console.log(`🏷️ Group ID: ${groupId}`);
    console.log(`🔗 New Avatar URL: ${avatarUrl}`);
    console.log(`📏 URL Length: ${avatarUrl.length} characters`);
    console.log(`🗃️ Target Database: ${appwriteConfig.databaseId}`);
    console.log(`🗃️ Target Collection: ${appwriteConfig.groupMembersCollectionId}`);
    
    // Log the current state before update
    console.log('\n📋 INSPECTING CURRENT STATE BEFORE UPDATE...');
    await AvatarLoggingService.inspectMemberAvatar(userId, groupId);
    
    try {
      console.log('\n🔍 FINDING MEMBERSHIP RECORD...');
      
      // Find the user's membership record with detailed logging
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('groupId', groupId)
        ]
      );

      console.log(`📊 Query returned ${response.documents.length} documents`);
      
      if (response.documents.length === 0) {
        console.log('❌ No membership record found');
        throw new Error('User membership not found');
      }

      if (response.documents.length > 1) {
        console.log(`⚠️ Multiple membership records found (${response.documents.length}), using first one`);
      }

      const membership = response.documents[0];
      console.log(`📝 Found membership record: ${membership.$id}`);
      console.log(`📋 Current avatar URL: ${membership.avatarUrl || 'NONE'}`);
      console.log(`📏 Current URL length: ${membership.avatarUrl?.length || 0} chars`);

      // Prepare update payload with logging
      console.log('\n📤 PREPARING UPDATE PAYLOAD...');
      const updatePayload = avatarUrl.trim() === '' 
        ? { avatarUrl: null } 
        : { avatarUrl: avatarUrl };
      
      console.log('Update payload:', updatePayload);
      console.log('Payload avatar URL length:', updatePayload.avatarUrl?.length || 0);

      // Perform the update
      console.log('\n🔄 EXECUTING DATABASE UPDATE...');
      const updatedMembership = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membership.$id,
        updatePayload
      );

      console.log('\n✅ DATABASE UPDATE COMPLETED');
      console.log(`📥 Stored avatar URL: ${updatedMembership.avatarUrl || 'NULL'}`);
      console.log(`📏 Stored URL length: ${updatedMembership.avatarUrl?.length || 0} chars`);
      
      // Verify the update was successful
      const expectedUrl = avatarUrl.trim() === '' ? null : avatarUrl;
      const actualUrl = updatedMembership.avatarUrl;
      const urlsMatch = actualUrl === expectedUrl;
      
      console.log(`🔍 Update verification: ${urlsMatch ? 'SUCCESS ✅' : 'MISMATCH ❌'}`);
      
      if (!urlsMatch) {
        console.log('\n🚨 MISMATCH ANALYSIS:');
        console.log(`📤 Expected: "${expectedUrl}" (${expectedUrl?.length || 0} chars)`);
        console.log(`📥 Actual: "${actualUrl}" (${actualUrl?.length || 0} chars)`);
        
        // Check for truncation
        if (expectedUrl && actualUrl && expectedUrl.startsWith(actualUrl)) {
          console.log('🔍 TRUNCATION DETECTED: URL was cut off during database storage');
          console.log(`📏 ACTUAL FIELD LIMIT: ${actualUrl.length} characters`);
          console.log('💡 SOLUTION: Increase avatarUrl field size in Appwrite Console');
          
          // Test the actual field capacity
          console.log('\n🧪 Testing actual field capacity to confirm...');
          await AvatarLoggingService.testActualFieldCapacity();
        } else if (expectedUrl && !actualUrl) {
          console.log('🔍 URL was completely rejected or set to null');
        } else {
          console.log('🔍 Unknown mismatch type - URLs don\'t match expected patterns');
        }
      } else {
        console.log('✅ Avatar URL stored successfully with no truncation');
      }
      
      // Final state inspection
      console.log('\n📋 FINAL STATE INSPECTION AFTER UPDATE...');
      await AvatarLoggingService.inspectMemberAvatar(userId, groupId);
      
    } catch (error) {
      console.error('\n❌ AVATAR UPDATE FAILED:');
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      
      // Try to provide helpful debugging information
      if (error.message.includes('100') || error.message.includes('too long')) {
        console.log('\n💡 ERROR ANALYSIS:');
        console.log('This error suggests the avatarUrl field is still limited to 100 characters');
        console.log('Actions to take:');
        console.log('1. Verify in Appwrite Console that the field size was actually updated');
        console.log('2. Check if you have multiple avatarUrl attributes');
        console.log('3. Restart Appwrite if using local instance');
        console.log('4. Clear browser cache if using Appwrite Cloud');
      }
      
      throw new Error('Failed to update user avatar');
    }
  }

  // Get user streaks - REAL DATABASE VERSION
  async getUserStreaks(groupId: string): Promise<UserStreak[]> {
    try {
      console.log(`📊 Calculating user streaks for group ${groupId}`);

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

      console.log(`📈 Found ${response.documents.length} completed entries`);

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

        console.log(`🔥 ${member.userName}: ${streak.currentStreak} day streak`);
      }

      return userStreaks;
    } catch (error) {
      console.error('❌ Failed to calculate user streaks:', error);
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

  // Upload and compress image file - REAL STORAGE VERSION
  async uploadAndCompressImage(imageUri: string, fileName: string): Promise<string> {
    try {
      console.log(`📤 Uploading image: ${fileName}`);
      
      // Convert URI to File object for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload to Appwrite storage
      const uploadResponse = await storage.createFile(
        appwriteConfig.avatarBucketId,
        generateId(),
        blob
      );

      console.log(`✅ Image uploaded with ID: ${uploadResponse.$id}`);

      // Return the file URL
      const fileUrl = storage.getFileView(appwriteConfig.avatarBucketId, uploadResponse.$id);
      const urlString = fileUrl.toString();
      
      console.log(`🔗 Generated URL: ${urlString} (${urlString.length} chars)`);
      
      return urlString;
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Delete old avatar when updating - REAL STORAGE VERSION
  async deleteOldAvatar(oldAvatarUrl: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting old avatar: ${oldAvatarUrl}`);
      
      // Extract file ID from URL
      const urlParts = oldAvatarUrl.split('/');
      const fileId = urlParts[urlParts.length - 1];
      
      await storage.deleteFile(appwriteConfig.avatarBucketId, fileId);
      console.log('✅ Old avatar deleted successfully');
    } catch (error) {
      // Don't throw error for old avatar deletion to avoid blocking new avatar upload
      console.warn('⚠️ Failed to delete old avatar:', error);
    }
  }

  // Get chat messages for a group - REAL DATABASE VERSION
  async getChatMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      console.log(`💬 Fetching chat messages for group ${groupId} (limit: ${limit})`);
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.orderDesc('timestamp'), // Order by custom timestamp field
          Query.limit(limit)
        ]
      );

      console.log(`📊 Found ${response.documents.length} chat messages`);

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

      return messages;
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
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
      console.log(`💬 Sending chat message from ${userName}: "${message.substring(0, 50)}..."`);

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

      console.log(`✅ Chat message created: ${response.$id}`);

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
      console.error('❌ Error sending chat message:', error);
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

      console.log(`🗑️ Chat message deleted: ${messageId}`);
    } catch (error) {
      console.error('❌ Error deleting chat message:', error);
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
      console.error('❌ Error fetching recent chat messages:', error);
      return { messages: [], hasMore: false };
    }
  }

  // Subscribe to real-time chat updates (if using Appwrite realtime)
  subscribeToChat(groupId: string, callback: (message: ChatMessage) => void): () => void {
    // This would require setting up Appwrite realtime subscriptions
    // For now, return a no-op unsubscribe function
    console.log('ℹ️ Real-time chat subscription not implemented yet');
    return () => {};
  }
}

export const calendarService = new CalendarService();