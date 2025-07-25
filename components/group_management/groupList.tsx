import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GroupListProps } from './types';
import GroupItem from './groupItem';

const GroupList: React.FC<GroupListProps> = ({ groups, onGroupPress }) => {
  if (groups.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>
          No groups yet. Create your first group!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <GroupItem
          key={group.id}
          group={group}
          onPress={onGroupPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
});

export default GroupList;