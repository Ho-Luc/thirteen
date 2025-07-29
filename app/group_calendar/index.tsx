// app/group_calendar/index.tsx - Updated with proper screen proportions for TODO #4
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
  TextInput, // Added TextInput back
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
import { storage, appwriteConfig } from '../../lib/appwrite';

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
  const [newMessage, setNewMessage] = useState<string>(''); // Added state for input

  // Get screen dimensions and calculate layout proportions - ENSURE INPUT VISIBILITY
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = screenHeight * 0.12; // 12% for week header (reduced)
  const calendarRowsHeight = screenHeight * 0.28; // 28% for user calendar rows (reduced)
  const chatHeight = screenHeight * 0.60; // 60% for chat (increased significantly)

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

  // Automatically process all avatars when calendar loads
  const autoProcessAvatarsOnLoad = async () => {
    try {
      console.log('\n🔄 AUTO-PROCESSING AVATARS ON CALENDAR LOAD...');
      
      // Only process current user's avatar automatically
      const { userProfileService } = await import('../../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      if (userProfile?.avatarUri && userProfile.avatarUri.startsWith('file://')) {
        console.log('📱 Found local avatar - processing for group visibility...');
        
        // Process avatar in background (non-blocking)
        groupsService.forceAvatarUploadToAllGroups(currentUserId)
          .then(() => {
            console.log('✅ Background avatar processing completed');
            // Silently reload members to show updated avatar
            loadGroupMembers(currentUserId);
          })
          .catch((error) => {
            console.warn('⚠️ Background avatar processing failed:', error.message);
          });
      }
      
    } catch (error: any) {
      console.warn('⚠️ Auto avatar processing failed:', error.message);
      // Don't show error - this is background enhancement
    }
  };

  const initializeCalendar = async () => {
    try {
      setIsLoading(true);
      
      // First, get the current user ID
      const userId = await userService.getOrCreateUserId();
      setCurrentUserId(userId);
      console.log('Current user ID:', userId);

      // Sync user profile to all groups (now includes avatar upload)
      await groupsService.syncUserProfileToAllGroups(userId);

      // Get group information
      const group = await groupsService.getGroup(params.groupId);
      setGroupInfo(group);
      console.log('Group info:', group);
      
      // Load group members
      await loadGroupMembers(userId);
      
      // Auto-process avatars for group visibility (background)
      autoProcessAvatarsOnLoad();
      
      // Load other calendar data
      await Promise.all([
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

  // Handle input message send
  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '' || isSendingMessage) return;
    
    sendMessage(trimmedMessage);
    setNewMessage(''); // Clear input after sending
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
      {/* Week Header - 12% of screen */}
      <View style={[styles.weekHeaderContainer, { height: headerHeight }]}>
        <WeekHeader
          weekDays={weekDays}
          currentWeek={currentWeek}
          getDayCompletionData={getDayCompletionData}
          currentDate={getCurrentDateString()}
        />
      </View>

      {/* User Calendar Rows - 28% of screen */}
      <View style={[styles.userRowsContainer, { height: calendarRowsHeight }]}>
        <ScrollView 
          style={styles.userRowsScrollView} 
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
      </View>

      {/* Chat Window - 60% of screen - BIGGER FOR INPUT */}
      <View style={[styles.chatContainer, { height: chatHeight }]}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>{params.groupName} Chat</Text>
        </View>
        
        <ScrollView style={styles.messagesArea}>
          {chatMessages.map((message) => (
            <View key={message.id} style={styles.messageRow}>
              <Text style={styles.messageText}>
                {message.userName}: {message.message}
              </Text>
            </View>
          ))}
        </ScrollView>
        
        {/* INPUT AREA - FORCED TO BOTTOM */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            placeholder="Send a message"
            value={newMessage}
            onChangeText={setNewMessage}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            editable={!isSendingMessage}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={isSendingMessage || newMessage.trim() === ''}
          >
            <Text style={styles.sendButtonText}>
              {isSendingMessage ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
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
  weekHeaderContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 0, // Remove all top padding
    paddingBottom: 8, // Minimal bottom padding
  },
  userRowsContainer: {
    backgroundColor: '#fff',
    overflow: 'hidden', // Ensure content doesn't overflow
  },
  userRowsScrollView: {
    flex: 1,
  },
  userRowsContent: {
    paddingBottom: 10,
    paddingRight: 15, // Added margin to the right of user calendar rows
  },
  chatContainer: {
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  chatHeader: {
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesArea: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 90, // Reserve space for absolutely positioned input
  },
  messageRow: {
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  inputRow: {
    height: 80, // Increased height for visibility
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 3, // Thicker border to make it obvious
    borderTopColor: '#4287f5', // Blue border to make it obvious
    alignItems: 'center',
    backgroundColor: '#f8f9fa', // Light background to make it stand out
    position: 'absolute', // Force it to bottom
    bottom: 0,
    left: 0,
    right: 0,
  },
  messageInput: {
    flex: 1,
    height: 50,
    borderWidth: 3, // Thick border to make it obvious
    borderColor: '#4287f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  sendButton: {
    height: 50,
    backgroundColor: '#4287f5',
    paddingHorizontal: 20,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});

export default GroupCalendar;