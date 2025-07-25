import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { CreateGroupFormProps } from './types';

const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ 
  visible, 
  onClose, 
  onCreateGroup 
}) => {
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (!visible) {
      setGroupName('');
    }
  }, [visible]);

  const handleCreate = () => {
    if (groupName.trim() === '') {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    onCreateGroup(groupName.trim());
    setGroupName('');
  };

  const handleClose = () => {
    setGroupName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
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
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={handleCreate}
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
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
    padding: 25,
    paddingBottom: 30,
    borderRadius: 12,
    width: '90%',
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
});

export default CreateGroupForm;