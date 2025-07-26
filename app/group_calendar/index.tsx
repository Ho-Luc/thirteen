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
  TouchableOpacity
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { calendarService } from '../../services/calendarService';
import { userService } from '../../services/userService';
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
  
  const [currentUserId, setCurrentUserId] = useState<string>(''); // Will be set when members load
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
      
      // Load group members, calendar entries, streaks, and chat messages
      await Promise.all([
        loadGroupMembers(),
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

  const loadGroupMembers = async () => {
    try {
      const members = await calendarService.getGroupMembers(params.groupId);
      setGroupMembers(members);
      
      // Set current user to the first member (creator) for testing
      if (members.length > 0 && !currentUserId) {
        setCurrentUserId(members[0].userId);
        console.log(`Set current user to: ${members[0].userId} (${members[0].userName})`);
      }
      
      console.log(`Loaded ${members.length} group members`);
    } catch (error) {
      console.error('Error loading group members:', error);
      setGroupMembers([]); // Set empty array on error
    }
  };

  // Manual sync function for testing
  const handleSyncProfile = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'No current user set');
      return;
    }

    try {
      console.log('Starting manual profile sync...');
      await calendarService.syncUserProfileToGroup(currentUserId, params.groupId);
      
      // Reload members to see updated info
      await loadGroupMembers();
      
      Alert.alert('Success', 'Profile synced successfully!');
    } catch (error) {
      console.error('Manual sync failed:', error);
      Alert.alert('Error', 'Failed to sync profile');
    }
  };

  const loadCalendarEntries = async () => {
    try {
      const entries = await calendarService.getCalendarEntries(params.groupId, currentWeek);
      setCalendarEntries(entries);
    } catch (error) {
      console.error('Error loading calendar entries:', error);
    }
  };

  const loadUserStreaks = async () => {
    try {
      const streaks = await calendarService.getUserStreaks(params.groupId);
      setUserStreaks(streaks);
    } catch (error) {
      console.error('Error loading user streaks:', error);
    }
  };

  const loadChatMessages = async () => {
    try {
      const messages = await calendarService.getChatMessages(params.groupId);
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
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
      await calendarService.updateUserAvatar(currentUserId, params.groupId, avatarUrl);
      await loadGroupMembers();
      setShowAvatarPicker(false);
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

  const sendMessage = async (message: string) => {
    try {
      const currentUser = groupMembers.find(m => m.userId === currentUserId);
      const newChatMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        userId: currentUserId,
        userName: currentUser?.userName || 'You',
        message: message,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, newChatMessage]);
      
      // In production, save to database
      // await calendarService.sendChatMessage(params.groupId, newChatMessage);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderUserRow = (member: GroupMember) => {
    const isCurrentUser = member.userId === currentUserId;
    console.log(`Rendering row for ${member.userName} (${member.userId}), isCurrentUser: ${isCurrentUser}, currentUserId: ${currentUserId}`);
    
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
        {__DEV__ && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncProfile}
          >
            <Text style={styles.syncButtonText}>🔄 Sync Profile</Text>
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
          isLoading={isLoading}
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
  syncButton: {
    backgroundColor: '#28a745',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  },
});

export default GroupCalendar;