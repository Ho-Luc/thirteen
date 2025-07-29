import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeekHeaderProps {
  weekDays: string[];
  currentWeek: Date[];
  currentDate: string; // Added current date prop
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
  currentDate, // Added current date prop
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
      {/* Current Date at the top */}
      <Text style={styles.currentDate}>{currentDate}</Text>
      
      {/* Centered row of day headers */}
      <View style={styles.dayHeadersRow}>
        {currentWeek.map((date, index) => renderDayHeader(date, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 0, // No top padding at all
    paddingBottom: 2, // Minimal bottom padding
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDate: {
    fontSize: 16,
    color: '#4287f5',
    marginBottom: 4, // Very minimal margin
    textAlign: 'center',
  },
  dayHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Changed to space-evenly for better centering
    alignItems: 'center',
    width: '90%', // Constrain width for better centering
    maxWidth: 350, // Maximum width to prevent over-stretching
  },
  dayHeader: {
    alignItems: 'center',
    width: 40, // Slightly wider for better spacing
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: 16,
  },
  dayCircleProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#28a745', // Green progress fill
    borderRadius: 16,
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