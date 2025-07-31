import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({
  visible,
  onClose,
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
          {/* Welcome Header */}
          <View style={styles.headerSection}>
            <Text style={styles.welcomeTitle}>Welcome to Thirteen!</Text>
          </View>
          
          {/* Main Content */}
          <View style={styles.contentSection}>
            <Text style={styles.descriptionText}>
              An app where followers of Jesus can create/join daily bible reading groups.
            </Text>
            
            <Text style={styles.goalText}>
              The goal is through community, we all encourage each other to build up a daily habit of sitting with God's word.
            </Text>
            
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionTitle}>Remember to:</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>✅</Text>
                <Text style={styles.instructionText}>
                  Make sure to keep the streak and mark the day green,
                  when you have done the reading.
                </Text>
              </View>
            </View>
          </View>
          
          {/* Bible Verse */}
          <View style={styles.verseSection}>
            <Text style={styles.verseText}>
              "So then faith comes by hearing, and hearing by the word of God."
            </Text>
            <Text style={styles.verseReference}>— Romans 10:17</Text>
          </View>
          
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4287f5',
    textAlign: 'center',
  },
  contentSection: {
    marginBottom: 20,
    width: '100%',
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  goalText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  instructionContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  instructionText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  verseSection: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#4287f5',
    width: '100%',
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
  closeButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 150,
    shadowColor: '#4287f5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeModal;