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

export interface UserStats {
  currentStreak: number;
  totalCompleted: number;
  lastActiveDate: string;
  monthCompleted: number;
  longestStreak: number;
}

class CalendarService {
  // Consistent date formatting to avoid timezone issues
  private formatDateConsistently(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getGroupDataBundle(groupId: string, currentWeek: Date[]): Promise<{
    members: GroupMember[];
    weeklyEntries: CalendarEntry[];
    chatMessages: ChatMessage[];
  }> {
    try {
      const startDate = this.formatDateConsistently(currentWeek[0]);
      const endDate = this.formatDateConsistently(currentWeek[6]);

      // Execute all queries in parallel instead of sequentially
      const [membersResponse, weeklyEntriesResponse, chatResponse] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          [Query.equal('groupId', groupId)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.calendarEntriesCollectionId,
          [
            Query.equal('groupId', groupId),
            Query.greaterThanEqual('date', startDate),
            Query.lessThanEqual('date', endDate)
          ]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatMessagesCollectionId,
          [
            Query.equal('groupId', groupId),
            Query.orderDesc('timestamp'),
            Query.limit(50)
          ]
        )
      ]);

      const members = membersResponse.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        groupId: doc.groupId,
        userName: doc.name || doc.userName || 'Anonymous User',
        avatarUrl: doc.avatarUrl,
        joinedAt: new Date(doc.joinedAt || doc.$createdAt),
      }));

      const weeklyEntries = weeklyEntriesResponse.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        groupId: doc.groupId,
        date: doc.date,
        completed: doc.completed,
        createdAt: new Date(doc.$createdAt),
      }));

      const chatMessages = chatResponse.documents
        .map((doc: any) => ({
          id: doc.$id,
          userId: doc.userId,
          userName: doc.userName || 'Anonymous User',
          message: doc.message,
          timestamp: new Date(doc.timestamp || doc.$createdAt),
        }))
        .reverse();

      return {
        members: fixAvatarUrls(members),
        weeklyEntries,
        chatMessages,
      };
    } catch (error) {
      throw new Error('Failed to fetch group data bundle');
    }
  }

  async getUserDataBundle(userId: string, groupId: string): Promise<{
    stats: UserStats;
    streaks: UserStreak[];
  }> {
    try {
      const userEntriesResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.equal('userId', userId),
          Query.equal('completed', true),
          Query.orderDesc('date'),
          Query.limit(500) // Reasonable limit - covers ~1.4 years of daily entries
        ]
      );

      const userEntries = userEntriesResponse.documents.map((doc: any) => ({
        id: doc.$id,
        userId: doc.userId,
        groupId: doc.groupId,
        date: doc.date,
        completed: doc.completed,
        createdAt: new Date(doc.$createdAt),
      }));

      // Calculate stats from the retrieved data
      const stats = this.calculateStatsFromEntries(userEntries);

      // For streaks of all users, we need a separate optimized query
      const allStreaksResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.equal('completed', true),
          Query.orderDesc('date'),
          Query.limit(1000) // Get recent entries for all users
        ]
      );

      const streaks = this.calculateAllUserStreaks(allStreaksResponse.documents);

      return { stats, streaks };
    } catch (error) {
      throw new Error('Failed to fetch user data bundle');
    }
  }

  async getUserMonthlyEntriesPaginated(
    userId: string, 
    groupId: string, 
    year: number, 
    month: number
  ): Promise<CalendarEntry[]> {
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      // Use pagination for large datasets
      let allEntries: CalendarEntry[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.calendarEntriesCollectionId,
          [
            Query.equal('groupId', groupId),
            Query.equal('userId', userId),
            Query.greaterThanEqual('date', startDate),
            Query.lessThanEqual('date', endDate),
            Query.orderAsc('date'),
            Query.limit(limit),
            Query.offset(offset)
          ]
        );

        const entries = response.documents.map((doc: any) => ({
          id: doc.$id,
          userId: doc.userId,
          groupId: doc.groupId,
          date: doc.date,
          completed: doc.completed,
          createdAt: new Date(doc.$createdAt),
        }));

        allEntries = [...allEntries, ...entries];
        
        hasMore = entries.length === limit;
        offset += limit;

        // Safety break to prevent infinite loops
        if (offset > 1000) break;
      }

      return allEntries;
    } catch (error) {
      throw new Error('Failed to fetch monthly entries');
    }
  }

  async batchUpdateCalendarEntries(updates: Array<{
    entryId?: string;
    userId: string;
    groupId: string;
    date: string;
    completed: boolean;
  }>): Promise<CalendarEntry[]> {
    try {
      const results = await Promise.allSettled(
        updates.map(async (update) => {
          if (update.entryId) {
            // Update existing entry
            return await databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.calendarEntriesCollectionId,
              update.entryId,
              { completed: update.completed }
            );
          } else {
            // Create new entry
            return await databases.createDocument(
              appwriteConfig.databaseId,
              appwriteConfig.calendarEntriesCollectionId,
              generateId(),
              {
                userId: update.userId,
                groupId: update.groupId,
                date: update.date,
                completed: update.completed
              }
            );
          }
        })
      );

      return results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => ({
          id: result.value.$id,
          userId: result.value.userId,
          groupId: result.value.groupId,
          date: result.value.date,
          completed: result.value.completed,
          createdAt: new Date(result.value.$createdAt),
        }));
    } catch (error) {
      throw new Error('Failed to batch update calendar entries');
    }
  }

  private calculateStatsFromEntries(entries: CalendarEntry[]): UserStats {
    const currentStreak = this.calculateStreakOptimized(entries);
    const longestStreak = this.calculateLongestStreak(entries);
    const totalCompleted = entries.length;
    const lastActiveDate = entries.length > 0 ? entries[0].date : '';
    
    // Calculate current month completed
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const monthCompleted = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
    }).length;

    return {
      currentStreak,
      longestStreak,
      totalCompleted,
      lastActiveDate,
      monthCompleted,
    };
  }

  private calculateAllUserStreaks(allEntries: any[]): UserStreak[] {
    const userEntryMap = new Map<string, any[]>();
    
    // Group entries by user
    allEntries.forEach(entry => {
      if (!userEntryMap.has(entry.userId)) {
        userEntryMap.set(entry.userId, []);
      }
      userEntryMap.get(entry.userId)!.push(entry);
    });

    // Calculate streak for each user
    const streaks: UserStreak[] = [];
    userEntryMap.forEach((entries, userId) => {
      const streak = this.calculateUserStreak(entries);
      streaks.push({
        userId,
        currentStreak: streak.currentStreak,
        lastActiveDate: streak.lastActiveDate,
      });
    });

    return streaks;
  }

  private calculateLongestStreak(completedEntries: CalendarEntry[]): number {
    if (completedEntries.length === 0) return 0;

    const completedDates = completedEntries
      .filter(entry => entry.completed)
      .map(entry => entry.date)
      .sort();

    if (completedDates.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < completedDates.length; i++) {
      const currentDate = new Date(completedDates[i]);
      const previousDate = new Date(completedDates[i - 1]);
      
      const diffTime = currentDate.getTime() - previousDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);
    return longestStreak;
  }

  private calculateStreakOptimized(completedEntries: CalendarEntry[]): number {
    if (completedEntries.length === 0) return 0;

    const today = new Date();
    const completedDates = new Set(
      completedEntries
        .filter(entry => entry.completed)
        .map(entry => entry.date)
    );

    let streak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const dateString = this.formatDateConsistently(checkDate);
      
      if (completedDates.has(dateString)) {
        streak++;
      } else {
        break;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return streak;
  }

  private calculateUserStreak(userEntries: any[]): { currentStreak: number; lastActiveDate: string } {
    if (userEntries.length === 0) {
      return { currentStreak: 0, lastActiveDate: '' };
    }

    const today = new Date();
    const completedDates = new Set(userEntries.map(entry => entry.date));
    
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
      const dateString = this.formatDateConsistently(checkDate);
      
      if (completedDates.has(dateString)) {
        currentStreak++;
      } else {
        break;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      currentStreak,
      lastActiveDate: userEntries.length > 0 ? userEntries.sort((a, b) => b.date.localeCompare(a.date))[0].date : '',
    };
  }

  private getCurrentWeek(): Date[] {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  }

  async getUserEntriesForDateRange(
    userId: string, 
    groupId: string, 
    startDate: string, 
    endDate: string
  ): Promise<CalendarEntry[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.equal('userId', userId),
          Query.greaterThanEqual('date', startDate),
          Query.lessThanEqual('date', endDate),
          Query.orderAsc('date')
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
      throw new Error('Failed to fetch user calendar entries');
    }
  }

  async getUserMonthlyEntries(
    userId: string, 
    groupId: string, 
    year: number, 
    month: number
  ): Promise<CalendarEntry[]> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    return this.getUserEntriesForDateRange(userId, groupId, startDate, endDate);
  }

  async getUserAllCompletedEntries(userId: string, groupId: string): Promise<CalendarEntry[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.calendarEntriesCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.equal('userId', userId),
          Query.equal('completed', true),
          Query.orderDesc('date'),
          Query.limit(1000)
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
      return [];
    }
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const bundle = await this.getGroupDataBundle(groupId, this.getCurrentWeek());
    return bundle.members;
  }

  async getCalendarEntries(groupId: string, weekDates: Date[]): Promise<CalendarEntry[]> {
    const bundle = await this.getGroupDataBundle(groupId, weekDates);
    return bundle.weeklyEntries;
  }

  async getChatMessages(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    const bundle = await this.getGroupDataBundle(groupId, this.getCurrentWeek());
    return bundle.chatMessages;
  }

  async getUserStats(userId: string, groupId: string): Promise<UserStats> {
    const bundle = await this.getUserDataBundle(userId, groupId);
    return bundle.stats;
  }

  async getUserStreaks(groupId: string): Promise<UserStreak[]> {
    // This is less efficient but kept for compatibility
    const currentWeek = this.getCurrentWeek();
    const bundle = await this.getGroupDataBundle(groupId, currentWeek);
    const userBundle = await this.getUserDataBundle(bundle.members[0]?.userId || '', groupId);
    return userBundle.streaks;
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

  // Update user avatar
  async updateUserAvatar(userId: string, groupId: string, avatarUrl: string): Promise<void> {
    try {
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
      const updatePayload = avatarUrl.trim() === '' 
        ? { avatarUrl: null } 
        : { avatarUrl: avatarUrl };

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        membership.$id,
        updatePayload
      );
      
    } catch (error) {
      throw new Error('Failed to update user avatar');
    }
  }

  // Sync user avatar to current group membership
  async syncCurrentUserAvatar(userId: string, groupId: string): Promise<void> {
    try {
      const { userProfileService } = await import('../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      if (!userProfile?.avatarUri) {
        return;
      }

      let avatarUrl = userProfile.avatarUri;
      
      if (userProfile.avatarUri.startsWith('file://')) {
        try {
          const { avatarUploadService } = await import('../services/avatarUploadService');
          const canUpload = await avatarUploadService.testUploadCapability();
          
          if (canUpload) {
            avatarUrl = await avatarUploadService.uploadAvatar(userProfile.avatarUri, userId);
            const updatedProfile = { ...userProfile, avatarUri: avatarUrl };
            await userProfileService.saveUserProfile(updatedProfile);
          }
        } catch (uploadError: any) {
          // Continue with local URL as fallback
        }
      }

      await this.updateUserAvatar(userId, groupId, avatarUrl);
    } catch (error: any) {
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
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 1000) {
        throw new Error('Message is too long (max 1000 characters)');
      }

      const timestamp = new Date().toISOString();

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
      const message = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatMessagesCollectionId,
        messageId
      );

      if (message.userId !== userId) {
        throw new Error('You can only delete your own messages');
      }

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