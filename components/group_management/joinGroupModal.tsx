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

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoinGroup: (shareKey: string) => void;
  isLoading?: boolean;
}

const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ 
  visible, 
  onClose, 
  onJoinGroup,
  isLoading = false
}) => {
  const [shareKey, setShareKey] = useState('');

  useEffect(() => {
    if (!visible) {
      setShareKey('');
    }
  }, [visible]);

  const handleJoin = () => {
    if (shareKey.trim() === '') {
      Alert.alert('Error', 'Please enter a share key');
      return;
    }

    if (shareKey.trim().length !== 6) {
      Alert.alert('Error', 'Share key must be exactly 6 characters');
      return;
    }

    onJoinGroup(shareKey.trim().toUpperCase());
  };

  const handleClose = () => {
    setShareKey('');
    onClose();
  };

  const handleTextChange = (text: string) => {
    // Convert to uppercase and limit to 6 characters
    const formattedText = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setShareKey(formattedText);
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
          <Text style={styles.modalTitle}>Join a Group</Text>
          <Text style={styles.modalSubtitle}>
            Enter the 6-character share key to join an existing group
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="ABC123"
              value={shareKey}
              onChangeText={handleTextChange}
              autoFocus={true}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
            />
            <Text style={styles.inputHelperText}>
              {shareKey.length}/6 characters
            </Text>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton, 
                styles.joinButton,
                (isLoading || shareKey.length !== 6) && styles.disabledButton
              ]}
              onPress={handleJoin}
              disabled={isLoading || shareKey.length !== 6}
            >
              <Text style={[
                styles.joinButtonText,
                (isLoading || shareKey.length !== 6) && styles.disabledButtonText
              ]}>
                {isLoading ? 'Joining...' : 'Join Group'}
              </Text>
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
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#4287f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#333',
  },
  inputHelperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
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
  joinButton: {
    backgroundColor: '#28a745',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
  },
  disabledButtonText: {
    color: '#6c757d',
  },
});

export default JoinGroupModal;