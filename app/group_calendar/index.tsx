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

  // Get screen dimensions and calculate layout proportions
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = screenHeight * 0.10; // 10% for week header
  const calendarRowsHeight = screenHeight * 0.38; // 38% for user calendar rows
  const chatHeight = screenHeight * 0.52; // 52% for chat

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
      const { userProfileService } = await import('../../services/userProfileService');
      const userProfile = await userProfileService.getUserProfile();
      
      if (userProfile?.avatarUri && userProfile.avatarUri.startsWith('file://')) {
        groupsService.forceAvatarUploadToAllGroups(currentUserId)
          .then(() => {
            loadGroupMembers(currentUserId);
          })
          .catch((error) => {
            // Handle error silently
          });
      }
    } catch (error: any) {
    }
  };

  const initializeCalendar = async () => {
    try {
      setIsLoading(true);
      
      const userId = await userService.getOrCreateUserId();
      setCurrentUserId(userId);

      await groupsService.syncUserProfileToAllGroups(userId);

      const group = await groupsService.getGroup(params.groupId);
      setGroupInfo(group);
      
      await loadGroupMembers(userId);
      autoProcessAvatarsOnLoad();
      
      await Promise.all([
        loadCalendarEntries(),
        loadUserStreaks(),
        loadChatMessages()
      ]);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupMembers = async (userId: string) => {
    try {
      const members = await calendarService.getGroupMembers(params.groupId);
      setGroupMembers(members);
      
      const currentUser = members.find(member => member.userId === userId);
      if (currentUser) {
        setCurrentUserName(currentUser.userName);
      } else {
        setCurrentUserName('You');
      }
    } catch (error) {
      setGroupMembers([]);
      Alert.alert('Error', 'Failed to load group members');
    }
  };

  const loadCalendarEntries = async () => {
    try {
      const entries = await calendarService.getCalendarEntries(params.groupId, currentWeek);
      setCalendarEntries(entries);
    } catch (error) {
      // Handle error silently
    }
  };

  const loadUserStreaks = async () => {
    try {
      const streaks = await calendarService.getUserStreaks(params.groupId);
      setUserStreaks(streaks);
    } catch (error) {
      // Handle error silently
    }
  };

  const loadChatMessages = async () => {
    try {
      const messages = await calendarService.getChatMessages(params.groupId);
      setChatMessages(messages);
    } catch (error) {
      // Handle error silently
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const toggleDay = async (userId: string, date: Date) => {
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
        const newEntry = await calendarService.createCalendarEntry({
          userId,
          groupId: params.groupId,
          date: dateString,
          completed: true
        });
        
        setCalendarEntries(prev => [...prev, newEntry]);
      }

      await loadUserStreaks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update calendar entry');
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    try {
      if (avatarUrl.startsWith('file://')) {
        const cloudUrl = await avatarUploadService.uploadAvatar(avatarUrl, currentUserId);
        await calendarService.updateUserAvatar(currentUserId, params.groupId, cloudUrl);
      } else if (avatarUrl === '') {
        await calendarService.updateUserAvatar(currentUserId, params.groupId, '');
      } else {
        await calendarService.updateUserAvatar(currentUserId, params.groupId, avatarUrl);
      }
      
      await loadGroupMembers(currentUserId);
      setShowAvatarPicker(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar');
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

  const sendMessage = async (message: string): Promise<void> => {
    if (!currentUserId || !currentUserName) {
      Alert.alert('Error', 'User information not loaded');
      return;
    }

    try {
      setIsSendingMessage(true);
      
      const newChatMessage = await calendarService.sendChatMessage(
        params.groupId,
        currentUserId,
        currentUserName,
        message
      );
      
      setChatMessages(prev => [...prev, newChatMessage]);
    } catch (error: any) {
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
      {/* Week Header - 10% of screen */}
      <View style={[styles.weekHeaderContainer, { height: headerHeight }]}>
        <WeekHeader
          weekDays={weekDays}
          currentWeek={currentWeek}
          getDayCompletionData={getDayCompletionData}
          currentDate={getCurrentDateString()}
        />
      </View>

      {/* User Calendar Rows - 38% of screen */}
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

      {/* Chat Window - 52% of screen */}
      <View style={[styles.chatContainer, { height: chatHeight }]}>
        <ChatWindow
          messages={chatMessages}
          currentUserId={currentUserId}
          onSendMessage={sendMessage}
          isLoading={isSendingMessage}
          groupName={params.groupName}
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
  weekHeaderContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 0,
    paddingBottom: 0,
  },
  userRowsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  userRowsScrollView: {
    flex: 1,
  },
  userRowsContent: {
    paddingBottom: 10,
    paddingRight: 25,
  },
  chatContainer: {
    backgroundColor: '#fff',
    flex: 1,
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