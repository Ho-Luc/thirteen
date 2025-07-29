import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { SettingsModalProps } from './types';
import { groupsService } from '../../services/groupsService';

// Enhanced props to include user ID for creator check
interface EnhancedSettingsModalProps extends SettingsModalProps {
  currentUserId: string;
  onLeaveGroup: (group: any) => void; // New callback for leaving groups
}

const SettingsModal: React.FC<EnhancedSettingsModalProps> = ({ 
  visible, 
  groups = [], 
  onClose, 
  onDeleteGroup,
  onLeaveGroup,
  currentUserId
}) => {
  const [groupCreatorStatus, setGroupCreatorStatus] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(true);

  // Check creator status for all groups when modal opens
  useEffect(() => {
    if (visible && groups.length > 0) {
      checkGroupCreatorStatus();
    }
  }, [visible, groups, currentUserId]);

  const checkGroupCreatorStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Checking creator status for groups...');
      
      const statusPromises = groups.map(async (group) => {
        try {
          const isCreator = await groupsService.isGroupCreator(currentUserId, group.id);
          console.log(`Group "${group.name}": Creator = ${isCreator}`);
          return { groupId: group.id, isCreator };
        } catch (error) {
          console.error(`Error checking creator status for group ${group.id}:`, error);
          return { groupId: group.id, isCreator: false };
        }
      });

      const results = await Promise.all(statusPromises);
      
      const statusMap: {[key: string]: boolean} = {};
      results.forEach(result => {
        statusMap[result.groupId] = result.isCreator;
      });
      
      setGroupCreatorStatus(statusMap);
      console.log('✅ Creator status check completed:', statusMap);
      
    } catch (error) {
      console.error('❌ Error checking group creator status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupAction = (group: any) => {
    const isCreator = groupCreatorStatus[group.id];
    
    if (isCreator) {
      // Show delete confirmation for creators
      onDeleteGroup(group);
    } else {
      // Show leave confirmation for non-creators
      onLeaveGroup(group);
    }
  };

  const getActionButtonText = (group: any): string => {
    const isCreator = groupCreatorStatus[group.id];
    return isCreator ? '🗑️ Delete' : '🚪 Leave';
  };

  const getActionButtonStyle = (group: any) => {
    const isCreator = groupCreatorStatus[group.id];
    return isCreator ? styles.deleteButton : styles.leaveButton;
  };

  const getActionDescription = (group: any): string => {
    const isCreator = groupCreatorStatus[group.id];
    return isCreator 
      ? 'Delete permanently (removes all data)' 
      : 'Leave group (keeps chat history)';
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
          <Text style={styles.modalTitle}>Manage Groups</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Checking permissions...</Text>
            </View>
          ) : (
            <ScrollView style={styles.groupsList} showsVerticalScrollIndicator={false}>
              {groups.map((group) => {
                const isCreator = groupCreatorStatus[group.id];
                
                return (
                  <View key={group.id} style={styles.groupItem}>
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.shareKey}>Key: {group.shareKey}</Text>
                      <Text style={styles.creatorStatus}>
                        {isCreator ? '👑 You created this group' : '👥 You joined this group'}
                      </Text>
                      <Text style={styles.actionDescription}>
                        {getActionDescription(group)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, getActionButtonStyle(group)]}
                      onPress={() => handleGroupAction(group)}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionButtonText}>
                        {getActionButtonText(group)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    padding: 25,
    paddingBottom: 30,
    borderRadius: 12,
    width: '90%',
    maxWidth: 450,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  groupsList: {
    maxHeight: 300,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shareKey: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  creatorStatus: {
    fontSize: 12,
    color: '#4287f5',
    fontWeight: '500',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 80,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderColor: '#dc3545',
  },
  leaveButton: {
    backgroundColor: '#fff',
    borderColor: '#ffc107',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 50,
  },
  closeButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsModal;