// components/calendar/userCalendarRow.tsx - Complete file with debugging
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

  // DETAILED AVATAR RENDERING DEBUG
  console.log(`\n🎨 RENDERING ROW FOR: ${member.userName}`);
  console.log(`🖼️ Avatar URL exists: ${!!member.avatarUrl}`);
  console.log(`📏 Avatar URL length: ${member.avatarUrl?.length || 0}`);
  console.log(`🔗 Avatar URL: ${member.avatarUrl?.substring(0, 80)}...`);
  console.log(`🎯 Will render: ${member.avatarUrl ? 'Image Component' : 'Default Avatar'}`);

  return (
    <View style={styles.userRow}>
      {/* Enhanced Avatar with Debugging */}
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onAvatarPress}
        disabled={!isCurrentUser}
        activeOpacity={isCurrentUser ? 0.7 : 1}
      >
        {member.avatarUrl ? (
          <>
            {console.log(`📱 Creating Image component for ${member.userName}`)}
            <Image 
              source={{ uri: member.avatarUrl }} 
              style={styles.avatar}
              onLoadStart={() => console.log(`🔄 ${member.userName}: Image load started`)}
              onLoad={(event) => {
                console.log(`✅ ${member.userName}: Image loaded successfully`);
                console.log(`📐 Image dimensions: ${event.nativeEvent.source.width}x${event.nativeEvent.source.height}`);
              }}
              onLoadEnd={() => console.log(`🏁 ${member.userName}: Image load ended`)}
              onError={(error) => {
                console.log(`❌ ${member.userName}: Image failed to load`);
                console.log(`🔍 Error details:`, error.nativeEvent);
                console.log(`🔗 Failed URL: ${member.avatarUrl}`);
              }}
              onProgress={(event) => {
                console.log(`📊 ${member.userName}: Loading progress ${event.nativeEvent.loaded}/${event.nativeEvent.total}`);
              }}
              resizeMode="cover"
            />
          </>
        ) : (
          <>
            {console.log(`👤 Creating default avatar for ${member.userName}`)}
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>👤</Text>
            </View>
          </>
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
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 15,
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
    width: 50,
    marginRight: 10,
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