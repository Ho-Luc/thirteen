import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroupItemProps } from './types';

const GroupItem: React.FC<GroupItemProps> = ({ group, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => onPress(group)}
    >
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.shareKeyText}>Share Key: {group.shareKey}</Text>
      </View>
      <Text style={styles.arrowText}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shareKeyText: {
    fontSize: 14,
    color: '#666',
  },
  arrowText: {
    fontSize: 20,
    color: '#4287f5',
    fontWeight: 'bold',
  },
});

export default GroupItem;