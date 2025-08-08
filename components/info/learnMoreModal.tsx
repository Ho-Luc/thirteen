// components/info/learnMoreModal.tsx
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';

interface LearnMoreModalProps {
  visible: boolean;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({
  visible,
  onClose,
}) => {
  const handleLearnMorePress = async () => {
    const url = 'https://thirteen-landing-page.vercel.app/';
    
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
        onClose();
      } else {
        Alert.alert(
          'Error',
          'Unable to open the website. Please try again later.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to open the website. Please try again later.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>About Thirteen</Text>
          
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              Thirteen is a Bible reading community app designed to help believers 
              build consistent daily habits through group accountability and encouragement.
            </Text>
            
            <Text style={styles.messageText}>
              Learn more about the vision, features, and heart behind this ministry 
              on our website.
            </Text>
          </View>

          {/* Bible Verse */}
          <View style={styles.verseContainer}>
            <Text style={styles.verseText}>
              "So then faith comes by hearing, and hearing by the word of God."
            </Text>
            <Text style={styles.verseReference}>— Romans 10:17</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={handleLearnMorePress}
              activeOpacity={0.8}
            >
              <Text style={styles.learnMoreButtonText}>Visit Website</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Close</Text>
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
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4287f5',
    textAlign: 'center',
    marginBottom: 20,
  },
  messageContainer: {
    marginBottom: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  verseContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#4287f5',
  },
  verseText: {
    fontSize: 15,
    color: '#1976d2',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 14,
    color: '#1565c0',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  learnMoreButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#4287f5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  learnMoreButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  closeButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LearnMoreModal;