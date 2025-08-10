// components/calendar/monthlyCalendarModal.tsx - Optimized production version
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

interface CalendarEntry {
  id: string;
  userId: string;
  groupId: string;
  date: string;
  completed: boolean;
  createdAt: Date;
}

interface MonthlyCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  userEntries: CalendarEntry[];
  userName: string;
  currentStreak: number;
  longestStreak?: number;
  onMonthChange?: (year: number, month: number) => void;
}

const MonthlyCalendarModal: React.FC<MonthlyCalendarModalProps> = ({
  visible,
  onClose,
  userEntries,
  userName,
  currentStreak,
  longestStreak = 0,
  onMonthChange,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Array<Date | null>>([]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days: Array<Date | null> = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    setCalendarDays(days);
  };

  // Consistent date formatting
  const formatDateConsistently = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateCompleted = (date: Date): boolean => {
    const dateString = formatDateConsistently(date);
    return userEntries.some(entry => entry.date === dateString && entry.completed);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    
    // Notify parent to load new month data
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth());
    }
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentDate(today);
    
    if (onMonthChange) {
      onMonthChange(today.getFullYear(), today.getMonth());
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  // Remove unused functions since we're no longer showing monthly stats
  // const getMonthCompletedDays = (): number => {
  //   const year = currentDate.getFullYear();
  //   const month = currentDate.getMonth();
  //   
  //   return userEntries.filter(entry => {
  //     if (!entry.completed) return false;
  //     const entryDate = new Date(entry.date);
  //     return entryDate.getFullYear() === year && entryDate.getMonth() === month;
  //   }).length;
  // };

  // Use optimized monthly completed count if provided, otherwise calculate
  // const displayMonthCompleted = monthCompleted > 0 ? monthCompleted : getMonthCompletedDays();

  const renderCalendarDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={index} style={styles.emptyDay} />;
    }

    const isCompleted = isDateCompleted(date);
    const isCurrentDay = isToday(date);
    const isFuture = isFutureDate(date);

    return (
      <View
        key={index}
        style={[
          styles.calendarDay,
          isCompleted && styles.completedDay,
          isCurrentDay && styles.todayDay,
          isFuture && styles.futureDay,
        ]}
      >
        <Text style={[
          styles.dayText,
          isCompleted && styles.completedDayText,
          isCurrentDay && styles.todayDayText,
          isFuture && styles.futureDayText,
        ]}>
          {date.getDate()}
        </Text>
        {isCompleted && (
          <View style={styles.completedIndicator}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{userName}'s Progress</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{longestStreak}</Text>
              <Text style={styles.statLabel}>Longest Streak</Text>
            </View>
          </View>

          {/* Calendar Navigation */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('prev')}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={goToCurrentMonth}>
              <Text style={styles.monthTitle}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('next')}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {dayNames.map((day) => (
              <Text key={day} style={styles.dayHeader}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <ScrollView style={styles.calendarScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => renderCalendarDay(date, index))}
            </View>
          </ScrollView>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.completedLegendDot]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.todayLegendDot]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.incompleteLegendDot]} />
              <Text style={styles.legendText}>Incomplete</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '95%',
    maxWidth: 400,
    maxHeight: '80%',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4287f5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4287f5',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    width: 40,
  },
  calendarScrollView: {
    maxHeight: 300,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  completedDay: {
    backgroundColor: '#90c695',
    borderColor: '#6ba96f',
  },
  todayDay: {
    borderColor: '#4287f5',
    borderWidth: 2,
  },
  futureDay: {
    backgroundColor: '#f8f9fa',
    opacity: 0.5,
  },
  emptyDay: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  completedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#4287f5',
    fontWeight: 'bold',
  },
  futureDayText: {
    color: '#999',
  },
  completedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 10,
    color: '#90c695',
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  completedLegendDot: {
    backgroundColor: '#90c695',
  },
  todayLegendDot: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4287f5',
  },
  incompleteLegendDot: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default MonthlyCalendarModal;