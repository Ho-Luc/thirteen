import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Alert } from "react-native";
import { useRouter } from "expo-router";

// Import all components
import GroupList from '../../components/group_management/groupList';
import CreateGroupForm from '../../components/group_management/createGroupForm';
import ShareKeyModal from '../../components/group_management/shareKeyModal';
import SettingsModal from '../../components/group_management/settingsModal';
import DeleteConfirmationModal from '../../components/group_management/deleteConfirmationModal';
import { Group } from '../../components/group_management/types';

const CreateGroupsScreen = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showShareKey, setShowShareKey] = useState(false);
  const [newGroupShareKey, setNewGroupShareKey] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedGroupForDeletion, setSelectedGroupForDeletion] = useState<Group | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const router = useRouter();

  // Generate a unique 6-character alphanumeric key
  const generateShareKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Handle creating a new group
  const handleCreateGroup = (groupName: string) => {
    const shareKey = generateShareKey();
    const newGroup: Group = {
      id: Date.now().toString(),
      name: groupName,
      shareKey: shareKey,
      createdAt: new Date(),
    };

    setGroups(prevGroups => [...prevGroups, newGroup]);
    setNewGroupShareKey(shareKey);
    setShowCreateForm(false);
    setShowShareKey(true);
  };

  // Handle copying share key to clipboard
  const handleCopyShareKey = () => {
    Clipboard.setString(newGroupShareKey);
    Alert.alert('Copied!', 'Share key copied to clipboard');
  };

  // Handle navigating to group calendar
  const handleNavigateToCalendar = (group: Group) => {
    router.push({
      pathname: '/group_calendar',
      params: { groupId: group.id, groupName: group.name }
    });
  };

  // Handle delete group request
  const handleDeleteGroupRequest = (groupToDelete: Group) => {
    setSelectedGroupForDeletion(groupToDelete);
    setShowSettingsModal(false);
    
    setTimeout(() => {
      setShowDeleteConfirmation(true);
    }, 300);
  };

  // Confirm and delete the group
  const handleConfirmDelete = () => {
    if (selectedGroupForDeletion) {
      setGroups(prevGroups => prevGroups.filter(group => group.id !== selectedGroupForDeletion.id));
      setShowDeleteConfirmation(false);
      setSelectedGroupForDeletion(null);
    }
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setSelectedGroupForDeletion(null);
  };

  return (
    <View style={styles.container}>
      {/* Header with title and settings gear */}
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        {groups.length > 0 && (
          <TouchableOpacity
            style={styles.gearButton}
            onPress={() => {
              setShowSettingsModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Groups List */}
      <GroupList 
        groups={groups} 
        onGroupPress={handleNavigateToCalendar} 
      />

      {/* Create Group Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowCreateForm(true)}
      >
        <Text style={styles.addButtonText}>
          + Create New Group
        </Text>
      </TouchableOpacity>

      {/* Modals */}
      <CreateGroupForm
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreateGroup={handleCreateGroup}
      />

      <ShareKeyModal
        visible={showShareKey}
        shareKey={newGroupShareKey}
        onClose={() => setShowShareKey(false)}
        onCopyKey={handleCopyShareKey}
      />

      {showSettingsModal && groups.length > 0 && (
        <SettingsModal
          visible={showSettingsModal}
          groups={groups || []}
          onClose={() => setShowSettingsModal(false)}
          onDeleteGroup={handleDeleteGroupRequest}
        />
      )}

      {selectedGroupForDeletion && (
        <DeleteConfirmationModal
          visible={showDeleteConfirmation && !showSettingsModal}
          groupName={selectedGroupForDeletion.name}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  gearButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  gearIcon: {
    fontSize: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    left: 20,
    backgroundColor: "#4287f5",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateGroupsScreen;