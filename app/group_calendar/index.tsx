import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { calendarService, GroupMember, CalendarEntry, UserStats, ChatMessage } from '../../services/calendarService';
import { calendarCacheService } from '../../services/calendarCacheService';
import { userService } from '../../services/userService';
import { groupsService } from '../../services/groupsService';
import { avatarUploadService } from '../../services/avatarUploadService';
import UserAvatarPicker from '../../components/calendar/userAvatarPicker';
import WeekHeader from '../../components/calendar/weekHeader';
import UserCalendarRow from '../../components/calendar/userCalendarRow';
import ChatWindow from '../../components/calendar/chatWindow';
import MonthlyCalendarModal from '../../components/calendar/monthlyCalendarModal';

interface UserStreak {
  userId: string;
  currentStreak: number;
  lastActiveDate: string;
}

const GroupCalendar = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId: string; groupName: string }>();
  
  // Optimized state management
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  
  // Separate weekly and monthly data
  const [weeklyEntries, setWeeklyEntries] = useState<CalendarEntry[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<CalendarEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // User stats and streaks
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);
  
  // Chat and UI state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  // Get screen dimensions and calculate layout proportions
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = screenHeight * 0.10;
  const calendarRowsHeight = screenHeight * 0.38;
  const chatHeight = screenHeight * 0.52;

  // Get current week dates
  const getCurrentWeek = () => {
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
      
      const userId = await userService.getOrCreateUserId();
      setCurrentUserId(userId);

      await groupsService.syncUserProfileToAllGroups(userId);

      const group = await groupsService.getGroup(params.groupId);
      setGroupInfo(group);
      
      const [groupBundle, userBundle] = await Promise.all([
        calendarService.getGroupDataBundle(params.groupId, currentWeek),
        calendarService.getUserDataBundle(userId, params.groupId)
      ]);

      // Set all data from bundles
      setGroupMembers(groupBundle.members);
      setWeeklyEntries(groupBundle.weeklyEntries);
      setChatMessages(groupBundle.chatMessages);
      
      setUserStats(userBundle.stats);
      setUserStreaks(userBundle.streaks);

      // Find current user name
      const currentUser = groupBundle.members.find(member => member.userId === userId);
      setCurrentUserName(currentUser?.userName || 'You');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonthlyData = async (year: number, month: number) => {
    try {
      let monthData = calendarCacheService.getCachedUserMonth(
        currentUserId, 
        params.groupId, 
        year, 
        month
      );
      
      if (!monthData) {
        monthData = await calendarService.getUserMonthlyEntries(
          currentUserId, 
          params.groupId, 
          year, 
          month
        );
        
        calendarCacheService.setCachedUserMonth(
          currentUserId, 
          params.groupId, 
          year,
          month,
          monthData
        );
      }
      
      setMonthlyEntries(monthData);
    } catch (error) {
      // Handle error silently
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleDay = async (userId: string, date: Date) => {
    if (userId !== currentUserId) {
      Alert.alert('Permission Denied', 'You can only edit your own calendar entries');
      return;
    }

    try {
      const dateString = formatDate(date);
      const existingEntry = weeklyEntries.find(
        entry => entry.userId === userId && entry.date === dateString
      );

      // Use batch update if multiple changes are needed
      const updates = [{
        entryId: existingEntry?.id,
        userId,
        groupId: params.groupId,
        date: dateString,
        completed: existingEntry ? !existingEntry.completed : true
      }];

      const updatedEntries = await calendarService.batchUpdateCalendarEntries(updates);
      
      if (existingEntry) {
        setWeeklyEntries(prev => 
          prev.map(entry => 
            entry.id === existingEntry.id ? updatedEntries[0] : entry
          )
        );
      } else {
        setWeeklyEntries(prev => [...prev, updatedEntries[0]]);
      }

      // Invalidate cache and reload dependent data
      calendarCacheService.invalidateUserCache(userId, params.groupId, dateString);
      
      // Reload user stats efficiently
      const userBundle = await calendarService.getUserDataBundle(userId, params.groupId);
      setUserStats(userBundle.stats);
      setUserStreaks(userBundle.streaks);
      
      // If monthly modal is open, refresh that data too
      if (showMonthlyCalendar) {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        calendarCacheService.invalidateMonthCache(userId, params.groupId, year, month);
        await loadMonthlyData(year, month);
      }
      
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
      
      // Reload group members to get updated avatar
      const groupBundle = await calendarService.getGroupDataBundle(params.groupId, currentWeek);
      setGroupMembers(groupBundle.members);
      
      setShowAvatarPicker(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar');
    }
  };

  const getUserEntry = (userId: string, date: Date): CalendarEntry | undefined => {
    const dateString = formatDate(date);
    return weeklyEntries.find(
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
      const entry = weeklyEntries.find(
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
            handleOpenMonthlyCalendar();
          }
        }}
      />
    );
  };

  const getCurrentUserMember = (): GroupMember | undefined => {
    return groupMembers.find(member => member.userId === currentUserId);
  };

  const handleOpenMonthlyCalendar = () => {
    setShowMonthlyCalendar(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    loadMonthlyData(year, month);
  };

  const handleMonthChange = (year: number, month: number) => {
    const newMonth = new Date(year, month, 1);
    setCurrentMonth(newMonth);
    loadMonthlyData(year, month);
  };

  const handleCloseMonthlyCalendar = () => {
    setShowMonthlyCalendar(false);
    setMonthlyEntries([]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={[styles.weekHeaderContainer, { height: headerHeight }]}>
        <WeekHeader
          weekDays={weekDays}
          currentWeek={currentWeek}
          getDayCompletionData={getDayCompletionData}
          currentDate={getCurrentDateString()}
        />
      </View>

      {/* User Calendar Rows */}
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

      {/* Chat Window */}
      <View style={[styles.chatContainer, { height: chatHeight }]}>
        <ChatWindow
          messages={chatMessages}
          currentUserId={currentUserId}
          onSendMessage={sendMessage}
          isLoading={isSendingMessage}
          groupName={params.groupName}
        />
      </View>

      {/* Monthly Calendar Modal */}
      {showMonthlyCalendar && (
        <MonthlyCalendarModal
          visible={showMonthlyCalendar}
          onClose={handleCloseMonthlyCalendar}
          userEntries={monthlyEntries}
          userName={currentUserName}
          currentStreak={userStats?.currentStreak || 0}
          longestStreak={userStats?.longestStreak || 0}
          onMonthChange={handleMonthChange}
        />
      )}

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <UserAvatarPicker
          visible={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onAvatarSelected={handleAvatarUpdate}
          currentAvatarUrl={getCurrentUserMember()?.avatarUrl}
        />
      )}
    </View>
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