import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const GroupCalendar = () => {
  const [selectedDays, setSelectedDays] = useState({});
  
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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentWeek = getCurrentWeek();

  const toggleDay = (dateString) => {
    setSelectedDays(prev => ({
      ...prev,
      [dateString]: !prev[dateString]
    }));
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const renderDay = (date, index) => {
    const dateString = formatDate(date);
    const isSelected = selectedDays[dateString];
    const dayName = weekDays[index];
    const dayNumber = date.getDate();

    return (
      <TouchableOpacity
        key={dateString}
        style={[
          styles.dayContainer,
          isSelected ? styles.selectedDay : styles.unselectedDay
        ]}
        onPress={() => toggleDay(dateString)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dayName,
          isSelected ? styles.selectedText : styles.unselectedText
        ]}>
          {dayName}
        </Text>
        <Text style={[
          styles.dayNumber,
          isSelected ? styles.selectedText : styles.unselectedText
        ]}>
          {dayNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Calendar</Text>
      <View style={styles.weekContainer}>
        {currentWeek.map((date, index) => renderDay(date, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  dayContainer: {
    width: 45,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unselectedDay: {
    backgroundColor: '#FFD700', // Yellow
    borderColor: '#FFC107',
  },
  selectedDay: {
    backgroundColor: '#4CAF50', // Green
    borderColor: '#388E3C',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unselectedText: {
    color: '#333',
  },
  selectedText: {
    color: '#fff',
  },
});

export default GroupCalendar;
