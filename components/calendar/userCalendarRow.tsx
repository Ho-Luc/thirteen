// components/calendar/userCalendarRow.tsx - Updated with better spacing
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

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
  date: string;
  completed: boolean;
  createdAt: Date;
}

interface UserCalendarRowProps {
  member: GroupMember;
  currentWeek: Date[];
  getUserEntry: (userId: string, date: Date) => CalendarEntry | undefined;
  getUserStreak: (userId: string) => number;
  onToggleDay: (userId: string, date: Date) => void;
  isCurrentUser: boolean;
  onAvatarPress: () => void;
}

const UserCalendarRow: React.FC<UserCalendarRowProps> = ({
  member,
  currentWeek,
  getUserEntry,
  getUserStreak,
  onToggleDay,
  isCurrentUser,
  onAvatarPress,
}) => {
  const streak = getUserStreak(member.userId);

  return (
    <View style={styles.userRow}>
      {/* Avatar */}
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onAvatarPress}
        disabled={!isCurrentUser}
        activeOpacity={isCurrentUser ? 0.7 : 1}
      >
        {member.avatarUrl ? (
          <Image 
            source={{ uri: member.avatarUrl }} 
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.defaultAvatarText}>👤</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Streak Counter */}
      <View style={styles.streakContainer}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakEmoji}>🔥</Text>
      </View>

      {/* Calendar Squares */}
      <View style={styles.calendarRow}>
        {currentWeek.map((date, index) => {
          const entry = getUserEntry(member.userId, date);
          const isCompleted = entry?.completed || false;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarSquare,
                isCompleted ? styles.completedSquare : styles.incompleteSquare,
                !isCurrentUser && styles.disabledSquare
              ]}
              onPress={() => onToggleDay(member.userId, date)}
              disabled={!isCurrentUser}
              activeOpacity={isCurrentUser ? 0.7 : 1}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8, // Reduced from 15 to 8 for less left spacing
    paddingRight: 40, // Increased from 30 to 40 for more right spacing
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12, // Reduced from 15 to 12
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#4287f5',
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  defaultAvatarText: {
    fontSize: 24,
    color: '#6c757d',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 45, // Reduced from 50 to 45
    marginRight: 8, // Reduced from 10 to 8
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 2,
  },
  streakEmoji: {
    fontSize: 16,
  },
  calendarRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 20, // Increased from 15 to 20 for more space on right
  },
  calendarSquare: {
    width: 35,
    height: 35,
    borderRadius: 4,
    borderWidth: 1,
  },
  completedSquare: {
    backgroundColor: '#90c695',
    borderColor: '#6ba96f',
  },
  incompleteSquare: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  disabledSquare: {
    opacity: 0.8,
  },
});

export default UserCalendarRow;