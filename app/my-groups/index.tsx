import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Alert } from "react-native";
import { useRouter, useNavigation } from "expo-router";

// Import all components
import GroupList from '../../components/group_management/groupList';
import CreateGroupForm from '../../components/group_management/createGroupForm';
import ShareKeyModal from '../../components/group_management/shareKeyModal';
import SettingsModal from '../../components/group_management/settingsModal';
import DeleteConfirmationModal from '../../components/group_management/deleteConfirmationModal';
import JoinGroupButton from '../../components/group_management/joinGroupButton';
import JoinGroupModal from '../../components/group_management/joinGroupModal';
import { Group } from '../../components/group_management/types';
import { groupsService } from '../../services/groupsService';
import { userService } from '../../services/userService';
import { avatarUploadService } from '../../services/avatarUploadService';

const CreateGroupsScreen = () => {
  // ALL HOOKS MUST BE AT THE TOP AND CALLED UNCONDITIONALLY
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showShareKey, setShowShareKey] = useState(false);
  const [newGroupShareKey, setNewGroupShareKey] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedGroupForDeletion, setSelectedGroupForDeletion] = useState<Group | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "",
      headerStyle: {
        backgroundColor: "#fff",
      },
      headerShadowVisible: false,
      headerLeft: () => null,
      headerRight: () => groups.length > 0 ? (
        <TouchableOpacity
          style={styles.headerGearButton}
          onPress={() => setShowSettingsModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerGearIcon}>⚙️</Text>
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, groups.length]);

  // useEffect MUST be called unconditionally
  useEffect(() => {
    initializeUserAndLoadGroups();
  }, []);
  
  // Initialize user session and load groups
  const initializeUserAndLoadGroups = async () => {
    try {
      setIsLoading(true);
      
      // Get or create user ID
      const currentUserId = await userService.getOrCreateUserId();
      setUserId(currentUserId);
      
      // Sync user profile to all existing groups (this will update user names)
      await groupsService.syncUserProfileToAllGroups(currentUserId);
      
      // Load user's groups
      await loadUserGroups(currentUserId);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize user session');
    } finally {
      setIsLoading(false);
    }
  };

  // Load groups from Appwrite
  const loadUserGroups = async (currentUserId: string) => {
    try {
      const userGroups = await groupsService.getUserGroups(currentUserId);
      setGroups(userGroups);
    } catch (error) {
      Alert.alert('Error', 'Failed to load groups');
    }
  };

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
  const handleCreateGroup = async (groupName: string) => {
    if (!userId) {
      Alert.alert('Error', 'User session not initialized');
      return;
    }

    try {
      setIsLoading(true);
      const shareKey = generateShareKey();
      
      // Create group in Appwrite (this now automatically creates membership)
      const newGroup = await groupsService.createGroup({
        name: groupName,
        shareKey: shareKey,
        createdBy: userId,
      });

      // Add to local state
      setGroups(prevGroups => [...prevGroups, newGroup]);
      setNewGroupShareKey(shareKey);
      setShowCreateForm(false);
      setShowShareKey(true);
      
    } catch (error) {
      console.error('Error handling create group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining a group
  const handleJoinGroup = async (shareKey: string) => {
    if (!userId) {
      Alert.alert('Error', 'User session not initialized');
      return;
    }

    try {
      setIsLoading(true);
      
      // Join group and create membership record (now with proper user name)
      const joinedGroup = await groupsService.joinGroup(shareKey, userId);
      
      // Check if user is already in this group locally
      const isAlreadyMember = groups.some(group => group.id === joinedGroup.id);
      
      if (isAlreadyMember) {
        Alert.alert('Already a Member', `You're already a member of "${joinedGroup.name}".`);
        setShowJoinGroupModal(false);
        return;
      }

      // Add group to user's list
      setGroups(prevGroups => [...prevGroups, joinedGroup]);
      setShowJoinGroupModal(false);
      
      Alert.alert('Success', `You've joined "${joinedGroup.name}"!`);
      
    } catch (error) {
      console.error('Error handling join group:', error);
      
      if (error.message.includes('Already a member')) {
        Alert.alert('Already a Member', 'You are already a member of this group.');
      } else if (error.message.includes('Group not found')) {
        Alert.alert('Invalid Share Key', 'No group found with this share key. Please check and try again.');
      } else {
        Alert.alert('Error', 'Failed to join group. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyShareKey = () => {
    Clipboard.setString(newGroupShareKey);
    Alert.alert('Copied!', 'Share key copied to clipboard');
  };

  // Handle navigating to group calendar
  const handleNavigateToCalendar = (group: Group) => {
    router.push({
      pathname: '/group_calendar',
      params: { 
        groupId: group.id, 
        groupName: group.name 
      }
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
  const handleConfirmDelete = async () => {
    if (!selectedGroupForDeletion) return;

    try {
      setIsLoading(true);
      await groupsService.deleteGroup(selectedGroupForDeletion.id);
      setGroups(prevGroups => prevGroups.filter(group => group.id !== selectedGroupForDeletion.id));
      setShowDeleteConfirmation(false);
      setSelectedGroupForDeletion(null);
      Alert.alert('Deleted', `"${selectedGroupForDeletion.name}" has been deleted.`);
    } catch (error) {
      console.error('Error deleting group:', error);
      Alert.alert('Error', 'Failed to delete group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setSelectedGroupForDeletion(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GroupList 
        groups={groups} 
        onGroupPress={handleNavigateToCalendar} 
      />

      <JoinGroupButton 
        onPress={() => setShowJoinGroupModal(true)}
        disabled={isLoading}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowCreateForm(true)}
      >
        <Text style={styles.addButtonText}>
          + Create New Group
        </Text>
      </TouchableOpacity>

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

      <JoinGroupModal
        visible={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        onJoinGroup={handleJoinGroup}
        isLoading={isLoading}
      />
      
      {showSettingsModal && groups.length > 0 && (
        <SettingsModal
          visible={showSettingsModal}
          groups={groups}
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
  headerGearButton: {
    padding: 8,
    marginRight: 10,
  },
  headerGearIcon: {
    fontSize: 24,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

export default CreateGroupsScreen;