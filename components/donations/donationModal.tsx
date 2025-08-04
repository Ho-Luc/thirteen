import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({
  visible,
  onClose,
}) => {
  const [showAmountSelection, setShowAmountSelection] = useState(false);

  // Open Venmo with pre-populated amount
  const openVenmo = async (amount: number) => {
    try {
      // Venmo deep link format: venmo://paycharge?txn=pay&recipients=USERNAME&amount=AMOUNT&note=MESSAGE
      const venmoUsername = 'Thirteen-App';
      const note = encodeURIComponent(`Donation to support Thirteen Bible App - Thank you! 🙏`);
      
      // Try Venmo app first
      const venmoAppUrl = `venmo://paycharge?txn=pay&recipients=${venmoUsername}&amount=${amount}&note=${note}`;
      
      // Fallback to web version
      const venmoWebUrl = `https://venmo.com/u/${venmoUsername}?txn=pay&amount=${amount}&note=${note}`;

      // Check if Venmo app is installed
      const canOpenApp = await Linking.canOpenURL(venmoAppUrl);
      
      if (canOpenApp) {
        // Open Venmo app
        await Linking.openURL(venmoAppUrl);
      } else {
        // Open in browser
        await Linking.openURL(venmoWebUrl);
      }

      // Show thank you message
      Alert.alert(
        'Thank You! 🙏',
        `You're being redirected to Venmo to complete your donation. God bless your generosity!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAmountSelection(false);
              onClose();
            },
          },
        ]
      );

    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to open Venmo. Please make sure you have the Venmo app installed or try again later.',
        [
          {
            text: 'Try Web Version',
            onPress: () => {
              Linking.openURL(`https://venmo.com/u/Thirteen-App`);
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleCloseModal = () => {
    setShowAmountSelection(false);
    onClose();
  };

  const handleDonatePress = () => {
    setShowAmountSelection(true);
  };

  const donationAmounts = [2, 5, 10];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {!showAmountSelection ? (
            // First Modal - Personal Message
            <>
              <Text style={styles.modalTitle}>Support Thirteen</Text>
              
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>
                  Hi, my name is Luc, I'm a child of God and recently unemployed engineer. 
                  With my newfound time, I've dedicated my time to recreating the beloved 
                  Twelve App my bible study used, to track bible readings. Any donations 
                  are appreciated and will be used to keep the servers running. Any excess 
                  donations will be made to local churches.
                </Text>
              </View>

              {/* Bible Verse */}
              <View style={styles.verseContainer}>
                <Text style={styles.verseText}>
                  "...whoever sows generously will also reap generously. Each of you should 
                  give what you have decided in your heart to give, not reluctantly or under 
                  compulsion, for God loves a cheerful giver"
                </Text>
                <Text style={styles.verseReference}>— 2 Corinthians 9:6</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.donateButton}
                  onPress={handleDonatePress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.donateButtonText}>Donate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Second Modal - Amount Selection
            <>
              <Text style={styles.modalTitle}>Choose Donation Amount</Text>
              
              <Text style={styles.amountSubtitle}>
                Select an amount to support Thirteen:
              </Text>

              {/* Amount Buttons */}
              <View style={styles.amountGrid}>
                {donationAmounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.amountButton}
                    onPress={() => openVenmo(amount)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.amountText}>${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Venmo Info */}
              <View style={styles.paymentInfo}>
                <View style={styles.venmoLogoContainer}>
                  <Image 
                    source={require('../../assets/images/venmo-icon.png')} 
                  />
                </View>
                </View>
                <Text style={styles.paymentInfoText}>
                  You'll be redirected to Venmo to complete your donation
                </Text>

              {/* Alternative Venmo Link */}
              <TouchableOpacity
                style={styles.alternativeButton}
                onPress={() => Linking.openURL('https://venmo.com/u/Thirteen-App')}
                activeOpacity={0.8}
              >
                <Text style={styles.alternativeButtonText}>
                  Or visit @Thirteen-App on Venmo
                </Text>
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowAmountSelection(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}
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
  donateButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  donateButtonText: {
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
  amountSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  amountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  amountButton: {
    flex: 1,
    backgroundColor: '#3D95CE', // Venmo blue color
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3D95CE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  amountText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  venmoLogoContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  venmoLogo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  paymentInfoSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  alternativeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  alternativeButtonText: {
    fontSize: 14,
    color: '#3D95CE',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4287f5',
    fontWeight: '600',
  },
});

export default DonationModal;