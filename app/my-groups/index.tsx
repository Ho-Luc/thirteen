import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Modal,
  Clipboard,
  ScrollView 
} from "react-native";
import { useRouter } from "expo-router";

interface Group {
  id: string;
  name: string;
  shareKey: string;
  createdAt: Date;
}

const CreateGroupsScreen = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
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
  const handleCreateGroup = () => {
    if (groupName.trim() === '') {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const shareKey = generateShareKey();
    const newGroup: Group = {
      id: Date.now().toString(), // Simple ID generation
      name: groupName.trim(),
      shareKey: shareKey,
      createdAt: new Date(),
    };

    setGroups(prevGroups => [...prevGroups, newGroup]);
    setNewGroupShareKey(shareKey);
    setGroupName('');
    setShowCreateForm(false);
    setShowShareKey(true);
  };

  // Handle copying share key to clipboard
  const copyShareKey = () => {
    Clipboard.setString(newGroupShareKey);
    Alert.alert('Copied!', 'Share key copied to clipboard');
  };

  // Handle deleting a group
  const handleDeleteGroup = (groupToDelete: Group) => {
    setSelectedGroupForDeletion(groupToDelete);
    
    // Close settings modal first, then show delete confirmation
    setShowSettingsModal(false);
    
    // Use setTimeout to ensure settings modal closes before showing delete modal
    setTimeout(() => {
      setShowDeleteConfirmation(true);
    }, 300);
  };

  // Confirm and delete the group
  const confirmDeleteGroup = () => {
    if (selectedGroupForDeletion) {
      setGroups(prevGroups => prevGroups.filter(group => group.id !== selectedGroupForDeletion.id));
      setShowDeleteConfirmation(false);
      setSelectedGroupForDeletion(null);
      setShowSettingsModal(false);
    }
  };

  // Cancel deletion
  const cancelDeleteGroup = () => {
    setShowDeleteConfirmation(false);
    setSelectedGroupForDeletion(null);
  };

  // Handle navigating to group calendar
  const navigateToCalendar = (group: Group) => {
    // You can pass the group data as params if needed
    router.push({
      pathname: '/group_calendar',
      params: { groupId: group.id, groupName: group.name }
    });
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
      <View style={styles.groupsList}>
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>
            No groups yet. Create your first group!
          </Text>
        ) : (
          groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupItem}
              onPress={() => navigateToCalendar(group)}
            >
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.shareKeyText}>Share Key: {group.shareKey}</Text>
              </View>
              <Text style={styles.arrowText}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Create Group Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowCreateForm(true)}
      >
        <Text style={styles.addButtonText}>
          + Create New Group
        </Text>
      </TouchableOpacity>

      {/* Create Group Form Modal */}
      <Modal
        visible={showCreateForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Group</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter group name"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus={true}
              maxLength={50}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateForm(false);
                  setGroupName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Key Display Modal */}
      <Modal
        visible={showShareKey}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareKey(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Group Created!</Text>
            <Text style={styles.shareKeyLabel}>Your share key is:</Text>
            
            <View style={styles.shareKeyContainer}>
              <Text style={styles.shareKeyDisplay}>{newGroupShareKey}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyShareKey}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.shareKeyNote}>
              Share this key with others so they can join your group!
            </Text>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={() => setShowShareKey(false)}
            >
              <Text style={styles.createButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <Text style={styles.modalTitle}>Manage Groups</Text>
            
            <ScrollView style={styles.groupsSettingsList} showsVerticalScrollIndicator={false}>
              {groups.map((group) => (
                <View key={group.id} style={styles.settingsGroupItem}>
                  <View style={styles.settingsGroupInfo}>
                    <Text style={styles.settingsGroupName}>{group.name}</Text>
                    <Text style={styles.settingsShareKey}>Key: {group.shareKey}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      handleDeleteGroup(group);
                    }}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 20 }]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && !showSettingsModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelDeleteGroup}
          statusBarTranslucent={true}
          presentationStyle="overFullScreen"
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
            <View style={[styles.deleteModalContent, { borderWidth: 2, borderColor: '#dc3545' }]}>
              <Text style={styles.deleteModalTitle}>⚠️ Delete Group</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete "{selectedGroupForDeletion?.name}"?
              </Text>
              <Text style={styles.deleteModalWarning}>
                This action cannot be undone.
              </Text>
              
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    cancelDeleteGroup();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteConfirmButton]}
                  onPress={() => {
                    confirmDeleteGroup();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  groupsList: {
    flex: 1,
    marginBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    paddingBottom: 30,
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    minHeight: 200,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#4287f5',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareKeyLabel: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  shareKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 10,
  },
  shareKeyDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4287f5',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  shareKeyNote: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 25,
    lineHeight: 20,
  },
  settingsModalContent: {
    backgroundColor: 'white',
    padding: 25,
    paddingBottom: 30,
    borderRadius: 12,
    width: '90%',
    maxWidth: 450,
    maxHeight: '70%',
  },
  groupsSettingsList: {
    maxHeight: 300,
  },
  settingsGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  settingsGroupInfo: {
    flex: 1,
  },
  settingsGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingsShareKey: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dc3545',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    padding: 25,
    paddingBottom: 30,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#dc3545',
  },
  deleteModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  deleteModalWarning: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    fontStyle: 'italic',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateGroupsScreen;