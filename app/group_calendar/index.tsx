// app/group_calendar/index.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { calendarService } from '../../services/calendarService';
import { userService } from '../../services/userService';
import { groupsService } from '../../services/groupsService';
import { avatarUploadService } from '../../services/avatarUploadService';
import UserAvatarPicker from '../../components/calendar/userAvatarPicker';
import WeekHeader from '../../components/calendar/weekHeader';
import UserCalendarRow from '../../components/calendar/userCalendarRow';
import ChatWindow from '../../components/calendar/chatWindow';

interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  userName: string;
  avatarUrl?: string;
  joinedAt: Date;
}

interface CalendarEntry {
  id: string;
  userId: string;
  groupId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  createdAt: Date;
}

interface UserStreak {
  userId: string;
  currentStreak: number;
  lastActiveDate: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

const GroupCalendar = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName: string }>();
  
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  // Get screen dimensions
  const screenHeight = Dimensions.get('window').height;
  const chatHeight = screenHeight * 0.33; // 33% of screen height

  // Get current week dates
  const getCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay); // Start from Sunday
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    return week;
  };

  // Get current date in a nice format
  const getCurrentDateString = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentWeek = getCurrentWeek();

  useEffect(() => {
    initializeCalendar();
  }, [params.groupId]);

  const initializeCalendar = async () => {
    try {
      setIsLoading(true);
      
      // First, get the current user ID
      const userId = await userService.getOrCreateUserId();
      setCurrentUserId(userId);
      console.log('Current user ID:', userId);

      // Sync user profile to all groups (this will update user names)
      await groupsService.syncUserProfileToAllGroups(userId);

      // Get group information to see who created it
      const group = await groupsService.getGroup(params.groupId);
      setGroupInfo(group);
      console.log('Group info:', group);
      
      // Load all group data
      await Promise.all([
        loadGroupMembers(userId),
        loadCalendarEntries(),
        loadUserStreaks(),
        loadChatMessages()
      ]);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load calendar data');
      console.error('Calendar initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupMembers = async (userId: string) => {
    try {
      console.log('Loading group members for group:', params.groupId);
      
      // Get all group members from the database
      const members = await calendarService.getGroupMembers(params.groupId);
      console.log('Found group members:', members);
      
      setGroupMembers(members);
      
      // Find current user's name from the group members
      const currentUser = members.find(member => member.userId === userId);
      if (currentUser) {
        setCurrentUserName(currentUser.userName);
        console.log('Current user name:', currentUser.userName);
      } else {
        console.warn('Current user not found in group members');
        setCurrentUserName('You');
      }
      
      if (members.length === 0) {
        console.warn('No group members found for group:', params.groupId);
      }
      
    } catch (error) {
      console.error('Error loading group members:', error);
      setGroupMembers([]); // Set empty array on error
      Alert.alert('Error', 'Failed to load group members');
    }
  };

  const loadCalendarEntries = async () => {
    try {
      const entries = await calendarService.getCalendarEntries(params.groupId, currentWeek);
      setCalendarEntries(entries);
      console.log('Loaded calendar entries:', entries.length);
    } catch (error) {
      console.error('Error loading calendar entries:', error);
    }
  };

  const loadUserStreaks = async () => {
    try {
      const streaks = await calendarService.getUserStreaks(params.groupId);
      setUserStreaks(streaks);
      console.log('Loaded user streaks:', streaks);
    } catch (error) {
      console.error('Error loading user streaks:', error);
    }
  };

  const loadChatMessages = async () => {
    try {
      console.log('Loading chat messages for group:', params.groupId);
      const messages = await calendarService.getChatMessages(params.groupId);
      setChatMessages(messages);
      console.log('Loaded chat messages:', messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      // Don't show alert for chat errors, just log them
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const toggleDay = async (userId: string, date: Date) => {
    // Only allow users to edit their own row
    if (userId !== currentUserId) {
      Alert.alert('Permission Denied', 'You can only edit your own calendar entries');
      return;
    }

    try {
      const dateString = formatDate(date);
      const existingEntry = calendarEntries.find(
        entry => entry.userId === userId && entry.date === dateString
      );

      if (existingEntry) {
        // Toggle existing entry
        const updatedEntry = await calendarService.updateCalendarEntry(
          existingEntry.id,
          !existingEntry.completed
        );
        
        setCalendarEntries(prev => 
          prev.map(entry => 
            entry.id === existingEntry.id ? updatedEntry : entry
          )
        );
      } else {
        // Create new entry
        const newEntry = await calendarService.createCalendarEntry({
          userId,
          groupId: params.groupId,
          date: dateString,
          completed: true
        });
        
        setCalendarEntries(prev => [...prev, newEntry]);
      }

      // Recalculate streaks
      await loadUserStreaks();
      
    } catch (error) {
      Alert.alert('Error', 'Failed to update calendar entry');
      console.error('Toggle day error:', error);
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    try {
      // Check if this is a local file URL that needs uploading
      if (avatarUrl.startsWith('file://')) {
        console.log('🔄 Uploading local avatar to cloud storage...');
        
        // Upload to Appwrite storage
        const cloudUrl = await avatarUploadService.uploadAvatar(avatarUrl, currentUserId);
        console.log('☁️ Avatar uploaded successfully:', cloudUrl);
        console.log(`🔗 Cloud URL length: ${cloudUrl.length} characters`);
        
        // Update calendar service with cloud URL
        await calendarService.updateUserAvatar(currentUserId, params.groupId, cloudUrl);
        console.log('✅ Avatar URL saved to database');
      } else if (avatarUrl === '') {
        // Remove avatar
        await calendarService.updateUserAvatar(currentUserId, params.groupId, '');
        console.log('🗑️ Avatar removed from database');
      } else {
        // Direct URL update (shouldn't happen with current flow, but good fallback)
        await calendarService.updateUserAvatar(currentUserId, params.groupId, avatarUrl);
        console.log('✅ Avatar URL updated in database');
      }
      
      await loadGroupMembers(currentUserId);
      setShowAvatarPicker(false);
      
      console.log('🎉 Avatar update process completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar');
      console.error('Avatar update error:', error);
    }
  };

  const getUserEntry = (userId: string, date: Date): CalendarEntry | undefined => {
    const dateString = formatDate(date);
    return calendarEntries.find(
      entry => entry.userId === userId && entry.date === dateString
    );
  };

  const getUserStreak = (userId: string): number => {
    const streak = userStreaks.find(s => s.userId === userId);
    return streak?.currentStreak || 0;
  };

  const getDayCompletionData = (date: Date) => {
    const dateString = formatDate(date);
    const completedCount = groupMembers.filter(member => {
      const entry = calendarEntries.find(
        e => e.userId === member.userId && e.date === dateString
      );
      return entry?.completed || false;
    }).length;
    
    const totalMembers = groupMembers.length;
    const percentage = totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0;
    
    return {
      completedCount,
      totalMembers,
      percentage,
      isFullyComplete: completedCount === totalMembers && totalMembers > 0
    };
  };

  // Temporary debug function to manually sync avatars
  const handleManualAvatarSync = async () => {
    try {
      console.log('🔄 Starting manual avatar sync...');
      
      // Force sync user profile to all groups
      await groupsService.syncUserProfileToAllGroups(currentUserId);
      
      // Reload group members to see changes
      await loadGroupMembers(currentUserId);
      
      Alert.alert('Success', 'Avatar sync completed! Check logs for details.');
    } catch (error: any) {
      console.error('Manual avatar sync failed:', error);
      Alert.alert('Error', 'Avatar sync failed: ' + error.message);
    }
  };

  // Fixed sendMessage function
  const sendMessage = async (message: string): Promise<void> => {
    if (!currentUserId || !currentUserName) {
      Alert.alert('Error', 'User information not loaded');
      return;
    }

    try {
      setIsSendingMessage(true);
      
      // Send message to database
      const newChatMessage = await calendarService.sendChatMessage(
        params.groupId,
        currentUserId,
        currentUserName,
        message
      );
      
      // Add message to local state
      setChatMessages(prev => [...prev, newChatMessage]);
      
      console.log('Message sent successfully:', newChatMessage);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderUserRow = (member: GroupMember) => {
    const isCurrentUser = member.userId === currentUserId;
    
    return (
      <UserCalendarRow
        key={member.userId}
        member={member}
        currentWeek={currentWeek}
        getUserEntry={getUserEntry}
        getUserStreak={getUserStreak}
        onToggleDay={toggleDay}
        isCurrentUser={isCurrentUser}
        onAvatarPress={() => {
          if (isCurrentUser) {
            setShowAvatarPicker(true);
          }
        }}
      />
    );
  };

  const getCurrentUserMember = (): GroupMember | undefined => {
    return groupMembers.find(member => member.userId === currentUserId);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.currentDate}>{getCurrentDateString()}</Text>
        {params.groupName && (
          <Text style={styles.groupName}>{params.groupName}</Text>
        )}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleManualAvatarSync}
          >
            <Text style={styles.debugButtonText}>🔄 Sync Avatar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Week Header - Progressive completion circles */}
      <WeekHeader
        weekDays={weekDays}
        currentWeek={currentWeek}
        getDayCompletionData={getDayCompletionData}
      />

      {/* User Calendar Rows - Scrollable 2/3 */}
      <ScrollView 
        style={styles.userRowsContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.userRowsContent}
      >
        {groupMembers.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No group members found. Make sure you've joined this group or that members have been added.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Group ID: {params.groupId}
            </Text>
          </View>
        ) : (
          groupMembers.map((member) => renderUserRow(member))
        )}
      </ScrollView>

      {/* Chat Window - Bottom 1/3 */}
      <View style={[styles.chatContainer, { height: chatHeight }]}>
        <ChatWindow
          messages={chatMessages}
          currentUserId={currentUserId}
          onSendMessage={sendMessage}
          isLoading={isSendingMessage}
        />
      </View>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <UserAvatarPicker
          visible={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onAvatarSelected={handleAvatarUpdate}
          currentAvatarUrl={getCurrentUserMember()?.avatarUrl}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  currentDate: {
    fontSize: 16,
    color: '#4287f5',
    marginBottom: 2,
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userRowsContainer: {
    height: '50%', // Fixed height - 50% of available space
    backgroundColor: '#fff',
  },
  userRowsContent: {
    paddingBottom: 10,
  },
  chatContainer: {
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    // Height will be set dynamically via inline style
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  debugButton: {
    backgroundColor: '#ff9500',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default GroupCalendar;