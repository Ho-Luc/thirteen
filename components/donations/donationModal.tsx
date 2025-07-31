// components/donations/donationModal.tsx - Complete implementation
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({
  visible,
  onClose,
}) => {
  const [showAmountSelection, setShowAmountSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { 
    confirmPayment,
    isApplePaySupported,
    isGooglePaySupported,
  } = useStripe();

  // Create payment intent on your backend
  const createPaymentIntent = async (amount: number) => {
    try {
      // TODO: Replace with Vercel backend endpoint
      const response = await fetch('https://your-backend.com/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
          },
        }),
      });
      
      const { client_secret } = await response.json();
      return client_secret;
    } catch (error) {
      throw new Error('Failed to create payment intent');
    }
  };

  // Handle Express Payment (Apple Pay / Google Pay)
  const handleExpressPayment = async (amount: number) => {
    try {
      setLoading(true);

      // Check if express payment is supported
      const isSupported = Platform.OS === 'ios' 
        ? await isApplePaySupported()
        : await isGooglePaySupported();

      if (!isSupported) {
        Alert.alert(
          'Not Supported',
          `${Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'} is not available on this device.`
        );
        return;
      }

      // Create payment intent
      const clientSecret = await createPaymentIntent(amount);

      // Confirm payment with Apple Pay / Google Pay
      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: Platform.OS === 'ios' ? 'ApplePay' : 'GooglePay',
        paymentMethodData: {
          presentationStyle: 'automatic',
          merchantDisplayName: 'Thirteen Bible App',
          cartItems: [
            {
              label: 'Donation to Support Thirteen',
              amount: amount.toFixed(2),
              paymentType: 'immediate',
            },
          ],
          requiredBillingContactFields: ['emailAddress'],
          requiredShippingContactFields: [],
        },
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
      } else {
        // Success!
        Alert.alert(
          'Thank You! 🙏',
          `Your $${amount} donation was successful. God bless you for your generosity!`,
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
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
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
                    style={[
                      styles.amountButton,
                      loading && styles.disabledButton
                    ]}
                    onPress={() => handleExpressPayment(amount)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.amountText}>${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Express Payment Info */}
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoText}>
                  Payment will be processed with{' '}
                  {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
                </Text>
                <Text style={styles.paymentInfoSubtext}>
                  {Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint'} or Face ID authentication
                </Text>
              </View>

              {loading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Processing payment...</Text>
                </View>
              )}

              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowAmountSelection(false)}
                disabled={loading}
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
    backgroundColor: '#4287f5',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4287f5',
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
  disabledButton: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 20,
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
  loadingContainer: {
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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