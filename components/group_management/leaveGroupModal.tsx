import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';

interface LeaveGroupModalProps {
  visible: boolean;
  groupName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const LeaveGroupModal: React.FC<LeaveGroupModalProps> = ({ 
  visible, 
  groupName, 
  onConfirm, 
  onCancel 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Leave Group</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to leave "{groupName}"?
          </Text>
          <Text style={styles.modalInfo}>
            • You will be removed from the group calendar
          </Text>
          <Text style={styles.modalInfo}>
            • Your chat history will remain visible to other members
          </Text>
          <Text style={styles.modalInfo}>
            • You can rejoin later with the share key
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.leaveButton]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.leaveButtonText}>Leave Group</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#f57c00',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    fontWeight: '500',
  },
  modalInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 10,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 15,
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
  leaveButton: {
    backgroundColor: '#ffc107',
  },
  leaveButtonText: {
    color: '#212529',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LeaveGroupModal;