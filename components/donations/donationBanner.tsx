// components/donations/donationBanner.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface DonationBannerProps {
  onPress: () => void;
}

const DonationBanner: React.FC<DonationBannerProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.bannerContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.bannerContent}>
        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>Support Thirteen</Text>
          <Text style={styles.bannerSubtitle}>
            Help keep this Bible reading community alive
          </Text>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#1e7e34',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#d4edda',
    lineHeight: 18,
  },
});

export default DonationBanner;