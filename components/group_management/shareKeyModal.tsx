import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { ShareKeyModalProps } from './types';

const ShareKeyModal: React.FC<ShareKeyModalProps> = ({ 
  visible, 
  shareKey, 
  onClose, 
  onCopyKey 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Group Created!</Text>
          <Text style={styles.shareKeyLabel}>Your share key is:</Text>
          
          <View style={styles.shareKeyContainer}>
            <Text style={styles.shareKeyDisplay}>{shareKey}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={onCopyKey}
            >
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.shareKeyNote}>
            Share this key with others so they can join your group!
          </Text>
          
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onClose}
          >
            <Text style={styles.doneButtonText}>Done</Text>
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
  doneButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShareKeyModal;