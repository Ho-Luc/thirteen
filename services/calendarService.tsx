// services/calendarService.tsx - Complete enhanced version with fixed avatar handling
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
      console.log('\n📋 GETTING GROUP MEMBERS WITH FIXED AVATAR HANDLING...');
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

      // Process each member with FIXED logging
      const members = response.documents.map((doc: any, index: number) => {
        console.log(`\n👤 Member ${index + 1}:`);
        console.log('  Document ID:', doc.$id);
        console.log('  User ID:', doc.userId);
        console.log('  User Name:', doc.name || doc.userName || 'NOT SET');
        console.log('  Avatar URL:', doc.avatarUrl || 'NOT SET');
        console.log('  Avatar URL Length:', doc.avatarUrl?.length || 0);
        console.log('  Joined At:', doc.joinedAt || doc.$createdAt);
        
        // FIXED: Better avatar analysis that doesn't incorrectly flag local files
        if (doc.avatarUrl) {
          const urlLength = doc.avatarUrl.length;
          const isLocalFile = doc.avatarUrl.startsWith('file://');
          const isCloudUrl = doc.avatarUrl.startsWith('http');
          
          console.log('  Avatar Analysis:');
          console.log(`    Length: ${urlLength} chars`);
          console.log(`    Type: ${isLocalFile ? 'Local File' : isCloudUrl ? 'Cloud URL' : 'Unknown'}`);
          
          // Only check for truncation on cloud URLs
          if (isCloudUrl) {
            const looksLikeTruncation = urlLength === 100 || 
                                       doc.avatarUrl.endsWith('projec') ||
                                       !doc.avatarUrl.includes('?project=');
            
            console.log(`    Truncated: ${looksLikeTruncation ? 'LIKELY ⚠️' : 'NO ✅'}`);
            
            if (looksLikeTruncation) {
              console.log('    🚨 POTENTIAL CLOUD URL TRUNCATION DETECTED');
              console.log('    💡 This avatar may not display correctly');
            }
          } else if (isLocalFile) {
            console.log('    Status: ✅ Local file - should display correctly');
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

      // Fix any truncated avatar URLs (this will now preserve local file URLs)
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

  // Get calendar entries for a specific week
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

  // Create a new calendar entry
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

  // Update an existing calendar entry
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
        }
      } else {
        console.log('✅ Avatar URL stored successfully with no truncation');
      }
      
    } catch (error) {
      console.error('\n❌ AVATAR UPDATE FAILED:');
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      
      throw new Error('Failed to update user avatar');
    }
  }

  // Sync user avatar to current group membership with fallback handling
  async syncCurrentUserAvatar(userId: string, groupId: string): Promise<void> {
    try {
      console.log('\n🖼️ SYNCING CURRENT USER AVATAR WITH FALLBACK...');
      console.log(`👤 User ID: ${userId}`);
      console.log(`🏷️ Group ID: ${groupId}`);
      
      // Get user profile
      const { userProfileService } = await import('../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      if (!userProfile?.avatarUri) {
        console.log('ℹ️ No avatar to sync - user has no avatar in profile');
        return;
      }

      console.log('🖼️ Found avatar to sync:', {
        avatarLength: userProfile.avatarUri.length,
        isLocalFile: userProfile.avatarUri.startsWith('file://'),
        avatarPreview: userProfile.avatarUri.substring(0, 50) + '...'
      });

      let avatarUrl = userProfile.avatarUri;
      
      // Try to upload if it's a local file, but don't fail if upload doesn't work
      if (userProfile.avatarUri.startsWith('file://')) {
        try {
          console.log('☁️ Attempting to upload local file to cloud storage...');
          
          // Test upload capability first
          const { avatarUploadService } = await import('../services/avatarUploadService');
          const canUpload = await avatarUploadService.testUploadCapability();
          
          if (canUpload) {
            console.log('✅ Upload capability confirmed, proceeding with upload...');
            avatarUrl = await avatarUploadService.uploadAvatar(userProfile.avatarUri, userId);
            console.log('✅ Avatar uploaded to cloud successfully');
            
            // Update the user profile with the cloud URL
            const updatedProfile = { ...userProfile, avatarUri: avatarUrl };
            await userProfileService.saveUserProfile(updatedProfile);
            console.log('✅ User profile updated with cloud URL');
            
          } else {
            console.log('⚠️ Upload not available, using local file as fallback');
            // Keep the local file URL as fallback
          }
          
        } catch (uploadError: any) {
          console.error('❌ Avatar upload failed:', uploadError.message);
          console.log('📝 Using local file URL as fallback');
          // Continue with local URL as fallback
        }
      } else {
        console.log('✅ Using existing cloud URL');
      }

      // Update the user's avatar in this group's membership
      console.log('📝 Updating group membership with avatar URL...');
      console.log(`🔗 Avatar URL to save: ${avatarUrl.substring(0, 80)}...`);
      
      await this.updateUserAvatar(userId, groupId, avatarUrl);
      console.log('✅ Avatar synced to group membership successfully');
      
    } catch (error: any) {
      console.error('❌ Avatar sync failed:', error.message);
      console.log('📝 Continuing without avatar sync');
      // Don't throw - this is non-critical
    }
  }

  // Test avatar display capabilities
  async testAvatarDisplay(userId: string, groupId: string): Promise<void> {
    try {
      console.log('\n🧪 TESTING AVATAR DISPLAY...');
      
      // 1. Check user profile
      const { userProfileService } = await import('../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      console.log('👤 User Profile Check:');
      console.log(`Has Profile: ${!!userProfile}`);
      console.log(`Has Avatar: ${!!userProfile?.avatarUri}`);
      console.log(`Avatar URI: ${userProfile?.avatarUri || 'NONE'}`);
      
      if (userProfile?.avatarUri) {
        // Test if the avatar file exists (for local files)
        if (userProfile.avatarUri.startsWith('file://')) {
          const fileInfo = await FileSystem.getInfoAsync(userProfile.avatarUri);
          console.log(`Local File Exists: ${fileInfo.exists}`);
          console.log(`File Size: ${'size' in fileInfo ? fileInfo.size : 'unknown'}`);
        }
      }
      
      // 2. Check group membership
      const members = await this.getGroupMembers(groupId);
      const currentUserMember = members.find(m => m.userId === userId);
      
      console.log('👥 Group Membership Check:');
      console.log(`Found Member: ${!!currentUserMember}`);
      console.log(`Member Avatar: ${currentUserMember?.avatarUrl || 'NONE'}`);
      
      // 3. Test upload service
      try {
        const { avatarUploadService } = await import('../services/avatarUploadService');
        const canUpload = await avatarUploadService.testUploadCapability();
        console.log(`Upload Service Available: ${canUpload}`);
      } catch (serviceError: any) {
        console.log(`Upload Service Error: ${serviceError.message}`);
      }
      
      console.log('✅ Avatar display test completed');
      
    } catch (error: any) {
      console.error('❌ Avatar display test failed:', error);
    }
  }

  // Get user streaks
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

  // Get chat messages for a group
  async getChatMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      console.log(`💬 Fetching chat messages for group ${groupId} (limit: ${limit})`);
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.orderDesc('timestamp'),
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
          timestamp: new Date(doc.timestamp || doc.$createdAt),
        }))
        .reverse();

      return messages;
    } catch (error) {
      console.error('❌ Error fetching chat messages:', error);
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
          timestamp: timestamp,
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

      console.log(`🗑️ Chat message deleted: ${messageId}`);
    } catch (error) {
      console.error('❌ Error deleting chat message:', error);
      throw new Error(`Failed to delete message: ${error.message || error}`);
    }
  }

  // Subscribe to real-time chat updates (placeholder)
  subscribeToChat(groupId: string, callback: (message: ChatMessage) => void): () => void {
    console.log('ℹ️ Real-time chat subscription not implemented yet');
    return () => {};
  }
}

export const calendarService = new CalendarService();