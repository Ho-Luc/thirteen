import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeekHeaderProps {
  weekDays: string[];
  currentWeek: Date[];
  getDayCompletionData: (date: Date) => {
    completedCount: number;
    totalMembers: number;
    percentage: number;
    isFullyComplete: boolean;
  };
}

const WeekHeader: React.FC<WeekHeaderProps> = ({
  weekDays,
  currentWeek,
  getDayCompletionData,
}) => {
  const renderDayHeader = (date: Date, index: number) => {
    const dayName = weekDays[index];
    const dayNumber = date.getDate();
    const completionData = getDayCompletionData(date);
    
    return (
      <View key={index} style={styles.dayHeader}>
        <View style={styles.dayCircle}>
          {/* Background (yellow) */}
          <View style={styles.dayCircleBackground} />
          
          {/* Progress fill (green) - fills from bottom up */}
          <View style={[
            styles.dayCircleProgress, 
            { height: `${completionData.percentage}%` }
          ]} />
          
          {/* Day letter */}
          <Text style={styles.dayLetter}>
            {dayName.charAt(0)}
          </Text>
        </View>
        
        {/* Day number below circle */}
        <Text style={styles.dayNumber}>{dayNumber}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarPlaceholder} />
      <View style={styles.streakPlaceholder} />
      <View style={styles.dayHeadersRow}>
        {currentWeek.map((date, index) => renderDayHeader(date, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    width: 60,
    marginRight: 15,
  },
  streakPlaceholder: {
    width: 50,
    marginRight: 10,
  },
  dayHeadersRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayHeader: {
    alignItems: 'center',
    width: 35,
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  dayCircleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffc107', // Yellow background
    borderRadius: 15,
  },
  dayCircleProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#28a745', // Green progress fill
    borderRadius: 15,
  },
  dayLetter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    zIndex: 1,
  },
  dayNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

export default WeekHeader;